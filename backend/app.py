from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os
import json
import re
import uuid
from datetime import datetime, timezone
from dotenv import load_dotenv
import boto3
from botocore.config import Config
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from db_pg import User, SessionLocal, ensure_schema, get_engine, session_scope

load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 16 * 1024 * 1024
CORS(app, resources={r"/*": {"origins": os.getenv("REACT_APP_URL")}})

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
S3_BUCKET = os.getenv("S3_BUCKET")

_s3 = None


def s3_client():
    global _s3
    if _s3 is None:
        _s3 = boto3.client(
            "s3",
            region_name=AWS_REGION,
            aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            config=Config(signature_version="s3v4"),
        )
    return _s3


def safe_key_segment(s, max_len=120):
    if s is None:
        return "unknown"
    t = re.sub(r"[^\w\-.]+", "_", str(s)).strip("_")
    return (t or "unknown")[:max_len]


def _json_mapping(value):
    if value is None:
        return {}
    if isinstance(value, str):
        return json.loads(value)
    return dict(value) if isinstance(value, dict) else {}


def _ensure_app_schema():
    ensure_schema()


_ensure_app_schema()


def load_json(filename):
    with open(filename, "r") as file:
        return json.load(file)


def save_json(data, filename):
    with open(filename, "w") as file:
        json.dump(data, file)


@app.route("/api/users", methods=["POST"])
def get_users():
    data = request.get_json()
    username = data["username"]
    password = data["password"]
    get_engine()
    session = SessionLocal()
    try:
        row = session.scalar(select(User).where(User.username == username))
        if row:
            if row.password == password:
                return jsonify({"success": True, "token": "user-logged-in"})
            return jsonify({"success": False, "message": "Password is incorrect."})
        session.add(
            User(
                username=username,
                password=password,
                asked_questions={},
                chat_history={},
            )
        )
        session.commit()
        return jsonify({"success": True, "token": "user-logged-in"})
    except IntegrityError:
        session.rollback()
        print(f"Error inserting user {username}: duplicate username")
        return jsonify({"success": False, "message": "Please try another username."})
    except Exception as e:
        session.rollback()
        print(f"Error inserting user {username}: {e}")
        return jsonify({"success": False, "message": "Please try another username."})
    finally:
        session.close()


@app.route("/audio/<filename>")
def get_audio(filename):
    print("filename", filename)
    return send_from_directory("/audio_files", filename)


@app.route("/api/s3/presign_audio", methods=["POST"])
def presign_audio():
    """
    Return a presigned PUT URL so the browser uploads audio directly to S3.
    """
    if not S3_BUCKET:
        return jsonify({"success": False, "message": "S3_BUCKET not configured"}), 500
    data = request.get_json(force=True, silent=True) or {}
    user = data.get("user")
    title = data.get("title", "unknown")
    page = data.get("page", "0")
    index = data.get("index", 0)
    if not user:
        return jsonify({"success": False, "message": "user is required"}), 400

    with session_scope() as session:
        row = session.scalar(select(User).where(User.username == user))
        if not row:
            return jsonify({"success": False, "message": "unknown user"}), 404

    key = "audio/{user}/{title}/page_{page}/msg_{index}_{uid}.mp3".format(
        user=safe_key_segment(user),
        title=safe_key_segment(title),
        page=safe_key_segment(page, 40),
        index=int(index),
        uid=uuid.uuid4().hex[:12],
    )
    try:
        url = s3_client().generate_presigned_url(
            "put_object",
            Params={
                "Bucket": S3_BUCKET,
                "Key": key,
            },
            ExpiresIn=3600,
            HttpMethod="PUT",
        )
    except Exception as e:
        print("presign error", e)
        return jsonify({"success": False, "message": str(e)}), 500

    return jsonify({"success": True, "uploadUrl": url, "key": key})


@app.route("/api/get_asked_questions", methods=["POST"])
def get_asked_questions():
    data = request.get_json()
    user = data["user"]
    title = data["title"]
    page = str(data["page"])
    print(f"{user} is reading {title} on page {page}")
    with session_scope() as session:
        row = session.scalar(
            select(User)
            .where(User.username == user)
            .with_for_update()
        )
        if not row:
            return jsonify({}), 404
        aq = _json_mapping(row.asked_questions)
        if title not in aq:
            aq[title] = {}
        if page not in aq[title]:
            aq[title][page] = []
        row.current_book = title
        row.current_page = page
        row.asked_questions = aq
    return jsonify(aq.get(title, {}))


@app.route("/api/save_asked_question", methods=["POST"])
def save_asked_question():
    data = request.get_json()
    user = data["user"]
    title = data["title"]
    page = str(data["page"])
    question = data["question"]
    print(f"{user} is asking {question} on page {page} of {title}")
    with session_scope() as session:
        row = session.scalar(
            select(User)
            .where(User.username == user)
            .with_for_update()
        )
        if not row:
            return jsonify({"success": False, "message": "user not found"}), 404
        current_asked_questions = _json_mapping(row.asked_questions)
        if title not in current_asked_questions:
            current_asked_questions[title] = {}
        if page not in current_asked_questions[title]:
            current_asked_questions[title][page] = []
        if question not in current_asked_questions[title][page]:
            current_asked_questions[title][page].append(question)
        row.asked_questions = current_asked_questions
    return jsonify({"success": True})


@app.route("/api/chat_history", methods=["POST"])
def chat_history():
    """
    Expect JSON body:
    { "user", "title", "page", "items": [ { "id", "role", "content", "audio": s3_key|null } ] }
    All chat sessions are stored in Postgres (chat_history JSONB). Audio is referenced by S3 object key.
    """
    data = request.get_json(force=True, silent=True)
    if not data:
        return jsonify(
            {
                "success": False,
                "message": "Send JSON: { user, title, page, items: [...] }",
            }
        ), 400

    user = data.get("user")
    title = data.get("title")
    page = str(data.get("page", "0"))
    items = data.get("items")
    if not user or title is None or not isinstance(items, list):
        return jsonify({"success": False, "message": "user, title, items[] required"}), 400

    new_messages = []
    for it in items:
        new_messages.append(
            {
                "id": it.get("id"),
                "role": it.get("role"),
                "content": it.get("content"),
                "audio": it.get("audio"),
            }
        )

    session_doc = {
        "saved_at": datetime.now(timezone.utc).isoformat(),
        "messages": new_messages,
    }

    with session_scope() as session:
        row = session.scalar(
            select(User)
            .where(User.username == user)
            .with_for_update()
        )
        if not row:
            return jsonify({"success": False, "message": "user not found"}), 404
        current_chat_history = _json_mapping(row.chat_history)
        if title not in current_chat_history:
            current_chat_history[title] = {}
        if page not in current_chat_history[title]:
            current_chat_history[title][page] = []
        current_chat_history[title][page].append(session_doc)
        row.chat_history = current_chat_history

    print("saved chat session", user, title, page, len(new_messages))
    return jsonify({"success": True})


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0")

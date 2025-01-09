from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from openai import OpenAI
import os
import io
import json
from dotenv import load_dotenv
from pydub import AudioSegment
import pymongo
from gridfs import GridFS
import sys
from pydub import AudioSegment
from bson.binary import Binary
import numpy as np

load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 
CORS(app, resources={r"/*": {"origins": os.getenv("REACT_APP_URL")}})

OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


VOICE = 'alloy'

try:
  client = pymongo.MongoClient(os.getenv("MONGO_URI"))
  
# return a friendly error if a URI error is thrown 
except pymongo.errors.ConfigurationError:
  print("An Invalid URI host error was received. Is your Atlas host name correct in your connection string?")
  sys.exit(1)

# use a database named "myDatabase"
db = client.StoryBook
users = db.User
# fs = GridFS(db)

def load_json(filename):
    with open(filename, 'r') as file:
        return json.load(file)
    
def save_json(data, filename):
    with open(filename, 'w') as file:
        json.dump(data, file)

@app.route('/api/users', methods=['POST'])
def get_users():
    data = request.get_json()
    username = data['username']
    password = data['password']
    print('username is logged in', username)
    isValid = users.find_one({'username': username, 'password': password})
    if isValid:
        token = "user-logged-in"
        return jsonify({"success": True, "token": token})
    else:
        return jsonify({"success": False, "message": "Invalid credentials"})

@app.route('/audio/<filename>')
def get_audio(filename):
    print('filename', filename)
    return send_from_directory('/audio_files', filename)

@app.route('/api/get_asked_questions', methods=['POST'])
def get_asked_questions():
    data = request.get_json()
    user = data['user']
    title = data['title']
    page = str(data['page'])
    # set the current book to the title, and current page to the page
    # print(f'{user} is reading {title} on page {page}')
    users.update_one({'username': user}, {'$set': {'current_book': title, 'current_page': page}})
    # if the title is not in the asked_questions, add it
    current_asked_questions = users.find_one({'username': user})['asked_questions']
    if title not in current_asked_questions:
        current_asked_questions[title] = {}
    if page not in current_asked_questions[title]:
        current_asked_questions[title][page] = []
    users.update_one({'username': user}, {'$set': {'asked_questions': current_asked_questions}})
    # get the asked questions for the title and page
    asked_questions = users.find_one({'username': user, 'current_book': title})['asked_questions'][title]
    return jsonify(asked_questions)

@app.route('/api/save_asked_question', methods=['POST'])
def save_asked_question():
    data = request.get_json()
    user = data['user']
    title = data['title']
    page = str(data['page'])
    question = data['question']
    # append the question to the asked_questions
    print(f'{user} is asking {question} on page {page} of {title}')
    current_asked_questions = users.find_one({'username': user, 'current_book': title})['asked_questions']
    if title not in current_asked_questions:
        current_asked_questions[title] = {}
    if page not in current_asked_questions[title]:
        current_asked_questions[title][page] = []
    if question not in current_asked_questions[title][page]:
        current_asked_questions[title][page].append(question)
    users.update_one({'username': user}, {'$set': {'asked_questions': current_asked_questions}})
    return jsonify({"success": True})

@app.route('/api/chat_history', methods=['POST'])
def chat_history():
    data = request.form.get('data')
    data = json.loads(data)
    user = data.get('user')
    title = data.get('title')
    page = str(data.get('page'))
    chat_history = data.get('chatHistory')
    new_chat_history = []
    for item in chat_history:
        if item.get('audio'):
            audio_data = np.array(list(item.get('audio').values()), dtype=np.int16)
            audio = AudioSegment.from_raw(io.BytesIO(audio_data.tobytes()), format="raw", sample_width=2, channels=1, frame_rate=24000)
            mp3_io = io.BytesIO()
            audio.export(mp3_io, format="mp3")
            mp3_io.seek(0)
        new_item = {
            'id': item.get('id'),
            'role': item.get('role'),
            'content': item.get('content'),
            'audio': Binary(mp3_io.read())
        }
        new_chat_history.append(new_item)
    # chat_history_json = json.dumps(new_chat_history)

    # timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    # file_id = fs.put(chat_history_json.encode('utf-8'), filename=f"{user}_{title}_{page}_{timestamp}_chat_history.json")
    current_chat_history = users.find_one({'username': user})['chat_history']
    if title not in current_chat_history:
        current_chat_history[title] = {}
    if page not in current_chat_history[title]:
        current_chat_history[title][page] = []
    # current_chat_history[title][page].append(file_id)
    current_chat_history[title][page].append(new_chat_history)
    users.update_one({'username': user}, {'$set': {'chat_history': current_chat_history}})
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
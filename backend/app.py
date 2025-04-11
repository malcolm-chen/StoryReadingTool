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
from datetime import datetime
load_dotenv()

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024 
CORS(app, resources={r"/*": {"origins": os.getenv("REACT_APP_URL")}})
# CORS(app)

OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17"
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
fs = GridFS(db)

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
    # check if the user exists
    isUser = users.find_one({'username': username})
    if isUser:
        isValid = users.find_one({'username': username, 'password': password})
        if isValid:
            token = "user-logged-in"
            return jsonify({"success": True, "token": token})
        else:
            return jsonify({"success": False, "message": "Password is incorrect."})
    else:
        try:
            users.insert_one({
                "username": username, 
                "password": password,
                "current_book": None,
                "current_page": None,
                "chat_history": {},
                "asked_questions": {}
            })
            token = "user-logged-in"
            return jsonify({"success": True, "token": token})
        except Exception as e:
            print(f"Error inserting user {username}: {e}")
            return jsonify({"success": False, "message": "Please try another username."})

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
    print(f'{user} is reading {title} on page {page}')
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
    formData = request.form
    files = request.files
    # print('formData', formData)
    # print('files', files)
    # get the user, title, page from the formData
    user = formData.get('user')
    title = formData.get('title')
    page = str(formData.get('page'))
    new_chat_history = []
    for item in formData:
        if item.startswith('item_'):
            new_item = json.loads(formData[item])
            new_item['audio'] = None
            new_chat_history.append(new_item)
    for file_key in files:
        file = files[file_key]
        if file.filename.endswith('.mp3'):
            file_id = fs.put(file.read(), filename=file.filename)
            item_index = file_key.split('_')[1]
            new_chat_history[int(item_index)]['audio'] = str(file_id)
    
    print('new_chat_history', new_chat_history)
    chat_history_json = json.dumps(new_chat_history, default=str)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_id = fs.put(chat_history_json.encode('utf-8'), filename=f"{user}-{title}-Page_{page}-{timestamp}_chat_history.json")
    current_chat_history = users.find_one({'username': user})['chat_history']
    if title not in current_chat_history:
        current_chat_history[title] = {}
    if page not in current_chat_history[title]:
        current_chat_history[title][page] = []
    current_chat_history[title][page].append(file_id)
    
    users.update_one({'username': user}, {'$set': {'chat_history': current_chat_history}})
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
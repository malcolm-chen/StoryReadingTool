from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
from openai import OpenAI
import os
import json
from dotenv import load_dotenv
from pydub import AudioSegment
from websocket import create_connection
import pymongo
import sys


app = Flask(__name__)
CORS(app)

load_dotenv()

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
    data = request.get_json()
    user = data['user']
    title = data['title']
    page = str(data['page'])
    chat_history = data['chatHistory']
    print('chat history: ', data)
    # save the chat history to the database
    # append the chat history to the current chat history
    # chat_history: {
    #     title: {
    #         page: chat_history
    #     }
    # }
    current_chat_history = users.find_one({'username': user})['chat_history']
    if title not in current_chat_history:
        current_chat_history[title] = {}
    if page not in current_chat_history[title]:
        current_chat_history[title][page] = []
    current_chat_history[title][page].append(chat_history)
    users.update_one({'username': user}, {'$set': {'chat_history': current_chat_history}})
    return jsonify({"success": True})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

from flask import Flask, request, jsonify, send_from_directory, url_for
from flask_cors import CORS
import requests
import openai
from openai import OpenAI
import os
import io
import base64
import json
import asyncio
from dotenv import load_dotenv
from pydub import AudioSegment
import websockets
import time
from websocket import create_connection


app = Flask(__name__)
CORS(app)

load_dotenv()

OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")


VOICE = 'alloy'

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
    users = load_json('users.json')
    isValid = username in users and users[username] == password
    return jsonify(isValid)

@app.route('/audio/<filename>')
def get_audio(filename):
    print('filename', filename)
    return send_from_directory('/audio_files', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

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

openai.api_key = os.getenv("OPENAI_API_KEY")

def greet_message(username):
    return f"""You are a friendly chatbot interacting with a 6-8-year-old child. You will have two rounds of conversation with the child, each round asking one question. Please follow the three questions I provide for questioning:
    
    Question 1: Hello {username}, very happy to meet you! How old are you this year?
    Question 2: [Make a positive, affirmative response to the child's answer] Do you have any favorite topics? Like space, princesses, dinosaurs, or cars? You can talk about anything you like!
    
    Acknowledge the child's stated interests. End the conversation and introduce the upcoming interactive story reading activity to the child: We will now enter the read and chat mode. In this mode, we will explore knowledge together, and you can answer questions by clicking buttons on the screen. Are you ready? Let's start reading!"""


@app.route('/api/users', methods=['POST'])
def get_users():
    data = request.get_json()
    username = data['username']
    users = load_json('users.json')
    isValid = username in users
    if username not in users:
        users.append(username)
    save_json(users, 'users.json')
    return jsonify(isValid)

def save_audio(base64_audio, folder_path, filename):
    print('hello')
    # if not os.path.exists(folder_path):
    #     os.makedirs(folder_path)

    audio_data = base64.b64decode(base64_audio)

    audio_segment = AudioSegment.from_file(
        io.BytesIO(audio_data),
        format="raw",
        frame_rate=24000,  # Check this frame rate based on the actual data
        channels=1,
        sample_width=2
    )    # Create a temporary MP3 file
    full_path = os.path.join(folder_path, filename)
    print('full path', full_path)
    audio_segment.export(full_path, format="mp3") # Write the decoded data directly

def transcribe_audio(base64_audio):  
    """Transcribes base64 encoded audio using Whisper."""
    
    # Decode base64 string and write to the temp file
    audio_data = base64.b64decode(base64_audio)

    audio_segment = AudioSegment.from_file(
        io.BytesIO(audio_data),
        format="raw",
        frame_rate=24000,  # Check this frame rate based on the actual data
        channels=1,
        sample_width=2
    )    # Create a temporary MP3 file
    audio_segment.export("temp.mp3", format="mp3") # Write the decoded data directly

    # # Load the Whisper model and transcribe
    # model = whisper.load_model("turbo")
    # transcription_result = model.transcribe("temp.mp3")

    # transcription = transcription_result["text"]

    # Use whisper API
    audio_file = open("temp.mp3", "rb")
    transcript = openai.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file
    )

    transcription = transcript.text

    return transcription

async def connect_to_websocket():
    try:
        ws = await websockets.connect(
            OPENAI_WS_URL,
            extra_headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            }
        )
        print("Connected to server.")
        return ws
    except Exception as e:
        print(f"Error connecting to WebSocket: {e}")
        return None
    
async def get_audio_response(ws):
    """Collect audio response from the WebSocket and return it as a base64 string."""
    audio_parts = []
    transcript_parts = []
    try:
        async for message in ws:
            event = json.loads(message)

            if event.get('type') == 'response.audio.delta':
                delta = event.get('delta')
                if delta:
                    audio_parts.append(delta)
                print("Receiving audio delta...")

            elif event.get('type') == 'response.audio_transcript.delta':
                delta = event.get('delta')
                if delta:
                    transcript_parts.append(delta)
                print("Receiving transcript delta...")

            elif event.get('type') == 'response.audio.done':
                print("Audio transmission complete.", event)
                return ''.join(audio_parts), ''.join(transcript_parts)
            
            elif event.get('type') == 'response.done':
                print(event)

    except Exception as e:
        print(f"Error during audio reception: {e}")
    
    return None

async def openai_ws_interaction(chatHistory, userMessage, username):
    # ws = await connect_to_websocket()
    async with websockets.connect(
            OPENAI_WS_URL,
            extra_headers={
                "Authorization": f"Bearer {OPENAI_API_KEY}",
                "OpenAI-Beta": "realtime=v1"
            }
        ) as ws:
        print('ws:', ws)
        if not ws:
            return None, None
        try:
            # await send_session_update(ws)
            await ws.send(json.dumps(chatHistory))
            print('chatHistory sent:', chatHistory)

            await ws.send(json.dumps(userMessage))

            response_request = {
                "type": "response.create",
                "response": {
                    "instructions": greet_message(username),
                    "voice": VOICE
                }
            }
            await ws.send(json.dumps(response_request))

            reply, transcription = await get_audio_response(ws)

            if reply is None:
                print("No audio response received.")
                return None, None
            reply_directory = ''
            reply_audio_filename = "reply.mp3"
            save_audio(reply, reply_directory, reply_audio_filename)
            # transcription = transcribe_audio(reply)
            print(f"bot reply: {transcription}")

            return reply_audio_filename, transcription
            # response = await ws.recv()
            # print("Received response:", response)
        except Exception as e:
            print(f"Error in WebSocket interaction: {e}")
            return None, None   

# async def send_session_update(ws):
#     """Send session update to OpenAI WebSocket."""
#     session_update = {
#         "type": "session.update",
#         "session": {
#             "turn_detection": {"type": "server_vad"},
#             "input_audio_format": "g711_ulaw",
#             "output_audio_format": "g711_ulaw",
#             "voice": VOICE,
#             "instructions": SYSTEM_MESSAGE,
#             "modalities": ["text", "audio"],
#             "temperature": 0.8,
#         }
#     }
#     print('Sending session update:', json.dumps(session_update))
#     await ws.send(json.dumps(session_update))

@app.route('/api/greet', methods=['POST'])
async def greet():
    data = request.get_json()
    username = data['username']
    chatHistory = data['chatHistory']
    userMessage = data['userMessage']
    audio_filename, transcription = await openai_ws_interaction(chatHistory, userMessage, username)
    print('!!!', audio_filename)
    audio_url = url_for('get_audio', filename=audio_filename, _external=True)
    response_dict = {
        'audio_url': audio_url,
        'transcription': transcription
    }
    print(response_dict)
    return jsonify(response_dict)

@app.route('/audio/<filename>')
def get_audio(filename):
    print('filename', filename)
    return send_from_directory('/audio_files', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')

from flask import Flask, request, jsonify
from flask_cors import CORS
import openai
from openai import OpenAI
import os
from dotenv import load_dotenv

app = Flask(__name__)
CORS(app)

load_dotenv()

client = OpenAI(
    api_key = os.getenv("OPENAI_API_KEY")
)

users = []

@app.route('/api/users', methods=['POST'])
def get_users():
    data = request.get_json()
    username = data['username']
    isValid = username in users
    if username not in users:
        users.append(username)
    return jsonify(isValid)

def greet_assistant():
    assistant = client.beta.assistants.create(
        name="Math Tutor",
        instructions="You are a personal math tutor. Write and run code to answer math questions.",
        tools=[{"type": "code_interpreter"}],
        model="gpt-4o",
        language="en",)
    


if __name__ == '__main__':
    app.run(debug=True)
import whisper
import openai
import json
import dotenv
import os
dotenv.load_dotenv()

client = openai.OpenAI(
    api_key=os.getenv("OPENAI_API_KEY")
)

model = whisper.load_model("base")

def load_json(json_path):
    # adjust the path to the current directory
    json_path = os.path.join(os.path.dirname(__file__), json_path)
    with open(json_path, 'r') as file:
        data = json.load(file)
    return data

def generate_audio(text, path):
    # adjust the path to the current directory
    path = os.path.join(os.path.dirname(__file__), path)
    response = client.audio.speech.create(
        model="tts-1-hd",
        voice="alloy",
        input = text,
        speed = 0.9
    )
    response.stream_to_file(path)

def get_timestamps(path):
    path = os.path.join(os.path.dirname(__file__), path)
    result = model.transcribe(path, word_timestamps=True)
    words_with_timestamps = []
    for segment in result["segments"]:
        for word in segment["words"]:
            words_with_timestamps.append({"word": word["word"], "time": word["start"]})
    return words_with_timestamps

if __name__ == "__main__":
    data = load_json('multichoice_script.json')
    timestamps = {}
    for page in data:
        question = data[page]['question']
        correct_answer = data[page]['feedback']['correct']
        incorrect_answer = data[page]['feedback']['incorrect']
        audio = generate_audio(question, f"audio/page_{page}_question.mp3")
        words_with_timestamps = get_timestamps(f"audio/page_{page}_question.mp3")
        if page not in timestamps:
            timestamps[page] = {}   
        timestamps[page]['question'] = words_with_timestamps
        audio = generate_audio(correct_answer, f"audio/page_{page}_correct_answer.mp3")
        words_with_timestamps = get_timestamps(f"audio/page_{page}_correct_answer.mp3")
        timestamps[page]['correct_answer'] = words_with_timestamps
        audio = generate_audio(incorrect_answer, f"audio/page_{page}_incorrect_answer.mp3")
        words_with_timestamps = get_timestamps(f"audio/page_{page}_incorrect_answer.mp3")
        timestamps[page]['incorrect_answer'] = words_with_timestamps
    with open('timestamps.json', 'w') as file:
        json.dump(timestamps, file)
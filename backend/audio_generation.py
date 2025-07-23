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

def save_json(data, json_path):
    # adjust the path to the current directory
    json_path = os.path.join(os.path.dirname(__file__), json_path)
    with open(json_path, 'w') as file:
        json.dump(data, file, indent=4)

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

def generate_audio_for_book():
    data = load_json('multichoice_script.json')
    timestamps = load_json('timestamps.json')
    for page in data['pages']:
        question = data['pages'][page]['question']
        correct_answer = data['pages'][page]['feedback']['correct']
        incorrect_answer = data['pages'][page]['feedback']['incorrect']
        uncertainty_answer = data['pages'][page]['feedback']['uncertainty']
        off_topic_answer = data['pages'][page]['feedback']['off-topic']
        page = int(page)
        if not os.path.exists(f"audio/page_{page}_question.mp3"):
            audio = generate_audio(question, f"audio/page_{page-2}_question.mp3")
            words_with_timestamps = get_timestamps(f"audio/page_{page-2}_question.mp3")
            if page not in timestamps:
                timestamps[page - 2] = {}
            timestamps[page - 2]['question'] = words_with_timestamps
        if not os.path.exists(f"audio/page_{page}_correct_answer.mp3"):
            audio = generate_audio(correct_answer, f"audio/page_{page-2}_correct_answer.mp3")
            words_with_timestamps = get_timestamps(f"audio/page_{page-2}_correct_answer.mp3")
            timestamps[page - 2]['correct_answer'] = words_with_timestamps
        if not os.path.exists(f"audio/page_{page}_incorrect_answer.mp3"):
            audio = generate_audio(incorrect_answer, f"audio/page_{page-2}_incorrect_answer.mp3")
            words_with_timestamps = get_timestamps(f"audio/page_{page-2}_incorrect_answer.mp3")
            timestamps[page - 2]['incorrect_answer'] = words_with_timestamps
        if not os.path.exists(f"audio/page_{page}_uncertainty_answer.mp3"):
            audio = generate_audio(uncertainty_answer, f"audio/page_{page-2}_uncertainty_answer.mp3")
            words_with_timestamps = get_timestamps(f"audio/page_{page-2}_uncertainty_answer.mp3")
            timestamps[page - 2]['uncertainty_answer'] = words_with_timestamps
        if not os.path.exists(f"audio/page_{page}_off_topic_answer.mp3"):
            audio = generate_audio(off_topic_answer, f"audio/page_{page-2}_off_topic_answer.mp3")
            words_with_timestamps = get_timestamps(f"audio/page_{page-2}_off_topic_answer.mp3")
            timestamps[page - 2]['off_topic_answer'] = words_with_timestamps
    for i, opening in enumerate(data['opening']):
        audio = generate_audio(opening, f"audio/opening_{i}.mp3")
        words_with_timestamps = get_timestamps(f"audio/opening_{i}.mp3")
        timestamps['opening'] = words_with_timestamps
    for i, closing in enumerate(data['closing']):
        audio = generate_audio(closing, f"audio/closing_{i}.mp3")
        words_with_timestamps = get_timestamps(f"audio/closing_{i}.mp3")
        timestamps['closing'] = words_with_timestamps
    for i, no_answer in enumerate(data['no-answer']):
        audio = generate_audio(no_answer, f"audio/no_answer_{i}.mp3")
        words_with_timestamps = get_timestamps(f"audio/no_answer_{i}.mp3")
        timestamps['no-answer'] = words_with_timestamps
    save_json(timestamps, 'timestamps.json')


def revise_timestamps():
    timestamps = load_json('timestamps.json')
    # for i in range(0, 6):
    #     words_with_timestamps = get_timestamps(f"audio/opening_{i}.mp3")
    #     if 'opening' not in timestamps:
    #         timestamps['opening'] = {}
    #     if i not in timestamps['opening']:
    #         timestamps['opening'][i] = {}
    #     timestamps['opening'][i] = words_with_timestamps
    # for i in range(0, 6):
    #     words_with_timestamps = get_timestamps(f"audio/closing_{i}.mp3")
    #     if 'closing' not in timestamps:
    #         timestamps['closing'] = {}
    #     if i not in timestamps['closing']:
    #         timestamps['closing'][i] = {}
    #     timestamps['closing'][i] = words_with_timestamps
    words_with_timestamps = get_timestamps(f"audio/no_answer_0.mp3")
    if 'no-answer' not in timestamps:
        timestamps['no-answer'] = {}
    timestamps['no-answer'] = words_with_timestamps
    save_json(timestamps, 'timestamps.json')

if __name__ == "__main__":
    # revise_timestamps()
    generate_audio_for_book()
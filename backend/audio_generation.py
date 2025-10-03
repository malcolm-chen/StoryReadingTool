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
    data = load_json('./files/multichoice_script_2turn.json')
    timestamps = load_json('./files/timestamps.json')

    def ensure_nested(dct, keys):
        cur = dct
        for key in keys:
            if key not in cur or not isinstance(cur[key], dict):
                cur[key] = {}
            cur = cur[key]
        return cur

    def generate_and_stamp(text, rel_path, ts_root, ts_key_path):
        if not os.path.exists(os.path.join(os.path.dirname(__file__), rel_path)):
            generate_audio(text, rel_path)
        words_with_timestamps = get_timestamps(rel_path)
        target = ensure_nested(ts_root, ts_key_path[:-1]) if len(ts_key_path) > 1 else ts_root
        target[ts_key_path[-1]] = words_with_timestamps

    for page_str, page_obj in data['pages'].items():
        page_num = int(page_str)
        page_index = page_num - 2

        question = page_obj['question']
        init_fb = page_obj['init_feedback']
        followup_fb = page_obj.get('followup_feedback', {})

        # Ensure base page dict exists in timestamps
        if page_index not in timestamps:
            timestamps[page_index] = {}

        # Question
        generate_and_stamp(
            question,
            f"audio/page_{page_index}_question.mp3",
            timestamps[page_index],
            ['question']
        )

        # Initial feedback audios
        init_map = {
            'correct': 'correct_answer',
            'incorrect': 'incorrect_answer',
            'uncertainty': 'uncertainty_answer',
            'off-topic': 'off_topic_answer',
            'no-response': 'no_response'
        }
        for src_key, dst_key in init_map.items():
            if src_key in init_fb:
                generate_and_stamp(
                    init_fb[src_key],
                    f"audio/page_{page_index}_{dst_key}.mp3",
                    timestamps[page_index],
                    [dst_key]
                )

        # Follow-up feedback audios (second turn)
        # For each first-turn category that leads to a follow-up (incorrect, uncertainty, off-topic)
        if followup_fb:
            ensure_nested(timestamps[page_index], ['followup'])
            for first_turn_category in ['incorrect', 'uncertainty', 'off-topic']:
                if first_turn_category not in followup_fb:
                    continue
                first_turn_map = followup_fb[first_turn_category]
                # second turn categories (correct, incorrect, uncertainty, off-topic, no-response)
                for second_turn_category, text in first_turn_map.items():
                    # Filename pattern: page_{idx}_followup_{first}_{second}.mp3
                    safe_first = first_turn_category.replace('-', '_')
                    safe_second = second_turn_category.replace('-', '_')
                    rel = f"audio/page_{page_index}_followup_{safe_first}_{safe_second}.mp3"
                    generate_and_stamp(
                        text,
                        rel,
                        timestamps[page_index],
                        ['followup', safe_first, safe_second]
                    )

    save_json(timestamps, './files/timestamps.json')


def revise_timestamps():
    timestamps = load_json('./files/timestamps.json')
    for i in range(0, 6):
        words_with_timestamps = get_timestamps(f"audio/opening_{i}.mp3")
        if 'opening' not in timestamps:
            timestamps['opening'] = {}
        if i not in timestamps['opening']:
            timestamps['opening'][i] = {}
        timestamps['opening'][i] = words_with_timestamps
    for i in range(0, 6):
        words_with_timestamps = get_timestamps(f"audio/closing_{i}.mp3")
        if 'closing' not in timestamps:
            timestamps['closing'] = {}
        if i not in timestamps['closing']:
            timestamps['closing'][i] = {}
        timestamps['closing'][i] = words_with_timestamps
    words_with_timestamps = get_timestamps(f"audio/no_answer_0.mp3")
    if 'no-answer' not in timestamps:
        timestamps['no-answer'] = {}
    timestamps['no-answer'] = words_with_timestamps
    save_json(timestamps, 'timestamps.json')

if __name__ == "__main__":
    revise_timestamps()
    # generate_audio_for_book()
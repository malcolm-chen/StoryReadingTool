import nltk
from nltk.tokenize import WordPunctTokenizer
from nltk.tokenize import word_tokenize
from nltk.corpus import stopwords
import json
import os
import openai
nltk.download('punkt_tab')
sen_tokenizer = nltk.data.load('tokenizers/punkt/english.pickle') 

def split_sentence(text):
    return  sen_tokenizer.tokenize(text) 

def load_json(file_path):
    assert file_path.split('.')[-1] == 'json'
    with open(file_path,'r') as file:
        data = json.load(file)
    return data

def save_json(save_path,data):
    assert save_path.split('.')[-1] == 'json'
    with open(save_path, 'w', encoding='utf-8') as file:
        json.dump(data, file)
    file.close()

def save_sen_split(title):
    story_sen = []
    story = load_json('../frontend/public/files/books/' + title + '/' + title + '.json')
    for i, para in enumerate(story):
        para_list = []
        for section in para:
            sentences = split_sentence(section)
            # print(sentences)
            if len(sentences) == 1:
                para_list.append(sentences[0])
            else:
                current_section = []
                for sen in sentences:
                    if sen.strip():
                        current_section.append(sen)
                    if len(current_section) >= 2 and len(current_section[-2]) + len(current_section[-1]) <= 80:
                        current_section[-2] += ' ' + current_section[-1]
                        current_section.pop()
                    if len(current_section) >= 3 and len(current_section[-3]) + len(current_section[-2]) + len(current_section[-1]) <= 80:
                        current_section[-3] += ' ' + current_section[-2] + ' ' + current_section[-1]
                        current_section.pop()
                        current_section.pop()
                para_list += current_section
        story_sen.append(para_list)
    save_json('../frontend/public/files/books/' + title + '/' + title + '_sentence_split.json', story_sen)

# save_sen_split('Oscar and the Cricket')


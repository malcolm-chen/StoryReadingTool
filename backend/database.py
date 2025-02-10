import pymongo
import sys
import os
import gridfs
from dotenv import load_dotenv
import json
import requests
load_dotenv()



try:
    client = pymongo.MongoClient(os.getenv("MONGO_URI"))
    client.admin.command("ping")  # 测试连接
except pymongo.errors.ConfigurationError:
    print("An Invalid URI host error was received. Is your Atlas host name correct in your connection string?")
    sys.exit(1)
except pymongo.errors.ConnectionFailure:
    print("Failed to connect to MongoDB. Check your internet connection or server status.")
    sys.exit(1)
except pymongo.errors.OperationFailure:
    print("Authentication failed. Please check your username and password.")
    sys.exit(1)

print("Connected to MongoDB")

# print all existing databases
print(client.list_database_names())

# use a database named "myDatabase"
db = client["StoryBook"]

# # use a collection named "users"
users = db["User"]

def get_file_size():
    # get the file size of the first file in the fs
    fs = gridfs.GridFS(client.get_database("StoryBook"))
    file_id = fs.find_one()._id
    file_size = fs.find_one({'_id': file_id}).length / 1024 / 1024
    return file_size

# print all users
# for user in users.find():
#     print(user["username"])

# insert new users based on:
# username: string
# password: string
user_dict = {
    "jiaju": "123",
    "user": "123",
    "leo": "123", 
    "Jiaju": "123",
    "Ziyi": "123",
    "Mengllin": "123",
    "Kimberly": "123",
    "BoSun": "123",
    "Reyna": "123",
    "SHIHAN": "123",
    "Jasmin": "123",
    "jerry": "123",
    "ashley": "123",
    "smit": "123",
    "ArthurTest1": "123",
    "Wakey": "123",
    "aaa": "123",
    "a s d": "123",
    "Gigi": "123",
    "lero": "123",
    "yingxu": "123",
    "xuechen": "123",
    "test": "123",
    "user1": "123",
    "user2": "123",
    "user3": "123", 
    "user4": "123",
    "user5": "123",
    "user6": "123",
    "user7": "123",
    "user8": "123",
    "user9": "123",
    "user10": "123"
}


def reset_users():
    # delete all users
    users.delete_many({})
    # delete all files in the fs
    fs = gridfs.GridFS(client.get_database("StoryBook"))
    for file in fs.find():
        fs.delete(file._id)
    # delete fs.chunks
    client.get_database("StoryBook")['fs.chunks'].delete_many({})

    for username, password in user_dict.items():
        try:
            users.insert_one({
                "username": username, 
                "password": password,
                "current_book": None,
                "current_page": None,
                "chat_history": {},
                "asked_questions": {}
            })
        except Exception as e:
            print(f"Error inserting user {username}: {e}")

# reset_users()

def reset_the_user(username):
    users.delete_one({"username": username})
    fs = gridfs.GridFS(client.get_database("StoryBook"))
    # Find all files matching the username pattern
    files = fs.find({"filename": {"$regex": f"{username}_"}})
    
    # Delete each file individually
    for file in files:
        fs.delete(file._id)

    users.insert_one({
        "username": username, 
        "password": "123",
        "current_book": None,
        "current_page": None,
        "chat_history": {},
        "asked_questions": {}
    })

reset_the_user("jiaju")

def add_users(user_dict):
    for username, password in user_dict.items():
        users.insert_one({
            "username": username, 
            "password": password,
            "current_book": None,
            "current_page": None,
            "chat_history": {},
            "asked_questions": {}
        })
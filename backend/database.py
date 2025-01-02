import pymongo
import sys
import os
from dotenv import load_dotenv
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

# print all users
for user in users.find():
    print(user)


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
    "test": "123"
}

# delete all users
users.delete_many({})

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
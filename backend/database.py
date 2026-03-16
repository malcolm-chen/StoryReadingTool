import pymongo
from pymongo.server_api import ServerApi
import sys
import os
import gridfs
from dotenv import load_dotenv
import json
import requests
import pandas as pd
import openpyxl
load_dotenv()

# MongoDB connection options
client_options = {
    "serverSelectionTimeoutMS": 5000,  # 5 second timeout
    "connectTimeoutMS": 10000,
    "retryWrites": True,
    "retryReads": True
}

try:
    client = pymongo.MongoClient(
        os.getenv("MONGO_URI"),
        **client_options
    )
    # Test connection with timeout
    client.admin.command("ping")
except pymongo.errors.ConfigurationError as e:
    print(f"MongoDB Configuration Error: {str(e)}")
    print("Please check your MongoDB URI and internet connection.")
    sys.exit(1)
except pymongo.errors.ConnectionFailure as e:
    print(f"MongoDB Connection Error: {str(e)}")
    print("Failed to connect to MongoDB. Check your internet connection or server status.")
    sys.exit(1)
except pymongo.errors.OperationFailure as e:
    print(f"MongoDB Operation Error: {str(e)}")
    print("Authentication failed. Please check your username and password.")
    sys.exit(1)
except Exception as e:
    print(f"Unexpected error: {str(e)}")
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
    files = fs.find({"filename": {"$regex": f"^{username}-"}})
    
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

# reset_the_user("jiaju")

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

# write a function to read a user's chat history
def read_chat_history(username):
    user = users.find_one({"username": username})
    fs = gridfs.GridFS(client.get_database("StoryBook"))
    book_chat_history = {}
    for key, value in user["chat_history"]["Why Frogs are Wet"].items():
        print(key, value)
        chat_history_object = user["chat_history"]['Why Frogs are Wet'][key][0]
        print(chat_history_object)
        # find the file based on object id
        
        # load the file in json format
        chat_history_file = fs.find_one({"_id": chat_history_object})
        chat_history_file = json.loads(chat_history_file.read().decode('utf-8'))
        book_chat_history[key] = chat_history_file
    return book_chat_history

def save_json_to_file(data, filename):
    with open(filename, 'w') as f:
        json.dump(data, f, indent=4)

def save_to_excel_file(data, filename):
    """
    Save chat history to an Excel file with four columns: Page ID, Speaker, AI Message, Child Message.
    
    Args:
        data: Chat history data from read_chat_history() function
        filename: Output Excel filename (e.g., "chat_history.xlsx")
    """
    rows = []
    
    # Iterate through all pages in the chat history
    for page_key, messages in data.items():
        # Iterate through each message in the page
        for message in messages:
            speaker = message.get("role", "")
            content = message.get("content", "")
            
            # Create row based on speaker role
            if speaker == "assistant":
                rows.append({
                    "Page ID": page_key,
                    "Speaker": "assistant",
                    "AI Message": content,
                    "Child Message": ""
                })
            elif speaker == "user":
                rows.append({
                    "Page ID": page_key,
                    "Speaker": "user",
                    "AI Message": "",
                    "Child Message": content
                })
    
    # Create DataFrame and save to Excel
    df = pd.DataFrame(rows)
    df.to_excel(filename, index=False, engine='openpyxl')
    print(f"Chat history saved to {filename}")

# save_json_to_file(read_chat_history("Saud"), "Saud_chat_history.json")
# save_json_to_file(read_chat_history("Iris"), "Iris_chat_history.json")
# save_json_to_file(read_chat_history("Sylvie"), "Sylvie_chat_history.json")
# save_json_to_file(read_chat_history("Sal"), "Sal_chat_history.json")

def delete_user_files(username):
    """
    Delete all files associated with a specific user from GridFS.
    
    Args:
        username (str): The username whose files need to be deleted
        
    Returns:
        int: Number of files deleted
    """
    try:
        fs = gridfs.GridFS(client.get_database("StoryBook"))
        # Find all files matching the username pattern
        files = fs.find({"filename": {"$regex": f"^{username}-"}})
        
        deleted_count = 0
        # Delete each file individually
        for file in files:
            fs.delete(file._id)
            deleted_count += 1
            print(f"Deleted file {file.filename}")
            
        # Also delete any chunks associated with these files
        client.get_database("StoryBook")['fs.chunks'].delete_many({"files_id": {"$in": [file._id for file in files]}})
        print(f"Deleted {deleted_count} files for user {username}")
        return deleted_count
    except Exception as e:
        print(f"Error deleting files for user {username}: {e}")
        return 0
    
def get_all_users():
    return users.find()


if __name__ == "__main__":
    # for user in get_all_users():
    #     print(user["username"])
    # save_json_to_file(read_chat_history("Macy"), "Macy_chat_history.json")
    # save_json_to_file(read_chat_history("Akane"), "Akane_chat_history.json")
    # save_to_excel_file(read_chat_history("Akane"), "Akane_chat_history.xlsx")
    delete_user_files("Jiaju")
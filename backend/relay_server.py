import asyncio
import websockets
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def relay(websocket1, websocket2):
    while True:
        try:
            message = await websocket1.recv()
            await websocket2.send(message)
        except websockets.ConnectionClosed:
            break

async def handler(websocket, path):
    print(websocket, path)
    # Wait for another client to connect
    other_client = None
    while other_client is None:
        try:
            other_client = await  websockets.connect(
                OPENAI_WS_URL,
                extra_headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "OpenAI-Beta": "realtime=v1"
                }
        )
        except ConnectionRefusedError:
            await asyncio.sleep(1)

    # Start relaying messages between the two clients
    await asyncio.gather(
        relay(websocket, other_client),
        relay(other_client, websocket)
    )


start_server = websockets.serve(handler, "0.0.0.0", 8765, subprotocols=[
      'realtime',
      'openai-insecure-api-key.123',
      'openai-beta.realtime-v1',
    ])

asyncio.get_event_loop().run_until_complete(start_server)
asyncio.get_event_loop().run_forever()
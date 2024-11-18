import asyncio
import websockets
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_WS_URL = "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

async def relay(websocket1, websocket2):
    """Relay messages between two websockets."""
    try:
        while True:
            message = await websocket1.recv()
            await websocket2.send(message)
    except websockets.ConnectionClosed:
        # Close the other websocket when one is closed
        await websocket2.close()

async def handler(websocket):
    """Handle incoming WebSocket connections."""
    other_client = None

    # Attempt to connect to the OpenAI WebSocket server
    while other_client is None:
        try:
            other_client = await websockets.connect(
                OPENAI_WS_URL,
                additional_headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "OpenAI-Beta": "realtime=v1"
                }
            )
        except (websockets.ConnectionClosedError, ConnectionRefusedError):
            await asyncio.sleep(1)

    # Relay messages between the client and OpenAI WebSocket
    try:
        await asyncio.gather(
            relay(websocket, other_client),
            relay(other_client, websocket),
        )
    finally:
        # Ensure both websockets are closed gracefully
        await websocket.close()
        await other_client.close()

async def main():
    """Start the WebSocket server."""
    server = await websockets.serve(
        handler, "0.0.0.0", 8765,
        subprotocols=[
            'realtime',
            'openai-insecure-api-key.123',
            'openai-beta.realtime-v1',
        ]
    )
    print("WebSocket server started on ws://0.0.0.0:8765")
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())


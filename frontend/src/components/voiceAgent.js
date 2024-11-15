import React, { useEffect } from 'react';
import { RealtimeClient } from '@openai/realtime-api-beta';

const VoiceAgent = () => {
  useEffect(() => {
    const client = new RealtimeClient({ url: 'ws://localhost:8765' });

    // Set parameters before connecting
    client.updateSession({ instructions: 'You are a great, upbeat friend.' });
    client.updateSession({ voice: 'alloy' });
    client.updateSession({
      turn_detection: { type: 'none' }, // or 'server_vad'
      input_audio_transcription: { model: 'whisper-1' },
    });

    // Set up event handling
    client.on('conversation.updated', (event) => {
      const { item, delta } = event;
      const items = client.conversation.getItems();
      console.log(items);
      // Handle the updated conversation items
    });

    // Connect to Realtime API
    client.connect().then(() => {
      // receive response
      client.on('response.created', (event) => {
        const { response } = event;
        console.log("Response:", response);
      });
    });

    // Cleanup function to disconnect on component unmount
    return () => {
      client.disconnect();
    };
  }, []); // Empty dependency array ensures this runs once on mount

  return (
    <div>
      <h1>Voice Agent</h1>
      {/* Additional UI components can be added here */}
    </div>
  );
};

export default VoiceAgent;
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, ModalClose, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress } from '@mui/joy';
import { Button, Image } from 'react-bootstrap';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { GiSpellBook } from "react-icons/gi";
import { FcNext } from "react-icons/fc";
import { BsFillSendFill } from "react-icons/bs";
import { RiChatVoiceFill } from "react-icons/ri";
import { FaRecordVinyl } from "react-icons/fa6";
import { IoLibrary } from "react-icons/io5";
import { FaBook } from "react-icons/fa";
import { MdChromeReaderMode } from "react-icons/md";
import { FaAnglesRight } from "react-icons/fa6";
import { AiOutlineLoading } from "react-icons/ai";
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index';
import { WavRenderer } from '../../utils/wav_renderer.ts';
import { RealtimeClient } from '@openai/realtime-api-beta';
import Header from '../header.js';

const GreetPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [user, setUser] = useState(location.state?.user || 'User');
    const [chatHistory, setChatHistory] = useState([]);
    const [items, setItems] = useState([]);
    const [realtimeEvents, setRealtimeEvents] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [canPushToTalk, setCanPushToTalk] = useState(true);
    const [isRecording, setIsRecording] = useState(false);
    const [memoryKv, setMemoryKv] = useState({});
    const [isEnding, setIsEnding] = useState(false);
    const [age, setAge] = useState('');
    const [interests, setInterests] = useState('');
    const [penguinSrc, setPenguinSrc] = useState('./files/imgs/penguin1.svg');

    const wavRecorderRef = useRef(
        new WavRecorder({ sampleRate: 24000 })
    );
    const wavStreamPlayerRef = useRef(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientRef = useRef(
        new RealtimeClient( { url: 'ws://localhost:8765' } )
    );

    const model = 'gpt-4o-realtime-preview-2024-10-01';

    let audio = new Audio();
    let audioData = '';

    const handleLinkSelect = (e) => {
        e.preventDefault();
        audio.pause();
        navigate('/select', { state: { title: title, user: user } });
    };

    const handleLinkMode = (e) => {
        e.preventDefault();
        audio.pause();
        navigate('/mode', { state: { title: title, user: user } });
    };

    /**
     * Connect to conversation:
     * WavRecorder taks speech input, WavStreamPlayer output, client is API client
     */
    const connectConversation = useCallback(async () => {
        const client = clientRef.current;
        const wavRecorder = wavRecorderRef.current;
        const wavStreamPlayer = wavStreamPlayerRef.current;

        // Set state variables
        setRealtimeEvents([]);
        setItems(client.conversation.getItems());

        // Connect to microphone
        await wavRecorder.begin();

        // Connect to audio output
        await wavStreamPlayer.connect();

        // Connect to realtime API
        await client.connect();
        setIsConnected(true);
        console.log('connected')

        if (client.getTurnDetectionType() === 'server_vad') {
        await wavRecorder.record((data) => client.appendInputAudio(data.mono));
        }
    }, []);

    /**
     * Disconnect and reset conversation state
     */
    const disconnectConversation = useCallback(async () => {
        setIsConnected(false);
        setRealtimeEvents([]);
        setItems([]);
        setMemoryKv({});

        const client = clientRef.current;
        client.disconnect();

        const wavRecorder = wavRecorderRef.current;
        await wavRecorder.end();

        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
    }, []);

    const deleteConversationItem = useCallback(async (id) => {
        const client = clientRef.current;
        client.deleteItem(id);
    }, []);

    /**
     * In push-to-talk mode, start recording
     * .appendInputAudio() for each sample
     */
    const startRecording = async (e) => {
        e.preventDefault();
        setIsRecording(true);
        const client = clientRef.current;
        const wavRecorder = wavRecorderRef.current;
        const wavStreamPlayer = wavStreamPlayerRef.current;
        const trackSampleOffset = await wavStreamPlayer.interrupt();
        if (trackSampleOffset?.trackId) {
            const { trackId, offset } = trackSampleOffset;
            await client.cancelResponse(trackId, offset);
        }
        await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    };

    /**
     * In push-to-talk mode, stop recording
     */
    const stopRecording = async (e) => {
        e.preventDefault();
        setIsRecording(false);
        const client = clientRef.current;
        const wavRecorder = wavRecorderRef.current;
        await wavRecorder.pause();
        client.createResponse();
    };

    const handleEndGreet = () => {
        audio.pause();
        disconnectConversation();
        navigate('/chat', { state: { user: user, age: age, interest: interests, title: title } })
    }

    useEffect(() => {
        (async () => {
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            console.log(client);
            console.log(clientRef);
            client.updateSession({ instructions: `
                You are a friendly chatbot interacting with a child. You will have two rounds of conversation, each round asking one question.
                You need to initiate the conversation by asking the first question.
                Question 1: Hello ${user}, very happy to meet you! How old are you this year?
                Question 2: [Make a positive, affirmative response to the child's answer] Do you have any favorite topics? Like space, princesses, dinosaurs, or cars? You can talk about anything you like!
                If you cannot recognize the child's response, you should tell the child that you cannot hear them, and ask the question again.
                After question 2, acknowledge the child's stated interests, introduce the upcoming interactive story reading activity to the child, and end the conversation.
                The introduction: We will now enter the read and chat mode. In this mode, we will explore knowledge together, and you can answer questions by clicking buttons on the screen. Are you ready? Let's start reading!` 
            });
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
            client.addTool({
                "name": "end_conversation",
                "description": "Ends the conversation with the user",
                "parameters": {
                    "type": "object",
                    "properties": {
                    },
                }
            },
            async () => {
                console.log('ending conversation');
                setIsEnding(true);
            });
            client.addTool({
                "name": "summarize_child_info",
                "description": "Summarizes the child's age and interests",
                "parameters": {
                    "type": "object",
                    "properties": {
                        age: { type: "string" },
                        interests: { type: "string" }
                    },
                    "required": ["age", "interests"]
                }
            },
            async ({age, interests}) => {
                setAge(age);
                setInterests(interests);
                console.log('age', age);
                console.log('interests', interests);
            });

            client.on('error', (event) => console.error(event));
            client.on('conversation.interrupted', async () => {
                const trackSampleOffset = await wavStreamPlayer.interrupt();
                if (trackSampleOffset?.trackId) {
                const { trackId, offset } = trackSampleOffset;
                await client.cancelResponse(trackId, offset);
                }
            });
            client.on('conversation.updated', async ({ item, delta }) => {
                const items = client.conversation.getItems();
                // console.log(items);
                if (delta?.transcript) {
                    setChatHistory(items);
                    console.log(item);
                    const chatWindow = document.getElementById('chat-window');
                    chatWindow.scrollTop = chatWindow.scrollHeight;
                }
                if (delta?.audio) {
                    wavStreamPlayer.add16BitPCM(delta.audio, item.id);
                }
                if (item.status === 'completed' && item.formatted.audio?.length) {
                const wavFile = await WavRecorder.decode(
                    item.formatted.audio,
                    24000,
                    24000
                );
                item.formatted.file = wavFile;
                }
                setItems(items);
            });
            
            if (!client.isConnected()) {
                await connectConversation();
            }   
            client.realtime.send('response.create');
        
            setItems(client.conversation.getItems());

            return () => {
                // cleanup; resets to defaults
                client.reset();
            };
        })();
    }, []);
    

    return (
        <Box className="background-container">
            <Header user={user} title={title} hasTitle={true} />
            <Breadcrumbs className='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                <Link href='/select' onClick={handleLinkSelect} ><IoLibrary /> Library</Link>
                <Typography><FaBook /> {title}</Typography>
            </Breadcrumbs>
            <Box className='main-content'>
                <Box className='instruction-box-greet'>
                    <img src={penguinSrc} alt='penguin' style={{ width: "60px", height: "60px", marginRight: '16px' }} />
                    <h2 id='page-title' style={{ display: "flex", alignItems: "center" }} >Meet </h2>
                    <h2 id='page-title' style={{ marginLeft: "5px", marginRight: "5px", color: "#ffd803", fontWeight: "900" }} > Sparky✨ </h2>
                    <h2 id='page-title' >, your reading mate!</h2>
                </Box>
                <Box className='greet-chat-box'>
                    <Box id='chat-window'>
                        {chatHistory.length == 0 && (
                            <Box id='loading-box'>
                                <AiOutlineLoading id='loading-icon' size={40} color='#7AA2E3' />
                            </Box>
                        )}
                        {chatHistory.filter(msg => msg.type === 'message').map((msg, index) => (
                            <Box key={index} id={msg.role === 'user' ? 'user-msg' : 'chatbot-msg'}>
                                {msg.role === 'user' ? (
                                    <Box id="user-chat">
                                        <Avatar id='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793', marginRight: "1vw"}}>{user.substring(0, 2)}</Avatar>
                                        <Box id="msg-bubble">
                                            <h5 level='body-lg' style={{margin: '0px'}}>{msg.content[0].transcript}</h5>
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box id="chatbot-chat">
                                        <Image id='chatbot-avatar' src={penguinSrc}></Image>
                                        <Box id="msg-bubble">
                                            <h5 level='body-lg' style={{margin: '0px'}}>{msg.content[0].transcript}</h5>
                                        </Box>
                                    </Box>
                                )}
                            </Box>
                        ))}
                    </Box>
                    {canPushToTalk && !isEnding && (
                    <button id='chat-input-greet' 
                    disabled={!isConnected || !canPushToTalk}
                    onMouseDown={startRecording}
                    onTouchStart={startRecording}
                    onMouseUp={stopRecording}
                    onTouchEnd={stopRecording}
                    onContextMenu={(e) => e.preventDefault()}
                    style={{
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    >
                            {isRecording && (
                                <FaRecordVinyl size={40} color='#7AA2E3' style={{marginRight: "2vw"}} />
                            )}
                            {!isRecording && (
                                <RiChatVoiceFill size={40} color='#7AA2E3' style={{marginRight: "2vw"}} />
                            )}
                            <h4 id='voice-input-text'>{isRecording ? 'release to send' : 'push to talk'}</h4>
                       
                        </button>
                    )}
                    {isEnding && (
                    <Box id='chat-input-greet'>
                        <Box id='chat-end' onClick={handleEndGreet}>
                            <IconButton id='to-chatread-btn' >
                                <GiSpellBook size={40} color='#7AA2E3' />
                            </IconButton>
                            <h4 id='voice-input-text'>Let's start reading and chatting!</h4>
                        </Box>
                    </Box>
                        )}  
                    <div id='skip-btn-container'>
                        <IconButton id='skip-btn' variant='plain' onClick={handleEndGreet} > <FaAnglesRight style={{ marginRight: '20px' }}/> Skip  </IconButton>
                    </div>                  
                </Box>
                
            </Box>
        </Box>
    )

};

export default GreetPage;
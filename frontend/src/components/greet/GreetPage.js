import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress, Menu, List, ListItem, Slider, MenuButton, MenuList, MenuItem } from '@mui/joy';
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";
import { Button, Dropdown, Image } from 'react-bootstrap';
import { AiOutlineLoading } from "react-icons/ai";
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index';
import Header from '../header';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { FaCirclePlay, FaCirclePause } from "react-icons/fa6";
import { FaRightFromBracket } from "react-icons/fa6";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";
const apiUrl = process.env.REACT_APP_API_URL;

const GreetPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = localStorage.getItem('username') || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [chatHistory, setChatHistory] = useState([]);
    const [isClientSetup, setIsClientSetup] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [canPushToTalk, setCanPushToTalk] = useState(true);
    const [isConversationEnded, setIsConversationEnded] = useState(false);
    const [realtimeEvents, setRealtimeEvents] = useState([]);
    const [items, setItems] = useState([]);
    const [memoryKv, setMemoryKv] = useState({});
    const [isExpandedChat, setIsExpandedChat] = useState(false);
    const [isMinimizedChat, setIsMinimizedChat] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(localStorage.getItem(`${title}-audioSpeed`) ? parseFloat(localStorage.getItem(`${title}-audioSpeed`)) : 1);
    const [autoPage, setAutoPage] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [replayingIndex, setReplayingIndex] = useState(null);
    // const [isAsking, setIsAsking] = useState(false);
    const [isAsked, setIsAsked] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    const recorderControls = useVoiceVisualizer();
    const [timer, setTimer] = useState(0);
    const timerRef = useRef(null);
    // const [evaluation, setEvaluation] = useState(null);
    
    const penguin = './files/imgs/penguin1.svg';

    // currentPage = localStorage.getItem(`${title}-currentPage`) ? parseInt(localStorage.getItem(`${title}-currentPage`), 10) : 0;
    
    const wavRecorderRef = useRef(
        new WavRecorder({ sampleRate: 24000 })
    );
    const wavStreamPlayerRef = useRef(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientRef = useRef(
        new RealtimeClient( { url: 'wss://storybook-reader.hailab.io:8766' } )
    );

    const audioRef = useRef(new Audio());
    const replayAudioRef = useRef(new Audio());
    const isWaitingForResponseRef = useRef(false);
    const userRespondedRef = useRef(false);
    const isAskingRef = useRef(false);
    const isReplayingRef = useRef(false);


    useEffect(() => {
        if (user === null) {
            navigate('/');
        }
    }, [user]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                console.log('space key pressed');
                if (clientRef.current.realtime.isConnected() && !isRecording) {
                    startRecording();
                }
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                console.log('space key released');
                if (clientRef.current.realtime.isConnected() && isRecording) {
                    stopRecording();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isRecording]);


    useEffect(() => {
        const setupGreet = async () => {
            console.log('setting up client for guiding');
            setupClient(await getInstruction4Greet());
            setIsClientSetup(true);
        }
        setupGreet();
    }, []);

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
        console.log('connected')
        setIsConnected(true);

        if (client.getTurnDetectionType() === 'server_vad') {
            await wavRecorder.record((data) => client.appendInputAudio(data.mono));
        }
    }, []);


    /**
     * Disconnect and reset conversation state
     */
    const disconnectConversation = useCallback(async () => {
        console.log('disconnecting conversation');
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
    const startRecording = async () => {
        setIsRecording(true);
        setIsConversationEnded(false);
        console.log('start recording');
        userRespondedRef.current = true;
        isWaitingForResponseRef.current = false;
        if (timerRef.current) clearInterval(timerRef.current);
        replayAudioRef.current.pause();
        setReplayingIndex(null);
        isReplayingRef.current = false;
        
        const client = clientRef.current;
        const wavRecorder = wavRecorderRef.current;
        const wavStreamPlayer = wavStreamPlayerRef.current;
        const trackSampleOffset = await wavStreamPlayer.interrupt();
        if (trackSampleOffset?.trackId) {
            const { trackId, offset } = trackSampleOffset;
            await client.cancelResponse(trackId, offset);
        }
        recorderControls.startRecording();
        await wavRecorder.record((data) => client.appendInputAudio(data.mono));
    };

    /**
     * In push-to-talk mode, stop recording
     */
    const stopRecording = async () => {
        setIsRecording(false);
        const client = clientRef.current;
        const wavRecorder = wavRecorderRef.current;
        await wavRecorder.pause();
        recorderControls.stopRecording();
        console.log('stop recording');

        client.createResponse();
    };

    async function getInstruction4Greet() {
        const instruction4Greet = `
        You are a friendly chatbot engaging with a child named ${user}, who is reading a storybook named ${title}.
        Your task is to help the child get familiar with the interaction with the chatbot.

        Instructions:
        - Always start by asking 'Hey ${user}, I am your reading partner. We are going to read the storybook ${title}. When reading the story, I will ask you questions about the story. You can press AND hold the big yellow button to talk. When you release the button, your response will be sent to me. Let's try it! Here is the first question: How old are you?' (end the first turn with a question mark)
        - If the child's response is not clear, you can ask the child to repeat it, and you should instruct the child to 'press and hold the big yellow button to talk, and release it when you are done'.
        - After the child's response is clearly recognized, you should first acknowledge the child's age and their effort in successfully talking to you, and then ask the second question: "We are going to read a story about frog. What do you know about frogs?"
        - After the child answers the second question, acknowledge their response, and conclude the conversation by saying 'Great! Now, let's explore the story together!'
        - When concluding the conversation, you should not ask any more questions.

        **Important Reminders**:
        - Focus on teaching the child how to interact with you, the chatbot.
        - Maintain concise responses: each should be no more than 25 words, using simple tier1 or tier2 vocabulary.
        - Keep the conversation within three rounds.
        - Only recognize the child's answer in English.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - Do not make up child's response. If the response is not clear, you should instruct the child to 'press and hold the big yellow button to talk, and release it when you are done', and then you should ask the child to repeat it.
        - When concluding the conversation, you should not ask any more questions.
        - If the conversation is NOT ended, always end each turn with a question.
        `;
        return instruction4Greet;
    }

    // function getInstruction4Evaluation(items) {
    //     const instruction4Evaluation = `
    //     **Instructions for Evaluation**:
    //     The child is trying to interact with you, a chatbot, through a device.
    //     You need to evaluate the child's response based on the following inputs, to determine if the child's response is valid:
    //     - Conversation History: ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')}
    //     - Child's Latest Response: The most recent input from the child.
    //     Focus only on evaluating the child's response to the latest question.

    //     **Steps for Evaluation**:
    //     Step 1: Check Response Validity
    //     If the response is empty, cannot be recognized due to noise, being too short, or sent by mistake, mark it as "invalid".
    //     Step 2: Evaluate Valid Responses
    //     For responses that contain meaningful content, use the following criteria:
    //     - Valid: The response is clear and understandable.
    //     - Child Asks Question: As long as the child asks a question, mark it as "child asks question".
                    
    //     **Response Format**:
    //     Precede each evaluation with the tag <eval>. Do not include any other text apart from the tag and evaluation. Examples of your output, reply with one of these only:
    //     - <eval>valid
    //     - <eval>invalid
    //     - <eval>child asks question
    //     `;
    //     console.log(instruction4Evaluation);
    //     return instruction4Evaluation;
    // }

    const getInstruction4NoResponse = () => {
        const instruction4NoResponse = `
        **Instructions**:
        1. Read the chat history to find the last question you asked.
        2. Ignore the chat history. Say "Hey, I didn't hear your answer." and ADD the last question you asked.
        
        **Important Reminder**:
        - Make sure to only ask this exact question ONCE, and do not say or ask anything else. DO not provide answer to your question.
        `;
        console.log(instruction4NoResponse);
        return instruction4NoResponse;
    }

    const updateClientInstruction = async (instruction) => {
        const client = clientRef.current;
        client.updateSession({ instructions: instruction });
        client.realtime.send('response.create');
        console.log(instruction);
    }

    const startResponseTimer = async () => {
        // update the response timer every 1 second
        console.log('startResponseTimer');
        userRespondedRef.current = false;
        isWaitingForResponseRef.current = true;
        setTimer(0); // 计时器从 0 开始
        if (timerRef.current) clearInterval(timerRef.current); 
        // if the user clicks replay during the timer, clear the timer, and wait until the replay is finished and start the timer again
        timerRef.current = setInterval(async () => {
            setTimer((prev) => prev + 1); // 每秒递增
            if (isReplayingRef.current) {
                clearInterval(timerRef.current);
                while (isReplayingRef.current) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                startResponseTimer();
            }
        }, 1000);
    }

    useEffect(() => {
        if (timer >= 15 && !userRespondedRef.current) {
          console.log('User did not respond in 15 seconds. Sending another message...');
          console.log('isWaitingForResponse', isWaitingForResponseRef.current);
          const client = clientRef.current;
          // if the client is connected, send a message
          if (isClientSetup && isWaitingForResponseRef.current) {
            client.realtime.send('response.create', {
                response: {
                    "modalities": ["text", "audio"],
                    "instructions": getInstruction4NoResponse()
                }
            });
          }
          if (timerRef.current) clearInterval(timerRef.current); // 停止计时器
        }
    }, [timer, userRespondedRef.current]);
    // clear the timer when page changes

    useEffect(() => {
        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      }, []);

    const setupClient = async (instruction) => {
        (async () => {
            console.log('setting up client');
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            client.updateSession({ instructions: instruction });
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
            client.on('error', (event) => console.error(event));
            client.on('conversation.interrupted', async () => {
                const trackSampleOffset = await wavStreamPlayer.interrupt();
                if (trackSampleOffset?.trackId) {
                const { trackId, offset } = trackSampleOffset;
                await client.cancelResponse(trackId, offset);
                }
                userRespondedRef.current = true;
                isWaitingForResponseRef.current = false;
                if (timerRef.current) clearInterval(timerRef.current);
                setTimer(0);
            });
            client.on('conversation.item.appended', (item) => {
                console.log('conversation.item.appended');
                // console.log(item);
            });
            client.on('conversation.updated', async ({ item, delta }) => {
                const items = client.conversation.getItems();
                // set timer to 0
                setTimer(0);
                // console.log('item', item);
                if(timerRef.current) clearInterval(timerRef.current);
                // if the item starts with <test>, delete it
                
                if (delta?.transcript) {
                    setChatHistory(items);
                    const chatWindow = document.getElementById('chat-window');
                    if (chatWindow) {
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    }
                }
                if (delta?.audio) {
                    wavStreamPlayer.add16BitPCM(delta.audio, item.id);
                }
                if (item.status === 'completed' && item.formatted.audio?.length) {
                    console.log('current item', item);
                    const wavFile = await WavRecorder.decode(
                        item.formatted.audio,
                        24000,
                        24000
                    );
                    item.formatted.file = wavFile;
                    setChatHistory(items);
                    // setCurrentPageChatHistory(items);
                    //chatHistoryRef.current[currentPageRef.current] = items;
                    
                    const chatWindow = document.getElementById('greet-chat-window');
                    if (chatWindow) {
                        chatWindow.scrollTop = chatWindow.scrollHeight;
                    }
                    if (item.role === 'assistant') {
                        // if the last item does not end with a question mark, it means the conversation is ended
                        if (!item?.content[0]?.transcript?.endsWith('?')) {
                            while (wavStreamPlayer.isPlaying() || isReplayingRef.current) {
                                await new Promise(resolve => setTimeout(resolve, 100));
                            }
                            console.log('conversation ended');
                            if (!isReplayingRef.current && !isAskingRef.current) {
                                setIsConversationEnded(true);
                            }
                        } else {
                            // every time after the assistant's response (except the response asking for the child's answer), set a timer to check if there is a user's response. If there is no user's response after 15 seconds, ask question again.
                            // if the user interrupted the conversation, do not set the timer
                            console.log('isWaitingForResponseRef.current', isWaitingForResponseRef.current);
                            console.log('userRespondedRef.current', userRespondedRef.current);
                            if (!isWaitingForResponseRef.current) {
                                while (wavStreamPlayer.isPlaying() || isReplayingRef.current) {
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }
                                if (!isReplayingRef.current) {
                                    startResponseTimer();
                                }
                            }
                        }
                    } else {
                        setIsFirstTime(false);
                    }
                }
                setItems(items);
                setIsClientSetup(true);
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
    };

    useEffect(() => {
        if (isConversationEnded) {
            handleSkip();
        }
    }, [isConversationEnded]);


    const handleReplay = async (index) => {
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
        const replayAudio = replayAudioRef.current;
        replayAudio.src = chatHistory[index].formatted.file.url;
        // pause the replayAudio
        replayAudio.pause();
        replayAudio.currentTime = 0;
        if (isReplayingRef.current === false) {
            replayAudio.play();
            setReplayingIndex(index); // Set the replaying index
            isReplayingRef.current = true;
            replayAudio.onended = () => {
                console.log('replay ended');
                isReplayingRef.current = false;
                setReplayingIndex(null); // Reset the replaying index when done
            };
        }
        // setIsPlaying(true);
        // replayAudio.onended = () => {
        //     setIsPlaying(false);
        // };
    }


    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = audioSpeed;
        }
        localStorage.setItem(`${title}-audioSpeed`, audioSpeed);
    }, [audioSpeed]);

    const processChatHistory = (chatHistory) => {
        const formData = new FormData();
        // add the user, title, page to the formData
        formData.append('user', user);
        formData.append('title', title);
        chatHistory.forEach((item, index) => {
            const prefix = `item_${index}`;
            const itemDict = {
                id: item.id,
                role: item.role,
                content: item.content[0].transcript,
            }
            formData.append(`${prefix}_dict`, JSON.stringify(itemDict));
            if (item.role === 'user' && item.formatted?.file?.blob) {
                formData.append(`${prefix}_audioBlob`, item.formatted.file.blob, `${user}-${title}-Greeting-ID_${index}.mp3`);
            }
        });
        console.log('formData', formData);
        return formData;
    }

    const handleCloseChat = async () => {
        console.log('handleCloseChat');
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
        setIsAsked(true);
        // send the chat history to backend
        // console.log('chatHistory to save', chatHistory);
        const formData = processChatHistory(chatHistory);
        try {
            const response = await fetch(`${apiUrl}/api/chat_history`, {
                method: 'POST',
                body: formData
            });
            console.log('response', response);
        } catch (error) {
            console.error('Error sending chat history to backend', error);
        }
    }

    useEffect(() => {
        // Cleanup function to pause audio when component unmounts
        return () => {
            audioRef.current.pause();
            setIsPlaying(false);
        };
    }, []);

    // if the 'clientsetup' changes, console log the change
    useEffect(() => {
        console.log('clientsetup changed', isClientSetup);
    }, [isClientSetup]);

    const handleSkip = async () => {
        console.log('handleSkip');
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
        navigate('/read', { state: {
            title: title,
            user: user
        } });
    }


    return (
        <Box className="background-container" style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
            <Header user={user} title={title} hasTitle={true} />
            <div id='main-container' style={{flexBasis: '70%', WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none'}}>
                <div id='greet-container'>
                    {isRecording && (
                        <Box id='recording-layer' style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 101 }}></Box>
                    )}
                    {isRecording && (
                        <div id='audio-visualizer' style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', zIndex: 101 }}>
                            <VoiceVisualizer 
                                controls={recorderControls} 
                                isControlPanelShown={false} 
                                barWidth={8}
                                gap={2}
                            />
                        </div>
                    )}
                
            
                    <Box id='greet-chat-window' className='chat-window' style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}>
                        
                        {chatHistory.length == 0 && (
                            <Box id='loading-box'>
                                <AiOutlineLoading id='loading-icon' size={40} color='#7AA2E3' />
                            </Box>
                        )}
                        {chatHistory.filter(msg => msg.type === 'message').map((msg, index) => (
                            msg.content[0].transcript !== '' && (
                            <Box key={index} id={msg.role === 'user' ? 'user-msg' : 'chatbot-msg'}>
                                {msg.role === 'user' ? (
                                    // if message is loading, add a loading icon
                                    <Box id="user-chat" style={{marginBottom: '25px', zIndex: 100}}>
                                        <Avatar id='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793', marginRight: "8px"}}>{user.substring(0, 2)}</Avatar>
                                        <Box id="msg-bubble" style={{ 
                                            backgroundColor: '#ECECEC',
                                            WebkitTouchCallout: 'none',
                                            WebkitUserSelect: 'none',
                                            userSelect: 'none'
                                        }}>
                                            {msg.content[0].transcript !== null ? (
                                                <h3 level='body-lg' style={{margin: '0px'}}>{msg.content[0].transcript}</h3>
                                            ) : (
                                                <AiOutlineLoading id='loading-icon' size={20} color='#7AA2E3' />
                                            )}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box id="chatbot-chat" style={{marginBottom: '25px', zIndex: 100}}>
                                        <Image id='chatbot-avatar' src='./files/imgs/penguin.svg'></Image>
                                        <Box id="msg-bubble" style={{ 
                                            position: 'relative',
                                            WebkitTouchCallout: 'none',
                                            WebkitUserSelect: 'none',
                                            userSelect: 'none'
                                        }} onClick={() => handleReplay(index)}>
                                            {!msg.content?.[0]?.transcript?.startsWith('<') && (
                                                <h3 level='body-lg' style={{margin: '0px', marginRight: '30px'}}>
                                                    {msg.content?.[0]?.transcript}
                                                </h3>
                                            )}
                                            {msg.status === 'completed' && !msg.content?.[0]?.transcript?.startsWith('<') && (
                                                <IconButton id='replay-btn' key={index} variant='plain' style={{ 
                                                    position: 'absolute', 
                                                    right: '8px', 
                                                    bottom: '8px', 
                                                }}>
                                                    {replayingIndex === index ? <FaCirclePause size={25} color='#2A2278' /> : <FaCirclePlay size={25} color='#2A2278' />}
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                                </Box>
                            )))}
                    </Box>
                    {canPushToTalk && !isEnding && (
                        <div id='recording-box'>
                            {/* only show these boxes when recording */}
                            {isRecording && (
                                <>
                                    <div id='recording-box-1' style={{width: 'calc(90% - 12px)'}} />
                                    <div id='recording-box-2' style={{width: '90%', left: '5%'}} />
                                </>
                            )}
                            <button id='chat-input' 
                                className='no-selection'
                                disabled={!isConnected || !canPushToTalk}
                                onMouseDown={startRecording}
                                onTouchStart={startRecording}
                                onPointerDown={startRecording}
                                onMouseUp={stopRecording}
                                onTouchEnd={stopRecording}
                                onPointerUp={stopRecording}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                    border: 'none',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#F4A011',
                                    position: 'relative',
                                    width: '90%',
                                    zIndex: 102
                                }}
                            >
                                {/* <FaMicrophone size={40} color='white'/> */}
                                {isRecording ? 
                                    <h4 style={{ color: 'white', fontSize: '40px', fontFamily: 'Cherry Bomb' }}>Talking...</h4>
                                : <div>
                                        <div style={{ width: '90%', height: '25%', backgroundColor: '#FFFFFF4D', position: 'absolute', top: '7px', left: '3%', borderRadius: '20px' }}></div>
                                        <img src='./files/imgs/ring.svg' alt='ring' style={{ width: '35px', height: '35px', position: 'absolute', top: '2px', right: '6px', borderRadius: '50%' }} />
                                        <h4 style={{ color: 'white', fontSize: '40px', fontFamily: 'Cherry Bomb' }}>Hold to talk!</h4>
                                </div>}
                            </button>
                        </div>
                    )}
                    <div id='moon-chat-box'>
                        <img src='./files/imgs/moon.svg' alt='moon' style={{ position: 'absolute', bottom: '0', right: '0', width: '70%', height: '70%', zIndex: 0}} />
                    </div> 
                </div>
            </div>
            <div id='bottom-box' style={{flexBasis: '0', justifyContent: 'flex-end', alignItems: 'flex-end'}}>
                <IconButton id='skip-btn' variant='plain' onClick={handleSkip} >
                    <FaRightFromBracket size={40} color='#FFFFFF' style={{marginRight: '10px', backgroundColor: 'transparent'}} />
                    <h2>Skip</h2>
                </IconButton>
            </div>
        </Box>
    );
};

export default GreetPage;
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress, Menu, List, ListItem, Slider, MenuButton, MenuList, MenuItem } from '@mui/joy';
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";
import { Button, Dropdown, Image } from 'react-bootstrap';
import { GiSpellBook } from "react-icons/gi";
import { AiOutlineLoading } from "react-icons/ai";
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index';
import Header from '../header';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { useSwipeable } from 'react-swipeable';
import { Modal, ModalDialog, ModalClose } from '@mui/joy';
import { AiOutlineShrink, AiOutlineExpand } from "react-icons/ai";
import { FaRegClosedCaptioning } from "react-icons/fa6";
import { FaPlay, FaPause } from "react-icons/fa";
import { FaMicrophone } from "react-icons/fa6";
import { FaCirclePlay } from "react-icons/fa6";
import { MdClose } from "react-icons/md";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";

let audio = new Audio();

const ReadChatPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state?.user || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [chatHistory, setChatHistory] = useState([]);
    const [knowledge, setKnowledge] = useState([]);
    const [isKnowledge, setIsKnowledge] = useState(false);
    const [isClientSetup, setIsClientSetup] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [canPushToTalk, setCanPushToTalk] = useState(true);
    const [realtimeEvents, setRealtimeEvents] = useState([]);
    const [items, setItems] = useState([]);
    const [memoryKv, setMemoryKv] = useState({});
    const [age, setAge] = useState(location.state?.age || '');
    const [interests, setInterests] = useState(location.state?.interest || '');
    const [showCaption, setShowCaption] = useState(true);
    const [isExpandedChat, setIsExpandedChat] = useState(false);
    const [chatBoxSize, setChatBoxSize] = useState({ width: 400, height: 300 });
    const [autoPage, setAutoPage] = useState(true);
    const [audioSpeed, setAudioSpeed] = useState(1);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isAsking, setIsAsking] = useState(false);
    const recorderControls = useVoiceVisualizer();

    const penguin = './files/imgs/penguin1.svg';
    
    const wavRecorderRef = useRef(
        new WavRecorder({ sampleRate: 24000 })
    );
    const wavStreamPlayerRef = useRef(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientRef = useRef(
        new RealtimeClient( { url: 'wss://storybook-reader.hailab.io:8766' } )
    );
    
    const [currentPage, setCurrentPage] = useState(() => {
        const savedPage = localStorage.getItem(`${title}-currentPage`);
        return savedPage ? parseInt(savedPage, 10) : 0;
    });
    const [audioPage, setAudioPage] = useState(() => {
        const savedPage = localStorage.getItem(`${title}-currentPage`);
        return savedPage ? parseInt(savedPage, 10) : 0;
    });

    const [currentSentence, setCurrentSentence] = useState(() => {
        const savedSentence = localStorage.getItem(`${title}-currentSentence`);
        return savedSentence ? parseInt(savedSentence, 10) : 0;
    });

    const [pages, setPages] = useState([]);
    
    let storyText = [];

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
        client.createResponse();
    };


    useEffect(() => {
        const loadStory = async () => {
            try {
                const response = await fetch(`/files/books/${title}/${title}_sentence_split.json`);
                storyText = await response.json();
                const loadedPages = Array.from({ length: storyText.length }, (_, index) => ({
                    image: `files/books/${title}/pages/page${index + 1}.jpg`,
                    text: storyText[index]
                }));
                setPages(loadedPages);
            } catch (error) {
                console.error('Error loading story:', error);
            }
        };

        loadStory();
    }, [title]);

    const togglePlayPause = () => {
        if (isPlaying) {
            audio.pause();
        } else {
            // if in a new page, play the new page audio
            // extract the page number between 'p' and 'sec': `/files/books/${title}/audio/p${currentPage}sec${sentenceIndex}.mp3`;
            if (audioPage !== currentPage) {
                audio.src = `/files/books/${title}/audio/p${currentPage}sec0.mp3`;
                setAudioPage(currentPage);
            }
            audio.play();
        }
        setIsPlaying(!isPlaying);
    };


    const playPageSentences = () => {
        if (pages[currentPage]?.text) {
            let sentenceIndex = 0;
            const playNextSentence = () => {
                // console.log(sentenceIndex, pages[currentPage].text.length);
                setAudioPage(currentPage);
                if (sentenceIndex < pages[currentPage].text.length) {
                    setCurrentSentence(sentenceIndex);
                    audio.src = `/files/books/${title}/audio/p${currentPage}sec${sentenceIndex}.mp3`;

                    audio.onended = () => {
                        // console.log('end');
                        sentenceIndex += 1;
                        playNextSentence();
                    };
                    setIsPlaying(true);
                    audio.play();
                } else {
                    // setIsPlaying(false);
                    if (currentPage in knowledge) {
                        setIsKnowledge(true);
                    } else {
                        setIsKnowledge(false);
                    }
                }
            };
            playNextSentence();
        }
    };
    
    useEffect(() => {
        if (pages.length > 0) {
            audio.pause();
            // setIsPlaying(false);
            if (isPlaying) {
                playPageSentences();  
            }
        }
    }, [pages, currentPage]);

    const handlePrevPage = async () => {
        console.log(currentPage);
        if (currentPage > 0) {
            audio.pause();
            //setIsPlaying(false);
            audio.currentTime = 0;
            setIsKnowledge(false);
            setIsAsking(false);
            setChatHistory([]);
            if (isClientSetup) {
                console.log('disconnecting conversation');
                // deleteConversationItem(items[0].id);
                await disconnectConversation();
                const client = clientRef.current;
                client.reset();
                setIsClientSetup(false);
            }
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
        }
    };

    const handleNextPage = async () => {
        console.log(currentPage);
        if (currentPage < pages.length - 1) {
            audio.pause();
            audio.currentTime = 0;
            // setIsPlaying(false);
            setIsKnowledge(false);
            setIsAsking(false);
            setChatHistory([]);
            if (isClientSetup) {
                console.log('disconnecting conversation');
                // deleteConversationItem(items[0].id);
                await disconnectConversation();
                const client = clientRef.current;
                client.reset();
                setIsClientSetup(false);
            }
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0  
        }
    };


    const instruction4Asking = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook and asking questions about it.

        Instructions:
        - Start by asking 'Hey ${user}, what do you want to know about this page?'
        - If you cannot recognize the child's answer in English, say, "I didn't hear your answer, can you say it again?"
        - You need to actively answer the child's questions and provide simple explanations to help them comprehend the story.

        **Important Reminders**:
            - Maintain concise responses: each should be no more than 25 words, using simple vocabulary.
            - Do not assume the child's response.
            - Do not ask questions.
            - Only recognize the child's answer in English.

        Essential Details:
        - **Story Title**: ${title}
        - **Story Text for Current Page**: ${pages[currentPage]?.text.join(' ')}
        `
    
    const instruction4Guiding = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Your dialogue will alternate with the child's, and you'll ask up to three questions per session. If the child shows good understanding, ask fewer questions.

            Instructions for the Conversation:
            1. ASK ONLY ONE QUESTION PER TURN. In your conversation, use declarative sentences all the way up and ONLY ASK ONE question at the end.
            2. Ensure your questions are age-appropriate and align with the child's interests. Use a friendly, conversational style, with simple and engaging language.
            3. Base each question on a "concept word" found in the story text, integrating external knowledge related to it. This helps enrich the child's learning experience.
            4. Start the conversation by saying something related to the story context, and then extend to external knowledge.
            5. After three rounds of questions, you should ask the children if they have any other questions. If not,end the conversation.

            Evaluation: 
            - Judge the correctness of the child's answers.
            - Provide friendly and encouraging feedback.
            - Explain the correct answer if needed.
            - If the dialogue continues, proceed to the next question.

            Guidelines for Responses:
            - If the child answers incorrectly, gently guide them to the right answer, encouraging them to think it through.
            - If you cannot recognize the child's answer in English, or no response is received, say, "I didn't hear your answer, can you say it again?"

            Essential Details:
            - **Story Title**: ${title}
            - **Story Text**: ${pages[currentPage]?.text.join(' ')}
            - **Concept Word**: ${knowledge[currentPage]?.keyword}
            - **External Knowledge**: ${knowledge[currentPage]?.knowledge}

            **Important Reminders**:
            - Maintain concise responses: each should be no more than 25 words, using simple vocabulary.
            - Ask only one question each turn to avoid confusion.
            - Avoid assuming the child's response.
            - Only ask and recognize the child's answer in English.
        `


    const updateClientInstruction = async (instruction) => {
        const client = clientRef.current;
        client.updateSession({ instructions: instruction });
        console.log(instruction);
    }

    const setupClient = async (instruction) => {
        console.log(instruction);
        (async () => {
            console.log('setting up client');
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            client.updateSession({ instructions: instruction });
            
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
            if (client.tools.length == 0) {
                client.addTool({
                    "name": "end_conversation",
                    "description": "Ends the conversation with the user",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "end": {
                                "type": "boolean",
                                "description": "Whether to end the conversation",
                            }
                        },
                        "required": ["end"]
                    }
                },
                async ({end}) => {
                    if (end) {
                        console.log('ending conversation');
                        setIsEnding(true);
                        // await disconnectConversation();
                    }
                });
            }
            // client.updateSession({
            //     turn_detection: { type: 'server_vad' }, // or 'server_vad'
            //     input_audio_transcription: { model: 'whisper-1' },
            // });
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
                if (delta?.transcript) {
                    setChatHistory(items);
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
                    setChatHistory(items);
                }
                if (items.s)
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
    };

    const handleEndChat = () => {
        setIsEnding(false);
        setIsClientSetup(false);
        handleNextPage();
    }

    useEffect(() => {
        const loadDictionary = async () => {
            try {
                const response = await fetch(`./files/books/${title}/${title}_knowledge_dict.json`);
                // console.log(`./files/books/${title}/${title} Gen.json`);
                // console.log('Response status:', response.status);
                const kg_dict = await response.json();
                console.log(kg_dict)
                setKnowledge(kg_dict);
            } catch (error) {
                console.error('Error loading dictionary:', error);
            }
        };
        loadDictionary();
    }, []);

    const handleCaptionToggle = () => {
        setShowCaption(!showCaption);
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (currentPage < pages.length - 1) {
                handleNextPage();
            }
        },
        onSwipedRight: () => {
            if (currentPage > 0) {
                handlePrevPage();
            }
        },
        preventDefaultTouchmoveEvent: true,
        trackMouse: true
    });

    const handleImageClick = (event) => {
        const { left, width, top, height } = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - left;
        const clickY = event.clientY - top;
    
        if (clickX < width / 2 && clickY > height / 3) {
            handlePrevPage();
        } else if (clickX > width / 2 && clickY > height / 3) {
            handleNextPage();
        }
    };

    const handleProgressBarClick = (event) => {
        const progressBar = event.currentTarget;
        const clickPosition = event.clientX - progressBar.getBoundingClientRect().left;
        const progressBarWidth = progressBar.offsetWidth;
        const clickRatio = clickPosition / progressBarWidth;
        const newPage = Math.floor(clickRatio * pages.length);
    
        if (newPage >= 0 && newPage < pages.length) {
            audio.pause();
            setIsKnowledge(false);
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage);
            localStorage.setItem(`${title}-currentSentence`, 0);
        }
    };

    const handleReplay = (index) => {
        console.log(index, chatHistory);
        let replayAudio = new Audio(chatHistory[index].formatted.file.url);
        replayAudio.play();
        setIsPlaying(true);
        replayAudio.onended = () => {
            setIsPlaying(false);
        };
    }

    const handleExpandChat = () => {
        setIsExpandedChat(!isExpandedChat);
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.height = isExpandedChat ? '50%' : '80%';
    }

    const handleAutoPageToggle = () => {
        setAutoPage((prev) => !prev);
    };

    const handleAudioSpeedChange = (event, newValue) => {
        setAudioSpeed(newValue);
    };


    useEffect(() => {
        audio.playbackRate = audioSpeed;
    }, [audioSpeed]);

    const handlePenguinClick = () => {
        audio.pause();
        setIsPlaying(false);
        setIsAsking(true);
        console.log('penguin clicked to ask question');
        if (!isClientSetup) {
            if (!isKnowledge) {
                setupClient(instruction4Asking);
            } else {
                setupClient(instruction4Guiding);
            }
            setIsClientSetup(true);
        } else {
            if (!isKnowledge) {
                updateClientInstruction(instruction4Asking);
            } else {
                updateClientInstruction(instruction4Guiding);
            }
        }
    }

    const handleCloseChat = async () => {
        setIsKnowledge(false);
        setIsAsking(false);
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
    }

    useEffect(() => {
        // Cleanup function to pause audio when component unmounts
        return () => {
            audio.pause();
            setIsPlaying(false);
        };
    }, []);


    return (
        <Box className="background-container">
            <Header user={user} title={title} hasTitle={true} />
            <div id='main-container'>
                <div id='book-container'>
                    <Box id='book-content'>
                        <IconButton
                        id="prev-btn"
                        variant='plain'
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                        sx={{ opacity: 0 }}
                    >
                        <MdArrowCircleLeft size={60} color='#7AA2E3'/>
                    </IconButton>

                    <Box id='book-img' {...swipeHandlers} onClick={handleImageClick}>
                        <div id='caption-btn-box'>
                            <IconButton variant='plain' onClick={handleCaptionToggle} style={{ zIndex: 1, color: 'white', fontSize: '30px' }}>
                                <FaRegClosedCaptioning />
                            </IconButton>
                        </div>
                        <div id='play-btn-box'>
                            <IconButton id='play-btn' variant='plain' onClick={togglePlayPause} style={{ zIndex: 1, color: 'white', fontSize: '25px' }}>
                                {isPlaying ? <FaPause /> : <FaPlay />}
                            </IconButton>
                        </div>
                        <img src={pages[currentPage]?.image} alt={`Page ${currentPage + 1}`}/>
                        {showCaption && <h4 id="caption" sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {/* <Button onClick={togglePlayPause} variant="contained" color="primary">
                                {isPlaying ? <FaPause /> : <FaPlay />}
                            </Button> */}
                            {pages[currentPage]?.text[currentSentence]}
                        </h4>}
                    </Box>

                    <IconButton
                        id="next-btn"
                        variant='plain'
                        onClick={handleNextPage}
                        disabled={currentPage === pages.length - 1}
                        sx={{ opacity: 0 }}
                        >
                        <MdArrowCircleRight size={60} color='#7AA2E3'/>
                    </IconButton>
                </Box>            
                <Box id='page-progress' display="flex" justifyContent="center" mt={2} gap="1rem">
                    <Box onClick={handleProgressBarClick} sx={{ cursor: 'pointer', width: '100%' }}>
                        <LinearProgress color="neutral" size="lg" determinate value={(currentPage + 1) / pages.length * 100} />
                    </Box>
                    <h4 style={{ marginLeft: '16px', fontSize: '20px', color: 'rgba(0,0,0,0.5)' }}>Page <span style={{ color: 'rgba(0,0,0,1)' }}>{currentPage + 1}</span> of {pages.length}</h4>
                </Box>
            </div>
            <div id='interaction-box'>
                {(!isKnowledge || !isAsking) && 
                    <div className='penguin-message'>
                        { isKnowledge ? 'I want to talk something about this page!' : 'Click me to ask anything you want about the story!'}
                    </div>
                }
                <div id='penguin-box' onClick={handlePenguinClick}>
                    <Image id='penguin' src={penguin} style={{ width: '96px', height: '96px' }}></Image>
                    <h4 style={{ fontFamily: 'BM JUA', fontSize: '20px' }}>Sparky✨</h4>
                </div>
            </div>
            {(isAsking) && (
                    <Box id='chat-container' sx={{ position: 'absolute', width: chatBoxSize.width, height: chatBoxSize.height }}>
                        {/* if is recording, add a black layer on top of chat-window, if isn't recording, remove the layer */}
                        {isRecording && (
                            <Box id='recording-layer' style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1 }}></Box>
                        )}
                        {isRecording && (
                            <div id='audio-visualizer' style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', zIndex: 1 }}>
                                <VoiceVisualizer 
                                    controls={recorderControls} 
                                    isControlPanelShown={false} 
                                    barWidth={8}
                                    gap={2}
                                />
                            </div>
                        )}
                        <IconButton id='expand-btn' variant='plain' 
                                onClick={handleExpandChat}
                                sx={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    zIndex: 1
                                }}
                            >
                            {isExpandedChat ? <AiOutlineShrink size={20} color='#7AA2E3' /> : <AiOutlineExpand size={20} color='#7AA2E3' />}
                        </IconButton>
                        <IconButton
                            onClick={handleCloseChat}
                            sx={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                zIndex: 1
                            }}
                        >
                            {/* add a close icon */}
                            <MdClose size={20} color='#7AA2E3' />
                        </IconButton>
                    <Box id='chat-window'>
                        
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
                                    <Box id="user-chat">
                                        <Avatar id='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793', marginRight: "8px"}}>{user.substring(0, 2)}</Avatar>
                                        <Box id="msg-bubble" style={{ backgroundColor: '#ECECEC' }}>
                                            {msg.content[0].transcript !== null ? (
                                                <h5 level='body-lg' style={{margin: '0px'}}>{msg.content[0].transcript}</h5>
                                            ) : (
                                                <AiOutlineLoading id='loading-icon' size={20} color='#7AA2E3' />
                                            )}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box id="chatbot-chat">
                                        <Image id='chatbot-avatar' src={penguin}></Image>
                                        <Box id="msg-bubble" style={{ position: 'relative' }} >
                                            <h5 level='body-lg' style={{margin: '0px', marginRight: '30px'}}>
                                                {msg.content[0].transcript}
                                            </h5>
                                            {msg.status === 'completed' && (
                                                <IconButton variant='plain' onClick={() => handleReplay(index)} style={{ 
                                                    position: 'absolute', 
                                                    right: '8px', 
                                                    bottom: '8px', 
                                                }}>
                                                    <FaCirclePlay size={25} color='#7AA2E3' />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                )}
                                </Box>
                            )))}
                    </Box>
                    {canPushToTalk && !isEnding && (
                        <button id='chat-input' 
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
                                backgroundColor: isRecording ? '#F6BF45' : '#1ECDD1',
                                zIndex: 100
                            }}
                        >
                            <FaMicrophone size={40} color='white'/>

                        </button>
                    )}
                    {isEnding && (
                        <Box id='chat-input'>
                            <Box id='chat-end' onClick={handleEndChat}>
                                <IconButton id='to-chatread-btn' >
                                    <GiSpellBook size={40} color='#7AA2E3' />
                                </IconButton>
                                <h4 id='voice-input-text'>Let's start reading and chatting!</h4>
                            </Box>
                        </Box>
                    )}          
                </Box>
            )}
            </div>
        </Box>
    );
};

export default ReadChatPage;

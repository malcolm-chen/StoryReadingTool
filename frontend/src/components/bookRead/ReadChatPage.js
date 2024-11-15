import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress } from '@mui/joy';
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";
import { Button, Image } from 'react-bootstrap';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { GiSpellBook } from "react-icons/gi";
import { FcNext } from "react-icons/fc";
import { BsFillSendFill } from "react-icons/bs";
import { RiChatVoiceFill } from "react-icons/ri";
import { IoLibrary } from "react-icons/io5";
import { MdChromeReaderMode } from "react-icons/md";
import { FaRecordVinyl } from "react-icons/fa";

import { FaBook } from "react-icons/fa";
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index';
import Header from '../header';
import { RealtimeClient } from '@openai/realtime-api-beta';

const client = new RealtimeClient({ url: 'ws://localhost:8765' });
let audio = new Audio();

const ReadChatPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state?.user || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [isFinished, setIsFinished] = useState(false);
    const [chatHistory, setChatHistory] = useState([]);
    const [audioData, setAudioData] = useState([]);
    const [userInput, setUserInput] = useState('');
    const [chatRound, setChatRound] = useState(0);
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

    console.log(age, interests);
    
    const penguin = './files/imgs/penguin1.svg';
    
    const wavRecorderRef = useRef(
        new WavRecorder({ sampleRate: 24000 })
    );
    const wavStreamPlayerRef = useRef(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientRef = useRef(
        new RealtimeClient( { url: 'ws://localhost:8765' } )
    );
    
    const [currentPage, setCurrentPage] = useState(() => {
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

    const playPageSentences = () => {
        if (pages[currentPage]?.text) {
            let sentenceIndex = 0;
            const playNextSentence = () => {
                console.log(sentenceIndex, pages[currentPage].text.length);
                if (sentenceIndex < pages[currentPage].text.length) {
                    setCurrentSentence(sentenceIndex);
                    audio.src = `/files/books/${title}/audio/p${currentPage}sec${sentenceIndex}.mp3`;

                    audio.onended = () => {
                        console.log('end');
                        sentenceIndex += 1;
                        playNextSentence();
                    };
                    audio.play();
                } else {
                    console.log('this page ends and isKnowledge is', isKnowledge);
                    if (currentPage in knowledge) {
                        console.log('currentPage has knowledge', currentPage);
                        setIsKnowledge(true);
                        if (!isClientSetup) {
                            setupClient();
                            setIsClientSetup(true);
                        } else {
                            updateClientInstruction();
                        }
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
            playPageSentences();  
        }
    }, [pages, currentPage]);

    const handleReplay = () => {
        audio.pause();
        setCurrentSentence(0);
        playPageSentences();
    };

    const handlePrevPage = () => {
        console.log(currentPage);
        if (currentPage > 0) {
            audio.pause();
            audio.currentTime = 0;
            setIsKnowledge(false);
            if (isClientSetup) {
                disconnectConversation();
                setIsClientSetup(false);
            }
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
        }
    };

    const handleNextPage = () => {
        console.log(currentPage);
        if (currentPage < pages.length - 1) {
            audio.pause();
            audio.currentTime = 0;
            setIsKnowledge(false);
            if (isClientSetup) {
                disconnectConversation();
                setIsClientSetup(false);
            }
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0  
        }
    };

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


    const updateClientInstruction = async () => {
        client.updateSession({ instructions: `
            You are a friendly chatbot interacting with a 6-8-year-old child reading a storybook with a 6-8-year-old child. You and the child will take turns in dialogue, with you posing one question per round, for a total of no more than three questions. If the child demonstrates a good understanding of the material, reduce the number of questions.
            You need to initiate the conversation by asking the first question.
            Your questions should match the child's age, with a friendly, conversational style. Use simple, easy-to-understand language that is lively and interesting. Make your questions natural, so the child doesn't feel like they are completing a task.

            There will be a concept word in the story text, and the concept word is associated with a piece of external science knowledge.
            The generated questions should be based on the concept word in the story text and associated with external science knowledge.
            The generated questions should contain the associated external science knowledge to enrich the child's science knowledge.
            The generated question series should follow the performance expectation of preschoolers.
            The generated question series should be based on the story text, concept word, knowledge, and the performance expectation I provide.

            Your reply should include: 1) Judge the correctness of the answer, 2) Provide friendly, encouraging feedback, 3) Provide an explanation of the answer to the previous question, 4) If the dialogue is not over, move on to the next question. 
            If the child answers incorrectly, use guiding them step by step to think prompt children thinking. 
            If the child does not respond, you can simply reply with "It's okay, let's think together" and explain, or "I didn't hear your answer, can you say it again?" and repeat the question.
            Keep your responses concise, with each part not exceeding 15 words, and try to use simple vocabulary.

            Here is the story text: ${knowledge[currentPage]?.section_text}
            Here is the concept word: ${knowledge[currentPage]?.keyword}
            Here is the associated external science knowledge: ${knowledge[currentPage]?.knowledge}
        ` });
    }

    const setupClient = async () => {
        (async () => {
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            client.updateSession({ instructions: `
                You are a friendly chatbot interacting with a 6-8-year-old child reading a storybook with a 6-8-year-old child. You and the child will take turns in dialogue, with you posing one question per round, for a total of no more than three questions. If the child demonstrates a good understanding of the material, reduce the number of questions.
                The child is called ${user}.
                The child's age is ${age}.
                The child's interests are ${interests}.

                You need to initiate the conversation by asking the first question.
                Your questions should match the child's age and interests, with a friendly, conversational style. Use simple, easy-to-understand language that is lively and interesting. Make your questions natural, so the child doesn't feel like they are completing a task.
    
                There will be a concept word in the story text, and the concept word is associated with a piece of external knowledge.
                For each round, only include ONE question so it will not confuse the child.
                
                The generated question series should be based on the concept word in the story text and associated with external knowledge.
                The generated question series should contain the associated external knowledge to enrich the child's knowledge.
                The generated question series should follow the performance expectation of preschoolers.
                The generated question series should be based on the story text, concept word, knowledge, and the performance expectation I provide.
    
                Your reply should include: 1) Judge the correctness of the answer, 2) Provide friendly, encouraging feedback, 3) Provide an explanation of the answer to the previous question, 4) If the dialogue is not over, move on to the next question. 
                If the child answers incorrectly, use guiding them step by step to think prompt children thinking. 
                If the child does not respond, you can simply reply with "It's okay, let's think together" and explain, or "I didn't hear your answer, can you say it again?" and repeat the question.
                Keep your responses concise, with each part not exceeding 15 words, and try to use simple vocabulary.
    
                Here is the story text: ${knowledge[currentPage]?.section_text}
                Here is the concept word: ${knowledge[currentPage]?.keyword}
                Here is the associated external science knowledge: ${knowledge[currentPage]?.knowledge}
            ` });
            
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
            client.addTool({
                "name": "end_conversation",
                "description": "Ends the conversation with the user",
                "parameters": {
                    "type": "object",
                    "properties": {
                        end: {
                            type: "boolean",
                            description: "Whether to end the conversation",
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
                console.log(items);
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


    return (
        <Box className="background-container">
            <Header user={user} />
            <Breadcrumbs className='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                <Link href='/select' onClick={handleLinkSelect} ><IoLibrary /> Library</Link>
                <Link href='/mode' onClick={handleLinkMode} ><MdChromeReaderMode /> Mode Select</Link>
                <Typography><FaBook /> {title}</Typography>
            </Breadcrumbs>
            <Box className='main-content' id='chat-main-content'>
                <Box id='book-container'>
                    <h3 className="title">{title}</h3>
                    <Box id="book-box" mt={4}>
                        <Box id='book-content' mt={4}>
                            <Typography id="caption" level='h4' sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                {pages[currentPage]?.text[currentSentence]}
                                <IconButton variant='plain' onClick={handleReplay}><MdOutlineReplayCircleFilled size={30} color='#7AA2E3' /></IconButton>
                            </Typography>
                            <Box id='book-img'>
                                <IconButton id="prev-btn-chat" variant='plain' onClick={handlePrevPage} disabled={currentPage === 0}>
                                    <MdArrowCircleLeft size={60} color='#7AA2E3'/>
                                </IconButton>
                                <img src={pages[currentPage]?.image} alt={`Page ${currentPage + 1}`}/>
                                <IconButton id="next-btn-chat" variant='plain' onClick={handleNextPage} disabled={currentPage === pages.length - 1}>
                                    <MdArrowCircleRight size={60} color='#7AA2E3'/>
                                </IconButton>
                            </Box>
                        </Box>            
                    </Box>
                    <Box id='page-progress' display="flex" justifyContent="center" mt={2} gap="1rem">
                        <Typography level="h4">Page {currentPage + 1} of {pages.length}</Typography>
                        <LinearProgress determinate value={ (currentPage + 1) / pages.length * 100} />
                    </Box>
                </Box>
                {isKnowledge && (
                    <Box id='chat-container'>
                        <Box id='chat-window'>
                            {chatHistory.map((msg, index) => (
                                <Box key={index} id={msg.role === 'user' ? 'user-msg' : 'chatbot-msg'}>
                                    {msg.role === 'user' ? (
                                        <Box id="user-chat">
                                            <Avatar id='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793', marginRight: "1vw"}}>{'U'.substring(0, 2)}</Avatar>
                                            <Box id="msg-bubble">
                                                <Typography level='body-lg'>{msg.formatted.transcript}</Typography>
                                            </Box>
                                        </Box>
                                    ) : (
                                        <Box id="chatbot-chat">
                                            <Image id='chatbot-avatar' src={penguin}></Image>
                                            <Box id="msg-bubble">
                                                <Typography level='body-lg'>{msg.formatted.transcript}</Typography>
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            ))}
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
                            }}
                            >
                            {isRecording && (
                                <FaRecordVinyl size={40} color='#7AA2E3' style={{marginRight: "2vw"}} />
                            )}
                            {!isRecording && (
                                <RiChatVoiceFill size={40} color='#7AA2E3' style={{marginRight: "2vw"}} />
                            )}
                            <Typography id='voice-input-text' level='h4'>{isRecording ? 'release to send' : 'push to talk'}</Typography>
                        
                            </button>
                        )}
                        {isEnding && (
                            <Box id='chat-input'>
                                <Box id='chat-end' onClick={handleEndChat}>
                                    <IconButton id='to-chatread-btn' >
                                        <GiSpellBook size={40} color='#7AA2E3' />
                                    </IconButton>
                                    <Typography id='voice-input-text' level='h4'>Let's start reading and chatting!</Typography>
                                </Box>
                            </Box>
                        )}          
                    </Box>
                )}
            </Box>
        </Box>
    );
};

export default ReadChatPage;

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
import { FaPlay, FaPause, FaCirclePlay, FaCirclePause } from "react-icons/fa6";
import { FaChevronCircleUp, FaChevronCircleDown, FaMinusCircle } from "react-icons/fa";
import { IoMdCloseCircle } from "react-icons/io";
import { FaMicrophone } from "react-icons/fa6";
import { RiSpeedUpFill } from "react-icons/ri";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";
// let currentPage = 0;
// let sentenceIndex = 0;
const apiUrl = process.env.REACT_APP_API_URL;

const ReadChatPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = localStorage.getItem('username') || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    // const [chatHistory, setChatHistory] = useState([]);
    const [isKnowledge, setIsKnowledge] = useState(false);
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
    const [age, setAge] = useState(location.state?.age || '');
    const [interests, setInterests] = useState(location.state?.interest || '');
    const [showCaption, setShowCaption] = useState(true);
    const [isExpandedChat, setIsExpandedChat] = useState(false);
    const [isMinimizedChat, setIsMinimizedChat] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(localStorage.getItem(`${title}-audioSpeed`) ? parseFloat(localStorage.getItem(`${title}-audioSpeed`)) : 1);
    const [chatBoxSize, setChatBoxSize] = useState({ width: 400, height: 300 });
    const [autoPage, setAutoPage] = useState(true);
    const [isPlaying, setIsPlaying] = useState(true);
    const [replayingIndex, setReplayingIndex] = useState(null);
    // const [isAsking, setIsAsking] = useState(false);
    const [isAsked, setIsAsked] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    const recorderControls = useVoiceVisualizer();
    const [itemToDelete, setItemToDelete] = useState(null);
    const [timer, setTimer] = useState(0);
    const [answerRecord, setAnswerRecord] = useState([]);
    const [currentPageChatHistory, setCurrentPageChatHistory] = useState([]);
    const [isShaking, setIsShaking] = useState(false);
    const timerRef = useRef(null);
    const isStartingRecordingRef = useRef(false);
    const resendFlagRef = useRef(false);
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
    const storyTextRef = useRef([]);
    const currentPageRef = useRef(localStorage.getItem(`${title}-currentPage`) ? parseInt(localStorage.getItem(`${title}-currentPage`), 10) : 0);
    const sentenceIndexRef = useRef(0);
    const askedQuestionsRef = useRef({});
    const knowledgeRef = useRef([]);
    const isWaitingForResponseRef = useRef(false);
    const userRespondedRef = useRef(false);
    const chatHistoryRef = useRef([]);
    const isAskingRef = useRef(false);
    const isReplayingRef = useRef(false);
    const noReponseCntRef = useRef(0);
    const [regenerateIndex, setRegenerateIndex] = useState(null);
    const itemToRespondRef = useRef(null);
    const deletedItemsRef = useRef(new Set());
    const isWaitingForEvaluationRef = useRef(false);

    useEffect(() => {
        console.log('chatHistoryRef', chatHistoryRef.current);
    }, [chatHistoryRef.current]);


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
    // const [currentPage, setCurrentPage] = useState(() => {
    //     const savedPage = localStorage.getItem(`${title}-currentPage`);
    //     console.log('savedPage', savedPage);
    //     return savedPage ? parseInt(savedPage, 10) : 0;
    // });

    const [audioPage, setAudioPage] = useState(() => {
        const savedPage = localStorage.getItem(`${title}-currentPage`);
        return savedPage ? parseInt(savedPage, 10) : 0;
    });

    const [currentSentence, setCurrentSentence] = useState(() => {
        const savedSentence = localStorage.getItem(`${title}-currentSentence`);
        return savedSentence ? parseInt(savedSentence, 10) : 0;
    });

    const [pages, setPages] = useState([]);

    const loadAskedQuestions = async () => {
        // fetch the asked questions from the database
        console.log('loading asked questions');
        const response = await fetch(`${apiUrl}/api/get_asked_questions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user: user,
                title: title,
                page: currentPageRef.current
            })
        });
        const askedQuestions = await response.json();
        console.log('asked questions', askedQuestions);
        askedQuestionsRef.current = Object.values(askedQuestions);
        console.log('askedQuestionsRef.current', askedQuestionsRef.current);
        // check if askedQuestions is empty, or each list in askedQuestions is empty
        if (askedQuestionsRef.current.length === 0 || (askedQuestionsRef.current.every(list => list.length === 0))) {
            console.log('setting isFirstTime to true');
            setIsFirstTime(true);
        }
        // setIsFirstTime(true);
    }

    useEffect(() => {
        const loadDictionary = async () => {
            try {
                console.log('loading dictionary');
                const response = await fetch(`./files/books/${title}/${title}_knowledge_dict.json`);
                // console.log(`./files/books/${title}/${title} Gen.json`);
                // console.log('Response status:', response.status);
                const kg_dict = await response.json();
                console.log(kg_dict)
                knowledgeRef.current = kg_dict;
            } catch (error) {
                console.error('Error loading dictionary:', error);
            }
        };
        const loadStory = async () => {
            try {
                console.log('loading story');
                const response = await fetch(`/files/books/${title}/${title}_sentence_split.json`);
                const storyText = await response.json();
                storyTextRef.current = storyText;
                const loadedPages = Array.from({ length: storyText.length }, (_, index) => ({
                    image: `files/books/${title}/pages/page${index}.png`,
                    text: storyText[index]
                }));
                setPages(loadedPages);
                // initialize chatHistoryRef
                chatHistoryRef.current = Array.from({ length: loadedPages.length }, () => []);
            } catch (error) {
                console.error('Error loading story:', error);
            }
        };
        loadStory();
        loadDictionary();
        // loadAskedQuestions();
        audioRef.current.play();
        audioRef.current.playbackRate = audioSpeed;
    }, []);

    // useEffect(() => {
    //     console.log('isFirstTime', isFirstTime);
    //     if (isFirstTime) {
    //         audioRef.current.pause();
    //         setIsPlaying(false);
    //         setTimeout(() => {
    //             // setIsFirstTime(false);
    //             console.log('isAsking', isAskingRef.current);
    //             console.log('isKnowledge', isKnowledge);
    //             if (!isAskingRef.current && !isKnowledge) {
    //                 audioRef.current.play();
    //                 audioRef.current.playbackRate = audioSpeed;
    //                 setIsPlaying(true);
    //             }
    //         }, 5000);
    //     }
    // }, [isFirstTime]);

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

        deletedItemsRef.current.clear();
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
        if (isStartingRecordingRef.current || isRecording) {
            return;
        }
        isStartingRecordingRef.current = true;
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
        isStartingRecordingRef.current = false;
    };

    /**
     * In push-to-talk mode, stop recording
     */
    const stopRecording = async () => {
        if (!isRecording) {
            return;
        }
        setIsRecording(false);
        isStartingRecordingRef.current = false;
        const client = clientRef.current;
        const wavRecorder = wavRecorderRef.current;
        await wavRecorder.pause();
        recorderControls.stopRecording();
        console.log('stop recording');
        if (isKnowledge) {
            client.realtime.send('input_audio_buffer.commit');
            client.conversation.queueInputAudio(client.inputAudioBuffer);
            client.inputAudioBuffer = new Int16Array(0);
            await client.realtime.send('response.create', {
                response: {
                    "modalities": ["text", "audio"],
                    "instructions": getInstruction4Evaluation(items),
                }
            });
            isWaitingForEvaluationRef.current = true;
        } 
        // else {
        //     client.createResponse();
        // }
    };

    const togglePlayPause = () => {
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            // if in a new page, play the new page audio
            // extract the page number between 'p' and 'sec': `/files/books/${title}/audio/p${currentPage}sec${sentenceIndex}.mp3`;
            if (audioPage !== currentPageRef.current) {
                audioRef.current.src = `/files/books/${title}/audio/p${currentPageRef.current}sec0.mp3`;
                setAudioPage(currentPageRef.current);
            }
            audioRef.current.play();
            audioRef.current.playbackRate = audioSpeed;
        }
        setIsPlaying(!isPlaying);
    };


    const playPageSentences = () => {
        if (pages[currentPageRef.current]?.text) {
            sentenceIndexRef.current = 0;
            const audio = audioRef.current;
            const playNextSentence = async () => {
                setAudioPage(currentPageRef.current);
                if (sentenceIndexRef.current < pages[currentPageRef.current].text.length) {
                    setCurrentSentence(sentenceIndexRef.current);
                    audio.src = `/files/books/${title}/audio/p${currentPageRef.current}sec${sentenceIndexRef.current}.mp3`;

                    audio.onended = () => {
                        // console.log('end');
                        sentenceIndexRef.current += 1;
                        playNextSentence();
                    };
                    try {
                        await audio.play();
                        audio.playbackRate = audioSpeed;
                        setIsPlaying(true);
                    } catch (error) {
                        console.error('Error playing audio:', error);
                    }
                } else {
                    // setIsPlaying(false);
                    if (currentPageRef.current in knowledgeRef.current) {
                        console.log('currentPage in knowledge', currentPageRef.current);
                        setIsKnowledge(true);
                        audio.pause();
                        setIsPlaying(false);
                        setIsConversationEnded(false);
                        setAnswerRecord([]);
                        noReponseCntRef.current = 0;
                        setCurrentPageChatHistory([]);
                        // check if the client is not setup for guiding
                        if (!clientRef.current.realtime.isConnected()) {
                            console.log('setting up client for guiding');
                            setupClient(await getInstruction4Guiding());
                            setIsClientSetup(true);
                        } else {
                            console.log('resetting client for guiding');
                            updateClientInstruction(await getInstruction4Guiding());
                        }
                    } else if (currentPageRef.current === 6 && title === 'Why Frogs are Wet') { 
                        setIsKnowledge(false);

                        // wait for 2 seconds, if the user does not click the next page button, move to the next page
                        setTimeout(() => {
                            if (!clientRef.current.realtime.isConnected()) {
                                handleNextPage();
                            }
                        }, 3000);
                    }
                    else {
                        setIsKnowledge(false);
                        if (currentPageRef.current < pages.length - 1) {
                            handleNextPage();
                        } else {
                            audioRef.current.pause();
                            setIsPlaying(false);
                        }
                    }
                }
            };
            playNextSentence();
        }
    };
    
    useEffect(() => {
        console.log('playPageSentences', currentPageRef.current, sentenceIndexRef.current, knowledgeRef.current.length);
        if (pages.length > 0) {
            // audioRef.current.pause();
            // setIsPlaying(false);
            if (isPlaying && !isFirstTime) {
                console.log('playing page sentences', currentPageRef.current);
                playPageSentences();  
            }
        }
    }, [pages]);

    const handlePrevPage = async () => {
        console.log('moving to previous page', currentPageRef.current);
        if (currentPageRef.current > 0) {
            audioRef.current.pause();
            //setIsPlaying(false);
            audioRef.current.currentTime = 0;
            setIsKnowledge(false);
            // setIsAsking(false);
            isAskingRef.current = false;
            setIsAsked(false);
            setIsMinimizedChat(false);
            setIsExpandedChat(false);
            setAnswerRecord([]);
            noReponseCntRef.current = 0;
            // setChatHistory([]);
            isWaitingForResponseRef.current = false;
            if (clientRef.current.realtime.isConnected()) {
                console.log('disconnecting conversation');
                // deleteConversationItem(items[0].id);
                await disconnectConversation();
                const client = clientRef.current;
                client.reset();
                setIsClientSetup(false);
            }
            const newPage = currentPageRef.current - 1;
            //setCurrentPage(newPage);
            currentPageRef.current = newPage;
            sentenceIndexRef.current = 0;
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
            playPageSentences();  
        }
    };

    const handleNextPage = async () => {
        console.log('moving to next page', currentPageRef.current);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // setIsPlaying(false);
        setIsKnowledge(false);
        // setIsAsking(false);
        isAskingRef.current = false;
        setIsAsked(false);
        setIsMinimizedChat(false);
        setIsExpandedChat(false);
        setAnswerRecord([]);
        noReponseCntRef.current = 0;
        // setChatHistory([]);
        isWaitingForResponseRef.current = false;
        if (clientRef.current.realtime.isConnected()) {
            console.log('disconnecting conversation');
            // deleteConversationItem(items[0].id);
            await disconnectConversation();
            const client = clientRef.current;
            client.reset();
            setIsClientSetup(false);
        }
        const newPage = ( currentPageRef.current + 1 ) % pages.length;
        // setCurrentPage(newPage);
        currentPageRef.current = newPage;
        setCurrentSentence(0);
        sentenceIndexRef.current = 0;
        localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
        localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0  
        playPageSentences();  
    };

    const getFirstQuestion = async () => {
        const firstQuestionSet = knowledgeRef.current[currentPageRef.current]?.first_question_set;
        console.log('firstQuestionSet', firstQuestionSet);
        console.log('asked question', askedQuestionsRef.current[currentPageRef.current]);
        if (firstQuestionSet?.length <= askedQuestionsRef.current[currentPageRef.current]?.length) {
            console.log('all questions have been asked, now asking: ', firstQuestionSet[Math.floor(Math.random() * firstQuestionSet.length)]);
            return firstQuestionSet[Math.floor(Math.random() * firstQuestionSet.length)];
        }
        if (Array.isArray(firstQuestionSet)) {
            for (const question of firstQuestionSet) {
                if (!askedQuestionsRef.current[currentPageRef.current]?.includes(question)) {
                    // send to backend to save the question
                    console.log('saving question', question);
                    const response = await fetch(`${apiUrl}/api/save_asked_question`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            user: user,
                            title: title,
                            page: currentPageRef.current,
                            question: question
                        })
                    });
                    console.log('response', response);
                    return question;
                }
            }
        }
        return "No questions available"; // Default message if firstQuestionSet is not an array
    }

    function getInstruction4Frogs() {
        const instruction4Frogs = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook about frogs. 
        This page illustrates different types of frogs. Your task is to answer the child's questions about the frogs.
        
        Here are the frogs information on this page:
        - Arum Frog: 
            information to identify the frog: the light yellow frog on the left side of the page
            location: Southern Africa, 
            fact about this frog: This frog is ivory when the ivory swamp lilies are in bloom. The rest of the year it is brown with silvery stripes along its sides.
        - Blue Poison Dart Frog: 
            information to identify the frog: the blue frog on the top of the page
            location: Surinam, 
            fact about this frog: The male carries the eggs and tadpoles on his back until they are well developed.
        - Common Gray Tree Frog: 
            information to identify the frog: the big gray frog on the left page
            location: North America, 
            fact about this frog: This frog changes color according to its mood. It may be gray, green, or brown.
        - Glass Frog: 
            information to identify the frog: the yellow frog on the top of the page
            location: Costa Rica, 
            fact about this frog: These frogs are transparent underneath.
        - White's Tree Frog: 
            information to identify the frog: the big green frog on the left page
            location: Australia, 
            fact about this frog: This frog is often found in people's bathrooms.
        - Darwin's Frog: 
            information to identify the frog: the big green frog on the right page
            location: Chile, 
            fact about this frog: This frog is floats upside down in the water to imitate a fallen leaf.
        - Poison Dart Frog: 
            information to identify the frog: the small yellow frog on the right page
            location: Colombia, 
            fact about this frog: This is the most poisonous frog in the world.
        - Painted Reed Frog: 
            information to identify the frog: the red frog covered in stripes on the right page
            location: Tanzania to South Africa, 
            fact about this frog: During warm months hundreds of these frogs call with a series of shrill whistles.
        - Tomato Frog: 
            information to identify the frog: the big red frog on the right page
            location: Madagascar, 
            fact about this frog: The tomato frog spends most of the year in hiding, but comes out during spring rains.
        - Asian Horned Frog: 
            information to identify the frog: the big brown frog on the right page
            location: Southern Asia, 
            fact about this frog: This frog looks like a brown leaf on the forest floor.
        
        **Instructions for the Conversation**:
        When the child asks about a frog, you need to provide the frog's name, its location, and a fact about it. Introduce the frog in a interesting and engaging way.
        - Start by asking 'Hey ${user}, what do you want to know about this page?' Do not say anything else.
        - If you cannot identify which frog on this page the child is asking about, you can ask 'Which frog are you asking about?', and add some features for them to choose, like 'The light yellow frog on the left or the yellow one on the top?'
        - Only introduce one frog at a time. Keep your response concise and under 25 words.
        - Do not use questions like 'Do you know that?', 'Can you spot it?'. 
        - Unless you are ending the conversation, ends each round of conversation with a friendly line like 'Is there anything else you want to know about this page?' (the last sentence need to be a question)
        - You should not ask questions unless you are asking 'Is there anything else you want to know about this page?'
        - If the child does not have any questions, you can say 'It was fun chatting with you! Let's keep reading.'
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `;
        return instruction4Frogs;
    }


    function getInstruction4Evaluation(items) {
        const instruction4Evaluation = `
        You need to evaluate the child's response to the main question.
        
        **Instructions for Evaluation**:
        You need to evaluate the child's response based on the following inputs:
        - Conversation History: ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')}
        - Child's Latest Response: The most recent input from the child.
        - Story Context: ${pages[currentPageRef.current]?.text.join(' ')}
        - Main Question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - Answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        
        **Steps for Evaluation**:
        Step 1: Check Response Validity
        If the response is empty, cannot be recognized due to noise, is too short, or sent by mistake, mark it as "invalid".
       
        Step 2: Check the status of the conversation
        If the assistant has asked a question like 'Do you have any questions about this page?', and the child does not have any questions, mark it as "conv end".
        If the child asks more than one question, also mark it as "conv end".
        
        Step 3: Check if the child asks a question
        As long as the child asks a question, no matter if it is off-topic or not, mark it as "child asks question".
        
        Step 4: Evaluate Valid Responses
        For responses that contain meaningful content, and the conversation is not ended, use the following criteria:
        *Main Question*: ${knowledgeRef.current[currentPageRef.current]?.question}
        *Answer*: ${knowledgeRef.current[currentPageRef.current]?.answer}
        
        When evaluating a child's response, do not focus solely on the current round of QA. Instead, consider both the child's previous responses on this page and their latest response to determine whether they accurately address the main question. The evaluation should take into account all of the child's responses to determine whether they collectively form the most accurate answer to the main question.
        - Perfect answer: The response is fully accurate, and directly aligns with the provided answer. 
        - Correct but incomplete answer: The response is accurate but lacks the details needed to fully represent the most precise and complete answer. 
        - Factually incorrect answer: The response contains incorrect information
        - Irrelevant response: The response is unrelated to the question or the story context.
        - Uncertainty answer: The response indicates that the child is unsure such as "I don't know" or "I am not sure". 
                    
        **Response Format**:
        Precede each evaluation with the tag <eval>. Do not include any other text apart from the tag and evaluation. 
        Below are the examples of your output, reply with one of these only:
        - <eval>invalid</eval>
        - <eval>conv end</eval>
        - <eval>child asks question</eval>
        - <eval>perfect</eval>
        - <eval>correct but incomplete</eval>
        - <eval>factually incorrect</eval>
        - <eval>irrelevant response</eval>
        - <eval>uncertainty</eval>
        `;
        console.log(instruction4Evaluation);
        return instruction4Evaluation;
    }

    // update the instruction4Guiding when the currentPageRef.current changes   
    async function getInstruction4Guiding() {
        const instruction4Guiding = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Your task is to initiate an interactive conversation based on the story information and instructions.
        Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        
        **Story Information**:
        - Story Title: ${title}
        - Story Text: ${pages[currentPageRef.current]?.text.join(' ')}
        - First Question: ${knowledgeRef.current[currentPageRef.current]?.question}

        **Instructions for initiating the Conversation**:
            Begin the interaction by posing the question, which will guide to the concept word.
            You should use different ways to open the conversation. For example: "Hmm, this part of the story is so interesting!" + first question; "Hey xxx, share with me what you think" + first question; "xxx, let's chat about what you just read!" + first question; etc. 
            Do NOT ask the first question in the form of yes/no question (BAD Example: "Can you tell me xxx?", or "Do you know xxx?").
        `;
        
        console.log(instruction4Guiding);
        return instruction4Guiding;
    }

    const getInstruction4Perfect = (items, evaluation) => {
        const instruction4Perfect = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        4. the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        5. the evaluation of the child's latest response: ${evaluation};

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. conclusion.
    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history.
        - Since the evaluation of the child's response is 'perfect', you should acknowledge their answer and tailor your acknowledgment to the context (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!", and other similar acknowledgments)

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging, and under 20 words.
        - Since the evaluation of the child's response is 'perfect', provide a concise explanation to deepen their understanding.

    **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "Do you have any questions about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! Do you have any questions about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "Do you have any questions about this page?")
       
    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - The whole response should only include ONE question sentence, which is the question "Do you have any questions about this page?"
        `
        return instruction4Perfect;
    }

    const getInstruction4Incomplete = (items, evaluation) => {
        const instruction4Incomplete1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        4. the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        5. the evaluation of the child's latest response: ${evaluation};

    Your response should contain three parts: 1. acknowledgment, 2. hint, and 3. one follow-up question.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the evaluation of the child's response is 'correct but incomplete', you should acknowledge the correct part and tailor your acknowledgment to the context (e.g., "Great start!", "Nice work! There's more to it", "Almost there", and other similar acknowledgments).

    **Instructions for hint**:
        - Do not include the explicit correct answer in the hint.
        - Your hint should be suitable for children aged 6 to 8.
        - Keep your hint simple, engaging and under 20 words.
        - Since the child's response is correct but incomplete, provide an implicit hint to guide the child toward the missing parts of a correct answer without directly stating them.
                        
    **Instructions for Pose a Follow-up Question**:
        - Based on your hint, pose ONE follow-up question to the child to help them complete the answer.
        - Keep the follow-up question simple, engaging and under 20 words.
        - Do NOT ask the question in the form of "Can you xxx?", or "Do you xxx?" The follow-up question should be open-ended instead of in the form of a yes/no question.
    
    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - Do not reveal the answer. You should hint the child to think in the explanation part.
        - When organizing all the elements above to form a whole response, make sure the whole response only includes ONE question sentence.
        - Your response should end with the follow-up question.
        `
        const instruction4Incomplete2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgment, 2. explanation, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", etc.).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

    **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "Do you have any questions about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! Do you have any questions about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "Do you have any questions about this page?")

    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - The whole response should only include and end with ONE question sentence, which is the question "Do you have any questions about this page?"
        `
        let sumCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'perfect' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant response' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 4) {
            console.log('instruction4Incomplete1');
            return instruction4Incomplete1;
        } else {
            console.log('instruction4Incomplete2');
            return instruction4Incomplete2;
        }

    }

    const getInstruction4FactuallyIncorrect = (items, evaluation) => {
        const instruction4FactuallyIncorrect1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        4. the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        5. the evaluation of the child's latest response: ${evaluation};

    Your response should contain three parts: 1. acknowledgment, 2. hint, and 3. one follow-up question.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
- Since the evaluation of the child's response is 'factually incorrect', you should acknowledge their efforts and tailor your acknowledgment to the context (e.g., "Let's try it again, "Let's think about it together! "That's a good try!", and other similar acknowledgments).

    **Instructions for hint**:
        - Do not include the explicit correct answer in the hint.
        - Your hint should be suitable for children aged 6 to 8.
        - Keep your hint simple, engaging and under 20 words.
        - Since the child's response is factually incorrect, first gently correct the misunderstanding, then provide an implicit hint that guides them toward the correct answer without directly stating it.
                        
    **Instructions for Pose a Follow-up Question**:
        - Based on your hint, pose ONE follow-up question to the child to help them think about the correct answer.
        - Keep the follow-up question simple, engaging and under 20 words.
        - Do NOT ask the question in the form of "Can you xxx?", or "Do you xxx?" The follow-up question should be open-ended instead of in the form of a yes/no question.
    
    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - Do not reveal the answer. You should hint the child to think in the explanation part.
        - When organizing all the elements above to form a whole response, make sure the whole response only includes ONE question sentence.
        - Your response should end with the follow-up question.
        `
        const instruction4FactuallyIncorrect2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgment, 2. explanation, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", etc.).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

   **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "Do you have any questions about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! Do you have any questions about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "Do you have any questions about this page?")

    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - The whole response should only include ONE question sentence, which is the question "Do you have any questions about this page?"
        `
        let sumCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'perfect' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant response' || answer === 'uncertainty') {
                sumCount++;
            }
        }

        if (sumCount < 4) {
            console.log('instruction4FactuallyIncorrect1');
            return instruction4FactuallyIncorrect1;
        } else {
            console.log('instruction4FactuallyIncorrect2');
            return instruction4FactuallyIncorrect2;
        }
    }

    const getInstruction4IrrelevantResponse = (items, evaluation) => {
        const instruction4IrrelevantResponse1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        4. the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        5. the evaluation of the child's latest response: ${evaluation};

    Your response should contain three parts: 1. acknowledgment, 2. hint, and 3. one follow-up question.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
- Since the child's response is irrelevant, acknowledge their efforts, gently redirect their focus to the question, and tailor your acknowledgment to the context (e.g., 'Nice try! Let's think about what the question is asking,' 'That's an interesting idea! Let's focus on what we're really looking for,' and other similar acknowledgments).

    **Instructions for hint**:
        - Do not include the explicit correct answer in the hint.
        - Your hint should be suitable for children aged 6 to 8.
        - Keep your hint simple, engaging and under 20 words.
        - Since the child's response is irrelevant, provide an implicit hint to guide them toward the context and correct answer without directly stating the correct answer.
                        
    **Instructions for Pose a Follow-up Question**:
        - Based on your hint, pose a follow-up question to help the child come up with a relevant answer.
        - Keep the follow-up question simple, engaging and under 20 words.
        - Do NOT ask the question in the form of "Can you xxx?", or "Do you xxx?" The follow-up question should be open-ended instead of in the form of a yes/no question.
    
    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - Do not reveal the answer. You should hint the child to think in the explanation part.
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - Your response should end with the follow-up question.
        `
        const instruction4IrrelevantResponse2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgment, 2. explanation, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", etc.).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

   **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "Do you have any questions about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! Do you have any questions about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "Do you have any questions about this page?")

    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - The whole response should only include ONE question sentence, which is the question "Do you have any questions about this page?"
        `
        let sumCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'perfect' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant response' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 4) {
            console.log('instruction4IrrelevantResponse1');
            return instruction4IrrelevantResponse1;
        } else {
            console.log('instruction4IrrelevantResponse2');
            return instruction4IrrelevantResponse2;
        }

    }

    const getInstruction4Uncertainty = (items, evaluation) => {
        const instruction4Uncertainty1 = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        4. the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        5. the evaluation of the child's latest response: ${evaluation};

    Your response should contain three parts: 1. acknowledgment, 2. hint, and 3. one follow-up question.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the child's response is uncertain, acknowledge their efforts and tailor your acknowledgment to the context (e.g., 'That's okay, I see you're unsure,' 'No worries,' 'Thank you for letting me know,' 'That's alright. I'm here to help', 'Let's think together', and other similar acknowledgments).

    **Instructions for hint**:
        - Do not include the explicit correct answer in the hint.
        - Your hint should be suitable for children aged 6 to 8.
        - Keep your hint simple, engaging and under 20 words.
        - Since the child's response is uncertain, provide an implicit hint to guide them toward the correct answer without directly stating the correct answer.
                        
    **Instructions for Pose a Follow-up Question**:
        - Based on your hint, pose a follow-up question to help the child come up with the correct answer.
        - Keep the follow-up question simple, engaging and under 20 words.
        - Do NOT ask the question in the form of "Can you xxx?", or "Do you xxx?" The follow-up question should be open-ended instead of in the form of a yes/no question.
    
    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - Do not reveal the answer. You should hint the child to think in the explanation part.
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - Your response should end with the follow-up question.
        `
        const instruction4Uncertainty2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgment, 2. explanation, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", etc.).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

    **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "Do you have any questions about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! Do you have any questions about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "Do you have any questions about this page?")

    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - The whole response should only include ONE question sentence, which is the question "Do you have any questions about this page?"
        `
        
        let sumCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'perfect' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant response' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 4) {
            console.log('instruction4Uncertainty1');
            return instruction4Uncertainty1;
        } else {
            console.log('instruction4Uncertainty2');
            return instruction4Uncertainty2;
        }
        
        
    }


    const getInstruction4Incorrect = (items, evaluation) => {
        const instruction4Incorrect1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        4. the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        5. the evaluation of the child's latest response: ${evaluation};

    Your response should contain three parts: 1. acknowledgement, 2. hint, and 3. one follow-up question.

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should acknowledge their effort and tailor your acknowledgement to the context (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", and more).

    **Instructions for hint**:
        - Do NOT explicitly include the correct answer in the hint. 
        - DO NOT REVEAL THE ANSWER.
        - Your hint should IMPLICITLY guide the child to think about some elements of the correct answer.
        - Your hint should not include any question.
        - Keep your hint simple, engaging and under 20 words.
                
    **Instructions for Pose ONE Follow-up Question**:
        - Based on your hint, reask the main question again in the context (question: ${knowledgeRef.current[currentPageRef.current]?.question})
        - The follow-up question should guide the child to come up with the correct answer without revealing the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - The follow-up question should only include ONE question sentence. Keep it simple, engaging and under 20 words.
        - Do NOT ask the question that starts with "Can you tell me", "Do you know", "Do you remember", etc. The question should be open-ended, not a yes/no question.
    
    **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes ONE question sentence.
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - Do not reveal the answer. You should hint the child to think in the explanation part.
        `
        const instruction4Incorrect2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. conclusion.

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", etc.).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

    **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "Do you have any questions about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! Do you have any questions about this page? " (Make sure to use different conclusions based on the examples, but always include the ONLY ONE question "Do you have any questions about this page?")
 
    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - The whole response should only include ONE question sentence, which is the question "Do you have any questions about this page?"
        `
        let sumCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'incorrect' || answer === 'correct') {
                sumCount++;
            }
        }

        if (sumCount < 4) {
            console.log('instruction4Incorrect1');
            return instruction4Incorrect1;
        } else {
            console.log('instruction4Incorrect2');
            return instruction4Incorrect2;
        }
    }

    const getInstruction4ChildQuestion = (items, evaluation) => {
        const instruction4ChildQuestion1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. child's latest response: the most recent input from the child.
        4. the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        
    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. follow-up question

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the child posed a question, you should first acknowledge their effort and tailor your acknowledgement to the context (e.g., Good thinking!", "Oh it's an interesting question!", and more).

    **Instructions for Explanation**:
        - If the child's question is not about the story, steer the conversation back to the story.
        - Give a concise explanation to the child's question.
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Since the child poses a question, answer the question with easy-to-understand words.

    **Instructions for Pose a Follow-up Question**:
        - Steer the conversation back to the original question.
        - Ask the not answered question again.
    
    **Instructions for Whole Response**:
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence at the end.
        `;

        const instruction4ChildQuestion2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. child's latest response: the most recent input from the child (user).

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. conclusion

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 

    **Instructions for Explanation**:
        - If the child's question is not about the story, steer the conversation back to the story.
        - If the child's question is about the story, give a concise explanation to the child's question.
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.

    **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - End the conversation with a declarative sentence.
        - Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples, but end the conclusion using declarative sentence, instead of questions.))
    
    **Instructions for Whole Response**:
        - End the conversation with a declarative sentence. Do not include any question marks in the whole response.
        `;
        let sumCount = 0;
        let correctCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant response' || answer === 'uncertainty') {
                sumCount++;
            }
            if (answer === 'perfect') {
                correctCount++;
            }
        }
        if (sumCount > 3 || correctCount > 0) {
            console.log('instruction4ChildQuestion2');
            return instruction4ChildQuestion2;
        } else {
            console.log('instruction4ChildQuestion1');
            return instruction4ChildQuestion1;
        }
    }

    const getInstruction4Invalid = (items, evaluation) => {
        const instruction4Invalid = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the evaluation of the child's latest response: ${evaluation};

        Since the evaluation of the child's response is 'invalid', you should respond with a friendly line (e.g., "I didn't hear your answer, can you say it again?", "Oh I didn't catch that, can you say it again?")
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        `;
        console.log(instruction4Invalid);
        return instruction4Invalid;
    }


    const getInstruction4ConvEnd = (items, evaluation) => {
        const instruction4ConvEnd = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. 
        Now your task is to keep the focus of the conversation on the story and end the conversation with a friendly line, such as "It was fun chatting with you! Let's continue reading the story."
        Do not include any question marks in your response.
        `;
        console.log(instruction4ConvEnd);
        return instruction4ConvEnd;
    }

    const getInstruction4OffTopic = (items, evaluation) => {
        const instruction4OffTopic = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. the evaluation of the child's latest response: ${evaluation};

        Start by acknowledging the child's response (e.g., "Interesting idea!"). Then guide the conversation back to the original question you asked or conclude the interaction if the conversation has gone beyond three rounds.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        `;
        console.log(instruction4OffTopic);
        return instruction4OffTopic;
    }

    const getInstruction4FollowUp = (items, evaluation) => {
        const instruction4FollowUp = `
        You need to pose a follow-up question based on the following information: 
        1. Story text: ${pages[currentPageRef.current]?.text.join(' ')}
        2. Conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        3. The child's latest response: the most recent input from the child (user).

        Follow the following instructions:
        Your response should contain three parts: acknowledgement, explanation, and follow-up question or conclusion.
        The total number of conversation rounds should be 4.

        **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements tailored to the context. Do not repeat the same acknowledgement as in the conversation history. 
        - Here are different situations for acknowledgement based on the child's response:
            1. If the evaluation is 'invalid', reply with a friendly line (e.g., "I didn't hear your answer, can you say it again?", "Oh I didn't catch that, can you say it again?")
            2. If the evaluation is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try again!", "Let's think about it together!", "It's okay if you don't remember!", "Let's think again!", "Aha! You jumped ahead of me a little bit, but that's okay.")
            3. If the evaluation is 'partially correct', you should first provide encouraging feedback (e.g., "That's a good try!", "Aha! You're on the right track!"), then hint the child to think about the correct answer.
            4. If the evaluation is 'child asks question', you should acknowledge their question (e.g., "Good question!", "Oh it's an interesting question!")
            5. If the evaluation of the child's response is 'off-topic', you should steer the conversation back to the original topic.
        
        **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Here are different situations for explanation based on the child's response:
            1. If the evaluation is 'correct', provide a concise explanation to deepen their understanding.
            2. If the evaluation is 'incorrect', hint the child to think to get the correct answer (without explicitly telling the correct answer)
            3. If the evaluation is 'child asks question', answer the child's question using simple words and steer the conversation back to the original question.

        **Situations for Not Posing a Follow-up Question**:
        - You do not need to pose a follow-up question if:
            1. The child answers the question correctly.
            2. The conversation has more than 4 rounds.
        In these cases, you can end the conversation (refer to **Instructions for Conclusion**). 
        
        **Instructions for Pose a Follow-up Question**:
        - Based on your hint, pose a follow-up question to the child.
        - Keep the follow-up question simple, engaging and under 20 words.
        - Do NOT ask the question in the form of "Can you xxx?", or "Do you xxx?" The follow-up question should be open-ended instead of in the form of a yes/no question.

        **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - You cannot conclude the conversation if you're posing a follow-up question.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - Keep the conclusion part concise, under 15 words.
        - Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples, but end the conclusion using declarative sentence, instead of questions.))

        **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - If your response includes a question, you can't conclude the conversation. You need to address the question first.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `;
        console.log(instruction4FollowUp);
        return instruction4FollowUp;
    }

    const getInstruction4NoResponse = () => {
        const instruction4NoResponse = `
        **Instructions**:
        1. Read the chat history to find the last question the assistant asked.
        2. Ignore the chat history. Say "Hey, I didn't hear your answer." and ADD the last question asked in the chat history.
        3. If the last question is "Do you have any questions about this page?", you should ask the question "Do you have any questions about this page?" again, instead the main question in the chat history.
        4. Do not ask a question that is not the last question in the chat history.
        
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
        if (timer >= 15 && !userRespondedRef.current && isKnowledge) {
          console.log('User did not respond in 15 seconds. Sending another message...');
          console.log('isWaitingForResponse', isWaitingForResponseRef.current);
          const client = clientRef.current;
          // if the client is connected, send a message
          if (isClientSetup && isWaitingForResponseRef.current) {
            noReponseCntRef.current = noReponseCntRef.current + 1;
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
            console.log('currentPageRef.current', currentPageRef.current);
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            client.updateSession({ instructions: instruction });
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
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
                if (item?.content[0]?.transcript?.startsWith('<')) {
                    // keep the item id, and when the item status is completed, delete it
                    setItemToDelete(item.id);
                    isWaitingForEvaluationRef.current = false;
                    console.log('evaluation result and status', item.content[0]?.transcript, item.status);
                    if ((item.status === 'completed' || item.status === 'incomplete') && !deletedItemsRef.current.has(item.id)) {
                        console.log('!!! deleting item', item);
                        try {
                            await client.realtime.send('conversation.item.delete', {
                                item_id: item.id
                            });
                            // 添加到已删除集合中
                            deletedItemsRef.current.add(item.id);
                            
                            console.log('items length', items.length);
                            console.log('noReponseCnt', noReponseCntRef.current);
                            const answerOrder = Math.floor((items.length - noReponseCntRef.current) / 2) - 1;
                            
                            if (answerOrder > answerRecord.length - 1) {
                                answerRecord.push(item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim());
                            }
                            console.log('answerRecord', answerRecord);
                        } catch (error) {
                            console.log('error', error);
                        }
                        console.log('items', items);
                        console.log('items to delete', itemToDelete);
                    }
                        // only update answerRecord after the item is deleted
                        // if this is the first completed item for the item id, send a response
                    // 
                    console.log('item status', item.status);
                    console.log('resendFlagRef.current', resendFlagRef.current);
                    console.log('item.id', item.id);
                    console.log('itemToRespondRef.current', itemToRespondRef.current);
                    if (evalStatus(item.content[0]?.transcript) && item.id !== itemToRespondRef.current && item.role === 'assistant') {
                        console.log('now generating response for', item.content[0]?.transcript.replace('<eval>', '').trim());
                        itemToRespondRef.current = item.id;
                        // send this instruction after the item is completed
                        setTimeout(async () => {
                            // if the string has </eval>, remove it
                            const evaluation = item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim();
                            console.log('evaluation', evaluation);

                            // Check if there's an active response
                            const hasActiveResponse = client.conversation.getItems().some(item => 
                                item.status === 'in_progress' || item.status === 'pending'
                            );

                            if (hasActiveResponse) {
                                console.log('There is an active response, waiting before sending new one');
                                resendFlagRef.current = true;
                                // Wait for 2 seconds and try again
                                setTimeout(async () => {
                                    try {
                                        if (resendFlagRef.current) {
                                            console.log('sending initial response request after 4 seconds');
                                            await sendResponse(client, evaluation, items);
                                        }
                                    } catch (error) {
                                        console.error('Error sending response after retry:', error);
                                    }
                                }, 4000);
                            } else {
                                try {
                                    await sendResponse(client, evaluation, items);
                                } catch (error) {
                                    console.error('Error sending response:', error);
                                }
                            }
                        }, 1000);
                    }
                    else if (resendFlagRef.current && item.status !== 'in_progress' && item.id === itemToRespondRef.current) {
                        console.log('resending response, after this resendFlag is set to false', item.content[0]?.transcript);
                        resendFlagRef.current = false;
                        const evaluation = item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim();
                        console.log('evaluation', evaluation);
                        try {
                            await sendResponse(client, evaluation, items);
                        } catch (error) {
                            console.error('Error sending response:', error);
                        }
                    }
                }
                else if (!isWaitingForEvaluationRef.current && (!deletedItemsRef.current.has(item.id) || (!item.content[0]?.transcript?.startsWith('<')))) {
                    // console.log('logging this item: ', item.content[0]?.transcript);
                    if (!item.content[0]?.transcript?.startsWith('<') && item.role === 'assistant' && resendFlagRef.current) {
                        console.log('resending response set to false', item.content[0]?.transcript);
                        resendFlagRef.current = false;
                    }
                    if (delta?.transcript) {
                        // setChatHistory(items);
                        setCurrentPageChatHistory(items);
                        // chatHistoryRef.current[currentPageRef.current] = items;
                        // check if the chat-window element exists
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
                        // setChatHistory(items);
                        setCurrentPageChatHistory(items);
                        //chatHistoryRef.current[currentPageRef.current] = items;
                        // get the chat-window element by class name
                        const chatWindow = document.getElementsByClassName('chat-window')[0];
                        if (chatWindow) {
                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
                        if (item.role === 'assistant') {
                            // if the last item does not end with a question mark, it means the conversation is ended
                            if (!item?.content[0]?.transcript?.endsWith('?') && !item?.content[0]?.transcript?.endsWith('? ') && !item?.content[0]?.transcript?.endsWith('talk.')) {
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
                }
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
            handleCloseChat();
        }
    }, [isConversationEnded]);

    const evalStatus = (transcript) => {
        if (!transcript.includes('<eval>') || !transcript.includes('</eval>')) {
            return false;
        }
        if (transcript.includes('perfect') || transcript.includes('correct but incomplete') || transcript.includes('factually incorrect') || transcript.includes('irrelevant') || transcript.includes('uncertainty') || transcript.includes('child asks question') || transcript.includes('invalid') || transcript.includes('conv end')) {
            return true;
        }
        return false;
    }

    const handleCaptionToggle = () => {
        setShowCaption(!showCaption);
    }

    const swipeHandlers = useSwipeable({
        onSwipedLeft: (eventData) => {
            if (!eventData.event.target.closest('#speed-btn-box')) {
                if (currentPageRef.current < pages.length - 1) {
                    handleNextPage();
                }
            }
        },
        onSwipedRight: (eventData) => {
            if (!eventData.event.target.closest('#speed-btn-box')) {
                if (currentPageRef.current > 0) {
                    handlePrevPage();
                }
            }
        },
        preventDefaultTouchmoveEvent: true,
        trackMouse: true,
    });

    const handleImageClick = (event) => {
        console.log('image clicked', currentPageRef.current);
        const { left, width, top, height } = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - left;
        const clickY = event.clientY - top;
    
        if (clickX < width / 2) {
            handlePrevPage();
        } else if (clickX > width / 2) {
            if (!event.target.closest('#speed-btn-box') && !event.target.closest('#caption-btn-box') && !event.target.closest('#play-btn-box')) {
                handleNextPage();
            }
        }
    };

    const handleReplay = async (index) => {
        const wavStreamPlayer = wavStreamPlayerRef.current;
        const replayAudio = replayAudioRef.current;
        
        // If clicking on a different message while another is playing
        if (replayingIndex !== null && replayingIndex !== index) {
            replayAudio.pause();
            replayAudio.currentTime = 0;
            isReplayingRef.current = false;
            setReplayingIndex(null);
        }

        // If clicking on the currently playing message
        if (replayingIndex === index) {
            if (replayAudio.paused) {
                // Resume playing
                await wavStreamPlayer.interrupt();
                replayAudio.play();
                isReplayingRef.current = true;
            } else {
                // Pause playing
                replayAudio.pause();
                isReplayingRef.current = false;
            }
            return;
        }

        // Start playing a new message
        await wavStreamPlayer.interrupt();
        replayAudio.src = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory][index].formatted.file.url;
        replayAudio.currentTime = 0;
        await replayAudio.play();
        setReplayingIndex(index);
        isReplayingRef.current = true;
        
        replayAudio.onended = () => {
            console.log('replay ended');
            isReplayingRef.current = false;
            setReplayingIndex(null);
        };
    }

    const handleExpandChat = () => {
        setIsExpandedChat(!isExpandedChat);
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.height = isExpandedChat ? '50%' : '80%';
    }
    
    const handleMinimizeChat = async () => {
        setIsMinimizedChat(!isMinimizedChat);
        setIsExpandedChat(false);
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
    }

    const handleAutoPageToggle = () => {
        setAutoPage((prev) => !prev);
    };

    const toggleSpeedClick = () => {
        setShowSpeedSlider(!showSpeedSlider);
    };

    const handleSpeedChange = (event, newValue) => {
        if (newValue === 0.5) {
            setAudioSpeed(0.7);
        }
        else {
            setAudioSpeed(newValue);
        }
    };

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
        formData.append('page', currentPageRef.current);
        chatHistory.forEach((item, index) => {
            const prefix = `item_${index}`;
            const itemDict = {
                id: item.id,
                role: item.role,
                content: item.content[0]?.transcript,
            }
            formData.append(`${prefix}_dict`, JSON.stringify(itemDict));
            if (item.role === 'user' && item.formatted?.file?.blob) {
                formData.append(`${prefix}_audioBlob`, item.formatted.file.blob, `${user}-${title}-Page_${currentPageRef.current}-ID_${index}.mp3`);
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
        const formData = processChatHistory(currentPageChatHistory);
        try {
            const response = await fetch(`${apiUrl}/api/chat_history`, {
                method: 'POST',
                body: formData
            });
            console.log('response', response);
        } catch (error) {
            console.error('Error sending chat history to backend', error);
        }
        if (isKnowledge) {
            setIsKnowledge(false);
            chatHistoryRef.current[currentPageRef.current] = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory];
            setTimeout(() => {
                // audioRef.current.play();
                if (currentPageRef.current < pages.length - 1) {
                    setIsPlaying(true);
                    handleNextPage();
                }
            }, 500);
        }
        else {
            // setIsAsking(false);
            isAskingRef.current = false;
            chatHistoryRef.current[currentPageRef.current] = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory];
            if (sentenceIndexRef.current === pages[currentPageRef.current]?.text.length) {
                setIsPlaying(true);
                handleNextPage();
            } else {
                audioRef.current.play();
                audioRef.current.playbackRate = audioSpeed;
                setIsPlaying(true);
            }
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

    // if currentPage changes, set isAsked to false
    // useEffect(() => {
    //     console.log('currentPage changed', currentPage);
    // }, [currentPage]);
    useEffect(() => {
        // Check if it's the first page
        if (currentPageRef.current === 0) {
            // Set a timeout to start shaking after 13 seconds
            const startShakeTimer = setTimeout(() => {
                setIsShaking(true);
                console.log('shaking');
                // Set another timeout to stop shaking after 1 second
                const stopShakeTimer = setTimeout(() => {
                    setIsShaking(false);
                    console.log('not shaking');
                }, 1000);

                // Cleanup the stop shake timer
                return () => clearTimeout(stopShakeTimer);
            }, 6500*audioSpeed);

            // Cleanup the start shake timer on component unmount or when the page changes
            return () => clearTimeout(startShakeTimer);
        }
    }, [currentPageRef.current]);

    const handleRegenerate = async (index) => {
        const client = clientRef.current;
        const items = client.conversation.getItems();
        const currentItem = items[index];
        
        console.log('currentItem', currentItem);
        // Only allow regeneration for the latest assistant message
        if (currentItem?.role !== 'assistant' || index !== items.length - 1) return;
        
        setRegenerateIndex(index);
        
        // Delete the current assistant message
        await client.realtime.send('conversation.item.delete', {
            item_id: currentItem.id
        });
        
        // Get the evaluation result from the previous message
        const prevItems = items.slice(0, index);
        const lastEvaluation = prevItems.reverse().find(item => 
            item?.content[0]?.transcript?.startsWith('<eval>'))?.content[0]?.transcript;

        console.log('lastEvaluation', lastEvaluation);
            
        if (lastEvaluation) {
            const evaluation = lastEvaluation.replace('<eval>', '').replace('</eval>', '').trim();
            // Send a new response based on the last evaluation
            await client.realtime.send('response.create', {
                response: {
                    "modalities": ["text", "audio"],
                    "instructions": getInstruction4Response(items, evaluation)
                }
            });
        }
        
        setRegenerateIndex(null);
    };

    const getInstruction4Response = (items, evaluation) => {
        switch (evaluation) {
            case 'perfect':
                return getInstruction4Perfect(items, evaluation);
            case 'correct but incomplete':
                return getInstruction4Incomplete(items, evaluation);
            case 'factually incorrect':
                return getInstruction4FactuallyIncorrect(items, evaluation);
            case 'irrelevant response':
                return getInstruction4IrrelevantResponse(items, evaluation);
            case 'uncertainty':
                return getInstruction4Uncertainty(items, evaluation);
            case 'child asks question':
                return getInstruction4ChildQuestion(items, evaluation);
            case 'invalid':
                return getInstruction4Invalid(items, evaluation);
            case 'conv end':
                return getInstruction4ConvEnd(items, evaluation);
            default:
                return getInstruction4FollowUp(items, evaluation);
        }
    };

    // Add this new function before the return statement
    const sendResponse = async (client, evaluation, items) => {
        switch (evaluation) {
            case 'perfect':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Perfect(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'correct but incomplete':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Incomplete(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'factually incorrect':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4FactuallyIncorrect(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'irrelevant response':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4IrrelevantResponse(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'uncertainty':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Uncertainty(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'child asks question':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4ChildQuestion(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'invalid':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Invalid(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'conv end':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4ConvEnd(items, evaluation)
                    }
                });
                break;
            default:
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4FollowUp(items, evaluation)
                    }
                });
                userRespondedRef.current = false;
                break;
        }
    };

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
                        disabled={currentPageRef.current === 0}
                        sx={{ opacity: 0 }}
                        >
                            <MdArrowCircleLeft size={60} color='#7AA2E3'/>
                        </IconButton>
                        <div id='caption-btn-box'>
                            <IconButton variant='plain' onClick={handleCaptionToggle} style={{ zIndex: 2, color: 'white', fontSize: '30px', backgroundColor: 'rgba(0,0,0,0)' }}>
                                <FaRegClosedCaptioning />
                            </IconButton>
                        </div>
                        <div id='play-btn-box'>
                            <IconButton id='play-btn' variant='plain' onClick={togglePlayPause} style={{ zIndex: 2, color: 'white', fontSize: '25px', backgroundColor: 'rgba(0,0,0,0)' }}>
                                {isPlaying ? <FaPause /> : <FaPlay />}
                            </IconButton>
                        </div>
                        <div id='speed-btn-box'>
                            <IconButton id='speed-btn' variant='plain' onClick={toggleSpeedClick} style={{ zIndex: 2, color: 'white', fontSize: '30px', backgroundColor: 'rgba(0,0,0,0)' }}>
                                <RiSpeedUpFill />
                            </IconButton>
                        </div>
                        {showSpeedSlider && (
                            <div id='speed-slider-box'>
                                <Slider
                                    value={audioSpeed}
                                    onChange={handleSpeedChange}
                                    min={0.5}
                                    max={1.5}
                                    step={0.5}
                                    marks={[{ value: 0.5, label: 'slow' }, { value: 1, label: 'normal' }, { value: 1.5, label: 'fast' }]}
                                    // set label size to 12px
                                    sx={{
                                        width: '120px',
                                        height: '30px',
                                        '--Slider-trackSize': '12px',
                                        "--Slider-markSize": "8px",
                                        '& .MuiSlider-markLabel': {
                                            fontSize: '16px',
                                            color: '#3F150B',
                                            fontFamily: 'BM Jua',
                                            textStroke: '1px #FFFFFF'
                                        },
                                        zIndex: 100
                                    }}
                                />
                            </div>
                        )}

                    <Box id='book-img' {...swipeHandlers} onClick={handleImageClick}>
                        <img src={pages[currentPageRef.current]?.image} alt={`Page ${currentPageRef.current + 1}`}/>
                    </Box>

                    <IconButton
                        id="next-btn"
                        variant='plain'
                        onClick={handleNextPage}
                        sx={{ opacity: 0 }}
                        >
                        <MdArrowCircleRight size={60} color='#7AA2E3'/>
                    </IconButton>
                </Box>            
            </div>
            <div id='bottom-box'>
                {showCaption && 
                    <div id='caption-box'>
                        {/* keep the caption at the center of the caption-box */}
                    <h4 id="caption">
                        {/* <Button onClick={togglePlayPause} variant="contained" color="primary">
                            {isPlaying ? <FaPause /> : <FaPlay />}
                        </Button> */}
                        {pages[currentPageRef.current]?.text[sentenceIndexRef.current]}
                    </h4>
                </div>
                }
                {/* shake the penguin image at the first page, after 13 seconds */}
                <div id='penguin-box'>
                    <img
                    src='./files/imgs/penguin.svg'
                    alt='penguin'
                    style={{ width: '128px' }}
                    className={isShaking ? 'shake' : ''}
                />
                </div>
            </div>
            {(isAskingRef.current || isKnowledge) && !isMinimizedChat && (
                    <Box id='chat-container' sx={{ position: 'absolute', width: chatBoxSize.width, height: chatBoxSize.height }}>
                        {/* if is recording, add a black layer on top of chat-window, if isn't recording, remove the layer */}
                        {isRecording && (
                            <Box id='recording-layer' style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 101 }}></Box>
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
                        <IconButton id='expand-btn' variant='plain' 
                                onClick={handleExpandChat}
                                onMouseOver={() => {
                                    document.getElementById('expand-btn').style.backgroundColor = 'rgba(0,0,0,0)';
                                }}
                                sx={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '8px',
                                    zIndex: 1,
                                }}
                            >
                            {isExpandedChat ? <FaChevronCircleDown size={30} color='#7AA2E3' /> : <FaChevronCircleUp size={30} color='#7AA2E3' />}
                        </IconButton>
                        <IconButton id='minimize-btn' variant='plain' 
                                onClick={handleMinimizeChat}
                                onMouseOver={() => {
                                    document.getElementById('minimize-btn').style.backgroundColor = 'rgba(0,0,0,0)';
                                }}
                                sx={{
                                    position: 'absolute',
                                    top: '8px',
                                    left: '45px',
                                    zIndex: 1,
                                }}
                            >
                            {/* always set the backgroud to transparent */}
                            <FaMinusCircle size={30} color='#7AA2E3' style={{ backgroundColor: 'transparent' }}/>
                        </IconButton>
                        <IconButton 
                            id='close-btn'
                            onClick={handleCloseChat}
                            onMouseOver={() => {
                                document.getElementById('close-btn').style.backgroundColor = 'rgba(0,0,0,0)';
                            }}
                            sx={{
                                position: 'absolute',
                                top: '8px',
                                left: '80px',
                                zIndex: 1
                            }}
                        >
                            {/* add a close icon */}
                            <IoMdCloseCircle size={36} color='#7AA2E3' />
                        </IconButton>
                       
                    <Box className='chat-window'>
                        
                        {[...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].length == 0 && (
                            <Box id='loading-box'>
                                <AiOutlineLoading id='loading-icon' size={40} color='#7AA2E3' />
                            </Box>
                        )}
                        {[...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].filter(msg => msg.type === 'message').map((msg, index) => (
                            msg.content[0]?.transcript !== '' && (
                            <Box key={index} id={msg.role === 'user' ? 'user-msg' : 'chatbot-msg'}>
                                {msg.role === 'user' ? (
                                    // if message is loading, add a loading icon
                                    <Box id="user-chat">
                                        <Avatar id='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793', marginRight: "8px"}}>{user.substring(0, 2)}</Avatar>
                                        <Box id="msg-bubble" style={{ backgroundColor: '#ECECEC' }}>
                                            {msg.content[0]?.transcript !== null ? (
                                                <h5 level='body-lg' style={{margin: '0px'}}>{msg.content[0]?.transcript}</h5>
                                            ) : (
                                                <AiOutlineLoading id='loading-icon' size={20} color='#7AA2E3' />
                                            )}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box id="chatbot-chat">
                                        <Image id='chatbot-avatar' src='./files/imgs/penguin.svg'></Image>
                                        <Box id="msg-bubble" style={{ position: 'relative' }} onClick={() => handleReplay(index)}>
                                            {!msg.content?.[0]?.transcript?.startsWith('<') && (
                                                <h5 level='body-lg' style={{margin: '0px', marginRight: '50px'}}>
                                                    {msg.content?.[0]?.transcript}
                                                </h5>
                                            )}
                                            {msg.status === 'completed' && !msg.content?.[0]?.transcript?.startsWith('<') && (
                                                <Box sx={{ display: 'flex', gap: 1, position: 'absolute', right: '8px', bottom: '8px' }}>
                                                    {/* <IconButton 
                                                        variant='plain' 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRegenerate(index);
                                                        }}
                                                        sx={{ 
                                                            opacity: (msg.role === 'assistant' && index === [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].length - 1) ? 1 : 0,
                                                            pointerEvents: (msg.role === 'assistant' && index === [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].length - 1) ? 'auto' : 'none',
                                                        }}
                                                    >
                                                        {regenerateIndex === index ? 
                                                            <AiOutlineLoading className="spin" size={25} color='#2A2278' /> :
                                                            <MdOutlineReplayCircleFilled size={25} color='#2A2278' />
                                                        }
                                                    </IconButton> */}
                                                    <IconButton id='replay-btn' variant='plain'>
                                                        {replayingIndex === index ? 
                                                            (!isReplayingRef.current ? <FaCirclePlay size={25} color='#2A2278' /> : <FaCirclePause size={25} color='#2A2278' />)
                                                            : <FaCirclePlay size={25} color='#2A2278' />}
                                                    </IconButton>
                                                </Box>
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
                                    <div id='recording-box-1' />
                                    <div id='recording-box-2' />
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
                                    zIndex: 103
                                }}
                            >
                                {/* <FaMicrophone size={40} color='white'/> */}
                                {isRecording ? 
                                    <h4 style={{ color: 'white', fontSize: '30px', fontFamily: 'Cherry Bomb' }}>Talking...</h4>
                                : <div>
                                        <div style={{ width: '90%', height: '25%', backgroundColor: '#FFFFFF4D', position: 'absolute', top: '7px', left: '3%', borderRadius: '20px' }}></div>
                                        <img src='./files/imgs/ring.svg' alt='ring' style={{ width: '35px', height: '35px', position: 'absolute', top: '2px', right: '6px', borderRadius: '50%' }} />
                                        <h4 style={{ color: 'white', fontSize: '30px', fontFamily: 'Cherry Bomb' }}>Hold to talk!</h4>
                                </div>}
                            </button>
                        </div>
                    )}
                    <div id='moon-chat-box'>
                        <img src='./files/imgs/moon.svg' alt='moon' style={{ position: 'absolute', bottom: '0', right: '0', zIndex: -1 }} />
                    </div>
                </Box>
            )}
            </div>
        </Box>
    );
};

export default ReadChatPage;

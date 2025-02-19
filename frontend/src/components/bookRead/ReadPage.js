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
import { FaChevronCircleUp, FaChevronCircleDown, FaMinusCircle } from "react-icons/fa";
import { IoMdCloseCircle } from "react-icons/io";
import { FaMicrophone } from "react-icons/fa6";
import { FaCirclePlay, FaCirclePause } from "react-icons/fa6";
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
    const [itemToRespond, setItemToRespond] = useState(null);
    const [timer, setTimer] = useState(0);
    const [answerRecord, setAnswerRecord] = useState([]);
    const [currentPageChatHistory, setCurrentPageChatHistory] = useState([]);
    const [isShaking, setIsShaking] = useState(false);
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
        loadAskedQuestions();
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

    useEffect(() => {
        console.log('isAsking changed', isAskingRef.current);
    }, [isAskingRef.current]);

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
        // client.createResponse();
        if (isKnowledge) {
            client.realtime.send('input_audio_buffer.commit');
            client.conversation.queueInputAudio(client.inputAudioBuffer);
            client.inputAudioBuffer = new Int16Array(0);
            console.log('last question', items[items.length - 1]?.content[0]?.transcript);
            await client.realtime.send('response.create', {
                response: {
                    "modalities": ["text", "audio"],
                    "instructions": getInstruction4Evaluation(items),
                }
            });
        } else {
            client.createResponse();
        }
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
                        handleNextPage();
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
        - White’s Tree Frog: 
            information to identify the frog: the big green frog on the left page
            location: Australia, 
            fact about this frog: This frog is often found in people’s bathrooms.
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

    async function getInstruction4Asking() {
        if (isFirstTime) {
            const instruction4Asking = `
            You are a friendly chatbot engaging with a child named ${user}, who is reading a storybook and asking questions about it.

            Instructions:
            - Ignore all previous conversation history.
            - Always start by asking 'Hey ${user}, what do you want to know about this page? You can press AND hold the big yellow button to talk.'
            - If you cannot recognize the child's answer in English, say, "I didn't hear your answer, can you say it again?"
            - You need to actively answer the child's questions and provide simple explanations like you are talking to a 5 year old to help them comprehend the story.
            - Keep this conversation within three rounds. If the child asks more than three questions, you can say, "There are many exciting things in this story, let's keep exploring it." and end the conversation.
            - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.

            **Important Reminders**:
            - Maintain concise responses: each should be no more than 25 words, using simple tier1 or tier2 vocabulary.
            - Keep the conversation within three rounds.
            - Do not make up the child's response, if you do not get response, just ask again.
            - Do not ask questions.
            - Only recognize the child's answer in English.
            - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.

            Essential Details:
                - **Story Title**: ${title}
                - **Story Text for Current Page**: ${pages[currentPageRef.current]?.text.join(' ')}
            `;
            return instruction4Asking;
        }
        const instruction4Asking = `
        You are a friendly chatbot engaging with a child named ${user}, who is reading a storybook and asking questions about it.

        Instructions:
        - Start by asking 'Hey ${user}, what do you want to know about this page?'
        - If you cannot recognize the child's answer in English, say, "I didn't hear your answer, can you say it again?"
        - You need to actively answer the child's questions and provide simple explanations like you are talking to a 5 year old to help them comprehend the story.
        - Keep this conversation within three rounds. If the child asks more than three questions, you can say, "There are many exciting things in this story, let's keep exploring it." and end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.

        **Important Reminders**:
        - Maintain concise responses: each should be no more than 25 words, using simple tier1 or tier2 vocabulary.
        - Keep the conversation within three rounds.
        - Do not make up the child's response, if you do not get response, just ask again.
        - Do not ask questions.
        - Only recognize the child's answer in English.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.

        Essential Details:
            - **Story Title**: ${title}
            - **Story Text for Current Page**: ${pages[currentPageRef.current]?.text.join(' ')}
        `;
        return instruction4Asking;
    }

    function getInstruction4Evaluation(items) {
        const instruction4Evaluation = `
        **Instructions for Evaluation**:
        You need to evaluate the child's response based on the following inputs:
        - Conversation History: ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')}
        - Child's Latest Response: The most recent input from the child.
        - Story Context: ${pages[currentPageRef.current]?.text.join(' ')}
        Focus only on evaluating the child's response to the latest question.

        **Steps for Evaluation**:
        Step 1: Check Response Validity
        If the response is empty, cannot be recognized due to noise, being too short, or sent by mistake, mark it as "invalid".
        Step 2: Evaluate Valid Responses
        For responses that contain meaningful content, use the following criteria:
        - Correct: The response is accurate (or partially accurate) and directly relevant to the question.
        - Partially Correct: The response shows partial accuracy and relevance. For example, in a multiple-choice question, selecting one correct option qualifies as partially correct.
        - Incorrect: The response is wrong or shows no understanding of the question (e.g., "I don't know," "I don't remember," or incorrect guesses).
        - Child Asks Question: As long as the child asks a question, mark it as "child asks question".
        - Off-topic: The response is unrelated to the question or the story context.
                    
        **Response Format**:
        Precede each evaluation with the tag <eval>. Do not include any other text apart from the tag and evaluation. Examples of your output, reply with one of these only:
        - <eval>invalid
        - <eval>correct
        - <eval>partially correct
        - <eval>incorrect
        - <eval>child asks question
        - <eval>off-topic
        `;
        console.log(instruction4Evaluation);
        return instruction4Evaluation;
    }


    // update the instruction4Guiding when the currentPageRef.current changes   
    async function getInstruction4Guiding() {
        if (isFirstTime) {
            const instruction4Guiding = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. From now on, your role is to guide an interactive conversation based on the story information and instructions to enrich their knowledge.
        Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        
        **Story Information**:
        - Story Title: ${title}
        - Story Text: ${pages[currentPageRef.current]?.text.join(' ')}
        - Concept Word: ${knowledgeRef.current[currentPageRef.current]?.keyword}
        - Learning Objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective}
        - Core Idea: ${knowledgeRef.current[currentPageRef.current]?.core_idea.map(idea => `${idea.knowledge}`).join('\n')}
        - First Question: ${await getFirstQuestion()}

        **Instructions for the Conversation**:
            1. Initiate Conversation:
                Begin the interaction by posing the first question (recall question), which will guide to the concept word.
                You should use different ways to open the conversation. For example: "Hmm, this part of the story is so interesting! + first question + You can press AND hold the big yellow button to talk."; "Hey xxx, share with me what you think + first question + You can press AND hold the big yellow button to talk."; "xxx, let's chat about what you just read! + first question + You can press AND hold the big yellow button to talk."; etc. 
                Do not ask the first question in the form of yes/no question (e.g., "Can you tell me xxx?", or "Do you know xxx?").
            2. During the Conversation (Two different questions in total):
                a. Pose Question: Each question should focus on the learning objective to impart the external knowledge. Use scaffolding to guide the child step-by-step in their thinking. Ensure that all questions in the conversation are cohesive.
                b. Evaluate Response: Before responding, evaluate the child's answer, which should fall into one of these categories: Invalid/Correct/Partially Correct/Incorrect/Off topic/Child Asks Question
                c. Respond:
                    i. Acknowledgement: Provide positive feedback for correct answers and encouraging feedback for incorrect answers. If the response is off topic, gently steer the conversation back to the original topic.
                    ii. Explanation:
                        For correct answers, provide a concise explanation to deepen understanding.
                        For incorrect/partially correct answers, scaffold further to guide the child's thinking.
                        For off-topic answers, gently steer the conversation back to the original topic.
                        For child asks question, answer the question with easy-to-understand words.
                        For invalid answers, ask the child to say it again.
                    iii. Follow-up question: if the conversation is not ended, pose one more related, inferential, open-ended question based on previous question to continue the discussion or transition to the end of the conversation.
            3. End Conversation:
                After asking one recall question and one follow-up question, ask if the child has any questions. If the child needs scaffolding, you can use more rounds.
                If they don't have further questions, politely close the interaction with a friendly line like: "It was fun chatting with you! Have a great time reading."

        **Response Guidelines**:
        - Maintain a friendly, conversational tone suitable for a 6-8-year-old child.
        - Keep sentences simple, engaging, and under 25 words.
        - Avoid assuming or making up the child's response. Just wait for the child's response for each turn.
        - Ensure that all responses align with the structured three-turn process, focusing on scaffolding, evaluation, and explanation.   
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `;
            return instruction4Guiding;
        }
        const instruction4Guiding = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. From now on, your role is to guide an interactive conversation based on the story information and instructions to enrich their knowledge.
        Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        
        **Story Information**:
        - Story Title: ${title}
        - Story Text: ${pages[currentPageRef.current]?.text.join(' ')}
        - Concept Word: ${knowledgeRef.current[currentPageRef.current]?.keyword}
        - Learning Objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective}
        - Core Idea: ${knowledgeRef.current[currentPageRef.current]?.core_idea.map(idea => `${idea.knowledge}`).join('\n')}
        - First Question: ${await getFirstQuestion()}

        **Instructions for the Conversation**:
            1. Initiate Conversation:
                Begin the interaction by posing the first question (recall question), which will guide to the concept word.
                You should use different ways to open the conversation. For example: "Hmm, this part of the story is so interesting! + first question"; "Hey xxx, share with me what you think + first question"; "xxx, let's chat about what you just read! + first question"; etc. 
            2. During the Conversation (Two different questions in total):
                a. Pose Question: Each question should focus on the learning objective to impart the external knowledge. Use scaffolding to guide the child step-by-step in their thinking. Ensure that all questions in the conversation are cohesive.
                b. Evaluate Response: Before responding, evaluate the child's answer, which should fall into one of these categories: Invalid/Correct/Partially Correct/Incorrect/Off topic/Child Asks Question
                c. Respond:
                    i. Acknowledgement: Provide positive feedback for correct answers and encouraging feedback for incorrect answers. If the response is off topic, gently steer the conversation back to the original topic.
                    ii. Explanation:
                        For correct answers, provide a concise explanation to deepen understanding.
                        For incorrect/partially correct answers, scaffold further to guide the child's thinking.
                        For off-topic answers, gently steer the conversation back to the original topic.
                        For child asks question, answer the question with easy-to-understand words.
                        For invalid answers, ask the child to say it again.
                    iii. Follow-up question: if the conversation is not ended, pose one more related question based on previous question to continue the discussion or transition to the end of the conversation.
            3. End Conversation:
                After asking one recall question and one follow-up question, ask if the child has any questions. If the child needs scaffolding, you can use more rounds.
                If they don't have further questions, politely close the interaction with a friendly line like: "It was fun chatting with you! Have a great time reading."

        **Response Guidelines**:
        - Maintain a friendly, conversational tone suitable for a 6-8-year-old child.
        - Keep sentences simple, engaging, and under 25 words.
        - Avoid assuming or making up the child's response. Just wait for the child's response for each turn.
        - Ensure that all responses align with the structured three-turn process, focusing on scaffolding, evaluation, and explanation.   
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `;
        console.log(instruction4Guiding);
        return instruction4Guiding;
    }

    const getInstruction4Correct = (items, evaluation) => {
        const instruction4Correct1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. one follow-up question.
    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the evaluation of the child's response is 'correct', you should acknowledge their answer and tailor your acknowledgement to the context (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!", and more)

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Since the evaluation of the child's response is 'correct', provide a concise explanation to deepen their understanding.

    **Instructions for Pose a Follow-up Question**:
        - Pose one follow-up, open-ended question related to the learning objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective}, and the core idea: ${knowledgeRef.current[currentPageRef.current]?.core_idea.map(idea => `${idea.knowledge}`).join('\n')}.
        Here are some examples of follow-up questions for your reference. Note that you should try to come up with better follow-up questions, instead of directly using these examples.
        ${knowledgeRef.current[currentPageRef.current]?.example_nonrecall_questions.join('\n')}

    **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - Do not end the conversation. You need to address the question first.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        `
        const instruction4Correct2 = `
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
        - Since the evaluation of the child's response is 'correct', you should acknowledge their answer and tailor your acknowledgement to the context (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!", and more)

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Since the evaluation of the child's response is 'correct', provide a concise explanation to deepen their understanding.

    **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - Keep the conclusion part concise, under 15 words. Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples.)
       
    **Instructions for Whole Response**:
        - Do not include any question or question marks in the response.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        `

        // case 1: only one 'correct' or 'correct' after one 'incorrect'/'partially correct'
        let correctCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'correct') {
                correctCount++;
            }
        }
        console.log('correctCount', correctCount);
        if (correctCount === 1) {
            console.log(instruction4Correct1);
            return instruction4Correct1;
        } else {
            console.log(instruction4Correct2);
            return instruction4Correct2;
        }
    }

    const getInstruction4PartialCorrect = (items, evaluation) => {
        const instruction4PartialCorrect1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. one follow-up question.

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the evaluation of the child's response is 'partially correct', you should first provide encouraging acknowledgement and tailor your acknowledgement to the context (e.g., "That's a good try!", "Aha! You're on the right track!", and more).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Do not explicitly tell the child the correct answer.
        
    **Instructions for Pose a Follow-up Question**:
        - Rephrase the ORIGINAL, most recent, last-posed question (which the child answers partially correctly) into a multiple-choice format. Ensure the rephrased question addresses the same topic as the original and uses natural phrasing for the answer options, avoiding labels like "A, B, C." For example: What did Amara's mom and brother do, did they ignore the bat, play with the bat, or wait for a wildlife rescue team?
        - If you are rephrasing the question, do not directly reveal the answer. You should hint the child to think about the correct answer through the rephrased multiple-choice question.
        - Do not end the conversation.
    
     **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `
        const instruction4PartialCorrect2 = `
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
        - Since the evaluation of the child's response is 'partially correct', you should first provide acknowledgement and tailor your acknowledgement to the context (e.g., "That's a good try!", "Aha! You're on the right track!", and more).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

    **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - Keep the conclusion part concise, under 15 words. Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples.)

    **Instructions for Whole Response**:
        - Do not include any question or question marks in the response.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `

        let PartialCorrectCount = 0;
        let correctCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'partially correct' || answer === 'incorrect') {
                PartialCorrectCount++;
            } else if (answer === 'correct') {
                correctCount++;
            }
        }

        if (PartialCorrectCount === 1 || (PartialCorrectCount === 2 && correctCount === 1)) {
            return instruction4PartialCorrect1;
        } else {
            return instruction4PartialCorrect2;
        }
    }

    const getInstruction4Incorrect = (items, evaluation) => {
        const instruction4Incorrect1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. one follow-up question.

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the evaluation of the child's response is 'incorrect', you should acknowledge their effort and tailor your acknowledgement to the context (e.g., "That's a good try!", "Aha! You're on the right track!", and more).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
                
    **Instructions for Pose a Follow-up Question**:
        - Rephrase the ORIGINAL, most recent, last-posed question (which the child answers incorrectly) into a multiple-choice format. Ensure the rephrased question addresses the same topic as the original and uses natural phrasing for the answer options, avoiding labels like "A, B, C." For example: What did Amara's mom and brother do, did they ignore the bat, play with the bat, or wait for a wildlife rescue team?
        - If you are rephrasing the question, do not directly reveal the answer. You should hint the child to think about the correct answer through the rephrased multiple-choice question.
        - Do not end the conversation.
    
     **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - Do not end the conversation.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
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
        - Since the evaluation of the child's response is 'incorrect', you should first provide encouraging feedback (e.g., "That's a good try!", "Aha! You're on the right track!", etc.).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Explain the answer here with easy-to-understand words.
        - Keep your explanation simple, engaging and under 20 words. 

    **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - Keep the conclusion part concise, under 15 words. Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples.)

    **Instructions for Whole Response**:
        - Do not include any question or question marks in the response.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `
        let incorrectCount = 0;
        let correctCount = 0;
        for (const answer of answerRecord) {
            if (answer === 'incorrect' || answer === 'partially correct') {
                incorrectCount++;
            } else if (answer === 'correct') {
                correctCount++;
            }
        }

        if (incorrectCount === 1 || (incorrectCount === 2 && correctCount === 1)) {
            return instruction4Incorrect1;
        } else {
            return instruction4Incorrect2;
        }
    }

    const getInstruction4ChildQuestion = (items, evaluation) => {
        const instruction4ChildQuestion = `
    You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

    Your response should contain three parts: 1. acknowledgement, 2. explanation, and 3. follow-up question or conclusion.

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the child posed a question, you should first acknowledge their effort and tailor your acknowledgement to the context (e.g., Good thinking!", "Oh it's an interesting question!", and more).

    **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Since the child poses a question, answer the question with easy-to-understand words.

    **Situations for Not Posing a Follow-up Question**:
        - You do not need to pose a follow-up question if:
        1. The child has asked more than three questions, or
        2. There are more than four rounds of questions.
        In these cases, refer to **Instructions for Conclusion**. You do not need to end the conversation early, like only having two rounds of conversation.

    **Instructions for Pose a Follow-up Question**:
        - After you answer the child's question, and there are less than three rounds of questions, ask the ORIGINAL question, which has not been answered, to the child.
        ${knowledgeRef.current[currentPageRef.current]?.example_nonrecall_questions.join('\n')}

    **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - You cannot conclude the conversation if you're posing a follow-up question.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - Keep the conclusion part concise, under 15 words.
        - Here is an example: "There are many interesting things in the story! Let's continue reading the story." (Make sure to use different conclusions based on the examples.)

    **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - If your response includes a question, do not end the conversation. You need to address the question first.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        - Keep the conversation safe, civil, and appropriate for children. Do not include any inappropriate content, such as violence, sex, drugs, etc.
        `;
        console.log(instruction4ChildQuestion);
        return instruction4ChildQuestion;
    }

    const getInstruction4Invalid = (items, evaluation) => {
        const instruction4Invalid = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

        Since the evaluation of the child's response is 'invalid', you should respond with a friendly line (e.g., "I didn't hear your answer, can you say it again?", "Oh I didn't catch that, can you say it again?")
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        `;
        console.log(instruction4Invalid);
        return instruction4Invalid;
    }

    const getInstruction4OffTopic = (items, evaluation) => {
        const instruction4OffTopic = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. Now your task is to generate a response to the child’s latest answer, based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's latest response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

        Start by acknowledging the child’s response (e.g., “Interesting idea!”). Then guide the conversation back to the original question you asked or conclude the interaction if the conversation has gone beyond three rounds.
        - Speak ${audioSpeed <= 1 ? 'slower' : 'faster'} than usual (like ${audioSpeed} of your normal speed) for improved understanding by children.
        `;
        console.log(instruction4OffTopic);
        return instruction4OffTopic;
    }

    const getInstruction4FollowUp = (items, evaluation) => {
        const instruction4FollowUp = `
        You need to pose a follow-up question based on the following information: 
        1. conversation history: 
        ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        2. the evaluation of the child's response: ${evaluation};
        3. story text: ${pages[currentPageRef.current]?.text.join(' ')}

        Follow the following instructions:
        Your response should contain three parts: acknowledgement, explanation, and follow-up question or conclusion.

        **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements tailored to the context. Do not repeat the same acknowledgement as in the conversation history. 
        - Here are different situations for acknowledgement based on the child's response:
            1. If the evaluation is 'invalid', reply with a friendly line (e.g., "I didn't hear your answer, can you say it again?", "Oh I didn't catch that, can you say it again?")
            2. If the evaluation is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try again!", "Let's think about it together!", "It's okay if you don't remember!", "Let's think again!", "Aha! You jumped ahead of me a little bit, but that’s okay.")
            3. If the evaluation is 'partially correct', you should first provide encouraging feedback (e.g., "That's a good try!", "Aha! You're on the right track!"), then hint the child to think about the correct answer.
            4. If the evaluation is 'correct', you should first acknowledge their answer (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!")
            5. If the evaluation is 'child asks question', you should acknowledge their question (e.g., “Good question!”, “Oh it’s an interesting question!”)
            6. If the evaluation of the child's response is 'off-topic', you should steer the conversation back to the original topic.
        
        **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Here are different situations for explanation based on the child's response:
            1. If the evaluation is 'correct', provide a concise explanation to deepen their understanding.
            2. If the evaluation is 'incorrect', briefly explain why what the child has chosen is not right (without explicitly telling them they did wrong) 
            3. If the evaluation is 'partially correct', hint the child to think to get the correct answer (without explicitly telling the correct answer)
            4. If the evaluation is 'child asks question', answer the child’s question using simple words.

        **Situations for Not Posing a Follow-up Question**:
        - You do not need to pose a follow-up question if:
            1. You think the learning objective has been addressed effectively (usually after 4 rounds of conversation in total, and this is the ${items.length/2} round of conversation), or
            2. You are addressing the first question: the child failed to answer the first question correctly and you rephrased the first question into a multiple-choice question, or
            3. The child answers incorrectly two times in a row, or
            4. You already asked three different questions in total, or 
            5. There are more than four rounds of questions.
        In these cases, you can end the conversation (refer to **Instructions for Conclusion**). 
        
        **Instructions for Pose a Follow-up Question**:
         - If you are posing a follow-up question, you do not need to conclude the conversation.
         - Here are the only situations you need to pose a follow-up question based on the child's response:
            1. If the evaluation of the child's response is 'correct', you should pose a follow-up question related to the learning objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective}.
            Here are some examples of follow-up questions for your reference. Note that you should try to come up with better follow-up questions, instead of directly using these examples.
            ${knowledgeRef.current[currentPageRef.current]?.example_nonrecall_questions.join('\n')}
            2. If the evaluation of the child's response is 'partially correct' or 'incorrect' to the previous question:
                i. If this is the first time the child answers incorrectly (you haven't rephrased the previous question into a multiple-choice question), rephrase the previous question into a multiple-choice question. The rephrased question should ask about the same thing as the previous question, but in a multiple-choice format. For the options of the multiple-choice question, avoid using “A, B, C” to make it sound more natural. (e.g., What did Amara’s mom and brother do? Did they ignore the bat, play with the bat, or wait for a wildlife rescue team?)
                ii.  If the child answers incorrectly more than one time (it means you already rephrased into a multiple-choice question), do not rephrase the question or ask the question in the same way again. Do not pose a new question. You should provide the correct answer and end the conversation (refer to **Instructions for Conclusion**).
            3. If the evaluation is 'question-posed', and you have not asked three different questions in total, pose a follow-up question related to the learning objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective} after the explanation.

        **Instructions for Conclusion**:
        - Do not use question marks in the conclusion.
        - You cannot conclude the conversation if you’re posing a follow-up question.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - If the child repeatedly answers incorrectly, you should provide the correct answer, then transition to a conclusion.
        - Keep the conclusion part concise, under 15 words.
        - Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples.)

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
        1. Read the chat history to find the last question you asked.
        2. Ignore the chat history. Say "Hey, I didn't hear your answer." and ADD the last question you asked.
        3. Make sure to ask this exact question ONCE, and do not say or ask anything else.
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
        if (timer >= 10 && !userRespondedRef.current && isKnowledge) {
          console.log('User did not respond in 10 seconds. Sending another message...');
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
                if(timerRef.current) clearInterval(timerRef.current);
                // if the item starts with <test>, delete it
                if (item?.content[0]?.transcript?.startsWith('<')) {
                    // keep the item id, and when the item status is completed, delete it
                    setItemToDelete(item.id);
                    console.log('evaluation result', item.content[0]?.transcript);
                    if (item.status === 'completed') {
                        console.log('!!! deleting item', item.content[0]?.transcript);
                        // setEvaluation(item.content[0]?.transcript.replace('<eval>', '').trim());
                        try {
                            await client.realtime.send('conversation.item.delete', {
                                item_id: item.id
                            });
                            const answerOrder = Math.floor(items.length / 2) - 1;
                            // make sure only update answerRecord if all answers in answerRecord are not null before the answerOrder
                            let allAnswersNotNull = true;
                            for (let i = 0; i < answerOrder; i++) {
                                if (answerRecord[i] === null || answerRecord[i] === undefined) {
                                    allAnswersNotNull = false;
                                    break;
                                }
                            }
                            console.log('answerOrder', answerOrder);
                            console.log('allAnswersNotNull', allAnswersNotNull);
                            if (allAnswersNotNull && (!(answerRecord[answerOrder] !== null && answerRecord[answerOrder] !== undefined))) {
                                answerRecord[answerOrder] = item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim();
                            }
                            console.log('answerRecord', answerRecord);
                        } catch (error) {
                            console.log('error', error);
                        }
                        console.log('items', items);
                        console.log('items to delete', itemToDelete);
                        // only update answerRecord after the item is deleted
                        
                        // if this is the first completed item for the item id, send a response
                        if (item.id !== itemToRespond && item.role === 'assistant' && items[items.length - 1]?.status === 'completed') {
                            console.log('now generating response for', item.content[0]?.transcript.replace('<eval>', '').trim());
                            setItemToRespond(item.id);
                            // send this instruction after the item is completed
                            setTimeout(async () => {
                                // if the string has </eval>, remove it
                                const evaluation = item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim();
                                console.log('evaluation', evaluation);
                                switch (evaluation) {
                                    case 'correct':
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4Correct(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                    case 'partially correct':
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4PartialCorrect(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                    case 'incorrect':
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4Incorrect(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                    case 'off-topic':
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4OffTopic(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                    case 'child asks question':
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4ChildQuestion(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                    case 'invalid':
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4Invalid(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                    default:
                                        await client.realtime.send('response.create', {
                                            response: {
                                                "modalities": ["text", "audio"],
                                                "instructions": getInstruction4FollowUp(items, item.content[0]?.transcript.replace('<eval>', '').replace('</eval>', '').trim())
                                            }
                                        });
                                        userRespondedRef.current = false;
                                        break;
                                }
                            }, 1000);
                        }
                    }
                }
                else if (item.id !== itemToDelete || (!item.content[0]?.transcript?.startsWith('<'))) {
                    // console.log('logging this item: ', item.content[0]?.transcript);
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
                        
                        const chatWindow = document.getElementById('chat-window');
                        if (chatWindow) {
                            chatWindow.scrollTop = chatWindow.scrollHeight;
                        }
                        if (item.role === 'assistant') {
                            // if the last item does not end with a question mark, it means the conversation is ended
                            if (!item?.content[0]?.transcript?.endsWith('?') && !item?.content[0]?.transcript?.endsWith('talk.')) {
                                while (wavStreamPlayer.isPlaying() || isReplayingRef.current) {
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }
                                // console.log('isReplaying', isReplayingRef.current);
                                // if (isReplayingRef.current) {
                                //     console.log('isReplaying', isReplayingRef.current);
                                //     while (isReplayingRef.current) {
                                //         await new Promise(resolve => setTimeout(resolve, 100));
                                //     }
                                // }
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

    const handleProgressBarClick = (event) => {
        const progressBar = event.currentTarget;
        const clickPosition = event.clientX - progressBar.getBoundingClientRect().left;
        const progressBarWidth = progressBar.offsetWidth;
        const clickRatio = clickPosition / progressBarWidth;
        const newPage = Math.floor(clickRatio * pages.length);
    
        if (newPage >= 0 && newPage < pages.length) {
            audioRef.current.pause();
            setIsKnowledge(false);
            // setCurrentPage(newPage);
            currentPageRef.current = newPage;
            sentenceIndexRef.current = 0;
            localStorage.setItem(`${title}-currentPage`, newPage);
            localStorage.setItem(`${title}-currentSentence`, 0);
        }
    };

    const handleReplay = async (index) => {
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
        const replayAudio = replayAudioRef.current;
        console.log('---replayAudio', currentPageChatHistory, index);
        replayAudio.src = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory][index].formatted.file.url;
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
        console.log('speed changed', newValue);
        setAudioSpeed(newValue);
    };

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.playbackRate = audioSpeed;
        }
        localStorage.setItem(`${title}-audioSpeed`, audioSpeed);
    }, [audioSpeed]);

    const handlePenguinClick = async () => {
        audioRef.current.pause();
        setIsPlaying(false);
        // setIsAsking(true);
        isAskingRef.current = true;
        if (isMinimizedChat) {
            setIsMinimizedChat(false);
            return;
        }
        console.log('penguin clicked to ask question');
        if (!clientRef.current.realtime.isConnected()) {
            if (!isKnowledge) {
                if (currentPageRef.current === 6 && title === 'Why Frogs are Wet') {
                    setupClient(await getInstruction4Frogs());
                } else {
                    setupClient(await getInstruction4Asking());
                }
            } else {
                setupClient(await getInstruction4Guiding());
            }
            setIsClientSetup(true);
            console.log('client is setup!');
        } else {
            if (!isKnowledge) {
                if (currentPageRef.current === 6 && title === 'Why Frogs are Wet') {
                    updateClientInstruction(await getInstruction4Frogs());
                } else {
                    updateClientInstruction(await getInstruction4Asking());
                }
            } else {
                updateClientInstruction(await getInstruction4Guiding());
            }
        }
    }

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
                content: item.content[0].transcript,
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

    const handleCloseMessage = () => {
        // hide the message box
        // setIsFirstTime(false);
        // set the button to be invisible
        const messageBox = document.getElementById('penguin-message');
        if (messageBox) {
            messageBox.style.display = 'none';
        }
        audioRef.current.play();
        audioRef.current.playbackRate = audioSpeed;
        setIsPlaying(true);
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
                {/* <Box id='page-progress' display="flex" justifyContent="center" mt={2} gap="1rem">
                    <Box onClick={handleProgressBarClick} sx={{ cursor: 'pointer', width: '100%' }}>
                        <LinearProgress color="neutral" size="lg" determinate value={(currentPageRef.current + 1) / pages.length * 100} />
                    </Box>
                    <h4 style={{ marginLeft: '16px', fontSize: '20px', color: 'rgba(0,0,0,0.5)' }}>Page <span style={{ color: 'rgba(0,0,0,1)' }}>{currentPageRef.current + 1}</span> of {pages.length}</h4>
                </Box> */}
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
                <div id='penguin-box' onClick={handlePenguinClick}>
                    <img
                    src='./files/imgs/penguin.svg'
                    alt='penguin'
                    style={{ width: '128px' }}
                    className={isShaking ? 'shake' : ''}
                />
                </div>
                {/* the message should appear for 5 seconds and then disappear */}
                {/* {isFirstTime && (
                    <div className='penguin-message' id='penguin-message'>
                        <div className='message-tail'></div>
                        { `Hey ${user}, I'm your reading mate. You can click me to ask anything about the story! 😃`}
                        <button id='close-message' onClick={handleCloseMessage}>
                            <h4 style={{ color: 'white', fontSize: '20px', fontFamily: 'Cherry Bomb', zIndex: 2 }}>Got it!</h4>
                        </button>
                    </div>
                )} */}
            </div>
            {(isAskingRef.current || isKnowledge) && !isMinimizedChat && (
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
                        , , 
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
                       
                    <Box id='chat-window'>
                        
                        {[...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].length == 0 && (
                            <Box id='loading-box'>
                                <AiOutlineLoading id='loading-icon' size={40} color='#7AA2E3' />
                            </Box>
                        )}
                        {[...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].filter(msg => msg.type === 'message').map((msg, index) => (
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
                                        <Image id='chatbot-avatar' src='./files/imgs/penguin.svg'></Image>
                                        <Box id="msg-bubble" style={{ position: 'relative' }} onClick={() => handleReplay(index)}>
                                            {!msg.content[0].transcript.startsWith('<') && (
                                                <h5 level='body-lg' style={{margin: '0px', marginRight: '30px'}}>
                                                    {msg.content[0].transcript}
                                                </h5>
                                            )}
                                            {msg.status === 'completed' && !msg.content[0].transcript.startsWith('<') && (
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
                                    zIndex: 100
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
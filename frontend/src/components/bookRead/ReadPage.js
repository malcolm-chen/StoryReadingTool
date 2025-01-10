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
import { FaCirclePlay } from "react-icons/fa6";
import { MdClose } from "react-icons/md";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";

// let currentPage = 0;
// let sentenceIndex = 0;
const apiUrl = process.env.REACT_APP_API_URL;

const ReadChatPage = () => {
    console.log('ReadChatPage rendered');
    const location = useLocation();
    const navigate = useNavigate();
    const user = localStorage.getItem('username') || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [chatHistory, setChatHistory] = useState([]);
    const [isKnowledge, setIsKnowledge] = useState(false);
    const [isClientSetup, setIsClientSetup] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);
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
    const [isMinimizedChat, setIsMinimizedChat] = useState(false);
    const [chatBoxSize, setChatBoxSize] = useState({ width: 400, height: 300 });
    const [autoPage, setAutoPage] = useState(true);
    const [audioSpeed, setAudioSpeed] = useState(1);
    const [isPlaying, setIsPlaying] = useState(true);
    const [isAsking, setIsAsking] = useState(false);
    const [isAsked, setIsAsked] = useState(false);
    const recorderControls = useVoiceVisualizer();
    const [itemToDelete, setItemToDelete] = useState(null);
    const [itemToRespond, setItemToRespond] = useState(null);
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
                    image: `files/books/${title}/pages/page${index + 1}.png`,
                    text: storyText[index]
                }));
                setPages(loadedPages);
            } catch (error) {
                console.error('Error loading story:', error);
            }
        };
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
            askedQuestionsRef.current = askedQuestions;
            if (askedQuestions.length === 0) {
                setIsFirstTime(true);
            }
            // setIsFirstTime(true);
        }
        loadStory();
        loadDictionary();
        loadAskedQuestions();
        audioRef.current.play();
    }, []);

    useEffect(() => {
        if (isFirstTime) {
            audioRef.current.pause();
            setIsPlaying(false);
            setTimeout(() => {
                setIsFirstTime(false);
                audioRef.current.play();
                setIsPlaying(true);
            }, 5000);
        }
    }, [isFirstTime]);

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
                        // check if the client is not setup for guiding
                        if (!clientRef.current.realtime.isConnected()) {
                            console.log('setting up client for guiding');
                            setupClient(await getInstruction4Guiding());
                            setIsClientSetup(true);
                        } else {
                            console.log('resetting client for guiding');
                            updateClientInstruction(await getInstruction4Guiding());
                        }
                    } else {
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
    }, [pages, currentPageRef.current]);

    const handlePrevPage = async () => {
        console.log('moving to previous page', currentPageRef.current);
        if (currentPageRef.current > 0) {
            audioRef.current.pause();
            //setIsPlaying(false);
            audioRef.current.currentTime = 0;
            setIsKnowledge(false);
            setIsAsking(false);
            setIsAsked(false);
            setIsMinimizedChat(false);
            setIsExpandedChat(false);
            setChatHistory([]);
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
        }
    };

    const handleNextPage = async () => {
        console.log('moving to next page', currentPageRef.current);
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // setIsPlaying(false);
        setIsKnowledge(false);
        setIsAsking(false);
        setIsAsked(false);
        setIsMinimizedChat(false);
        setIsExpandedChat(false);
        setChatHistory([]);
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
    };

    const getFirstQuestion = async () => {
        const firstQuestionSet = knowledgeRef.current[currentPageRef.current]?.first_question_set;
        console.log('firstQuestionSet', firstQuestionSet);
        console.log('asked question', askedQuestionsRef.current[currentPageRef.current]);
        if (firstQuestionSet?.length === askedQuestionsRef.current[currentPageRef.current]?.length) {
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


    function getInstruction4Asking() {
        const instruction4Asking = `
        You are a friendly chatbot engaging with a child named ${user}, who is reading a storybook and asking questions about it.

        Instructions:
        - Start by asking 'Hey ${user}, what do you want to know about this page?'
        - If you cannot recognize the child's answer in English, say, "I didn't hear your answer, can you say it again?"
        - You need to actively answer the child's questions and provide simple explanations like you are talking to a 5 year old to help them comprehend the story.

        **Important Reminders**:
        - Maintain concise responses: each should be no more than 25 words, using simple tier1 or tier2 vocabulary.
        - Do not make up the child's response, if you do not get response, just ask again.
        - Do not ask questions.
        - Only recognize the child's answer in English.

        Essential Details:
            - **Story Title**: ${title}
            - **Story Text for Current Page**: ${pages[currentPageRef.current]?.text.join(' ')}
        `;
        return instruction4Asking;
    }

    function getInstruction4Evaluation(items) {
        const instruction4Evaluation = `
        **Instructions for Evaluation**:
        You need to evaluate the child’s response based on the following inputs:
        - Conversation History: ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')}
        - Child’s Latest Response: The most recent input from the child.
        - Story Context: ${pages[currentPageRef.current]?.text.join(' ')}
        Focus only on evaluating the child’s response to the latest question.

        **Steps for Evaluation**:
        Step 1: Check Response Validity
        If the response is empty, too short, or sent by mistake, mark it as "invalid".
        Step 2: Evaluate Valid Responses
        For responses that contain meaningful content, use the following criteria:
        - Correct: The response is accurate (or partially accurate) and directly relevant to the question.
        - Partially Correct: The response shows partial accuracy and relevance. For example, in a multiple-choice question, selecting one correct option qualifies as partially correct.
        - Incorrect: The response is inaccurate and shows no understanding of the question (e.g., "I don’t know," "I don’t remember," or irrelevant guesses).
        - Off-topic: The response is unrelated to the question or the story context.
                    
        **Response Format**:
        Precede each evaluation with the tag <eval>. Examples include:
        - <eval>invalid
        - <eval>correct
        - <eval>partially correct
        - <eval>incorrect
        - <eval>off-topic
        `;
        console.log(instruction4Evaluation);
        return instruction4Evaluation;
    }

    // update the instruction4Guiding when the currentPageRef.current changes   
    async function getInstruction4Guiding() {
        const instruction4Guiding = `
        You are a friendly chatbot engaging with a 6-8-year-old child named ${user}, who is reading a storybook. From now on, your role is to guide an interactive conversation based on the story information and instructions to enrich their knowledge.
            
        **Story Information**:
        - Story Title: ${title}
        - Story Text: ${pages[currentPageRef.current]?.text.join(' ')}
        - Concept Word: ${knowledgeRef.current[currentPageRef.current]?.keyword}
        - Learning Objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective}
        - Core Idea: ${knowledgeRef.current[currentPageRef.current]?.core_idea.map(idea => `${idea.knowledge}`).join('\n')}
        - First Question: ${await getFirstQuestion()}

        **Instructions for the Conversation**:
            1. Initiate Conversation:
                Begin the interaction by posing the first question, which will guide to the concept word.
            2. During the Conversation (Three Turns in All):
                a. Pose Question: Each question should focus on the learning objective to impart the external knowledge. Use scaffolding to guide the child step-by-step in their thinking. Ensure that all questions in the conversation are cohesive.
                b. Evaluate Response: Before responding, evaluate the child’s answer, which should fall into one of three categories: Correct/Incorrect/Off topic
                c. Respond:
                    i. Acknowledgement: Provide positive feedback for correct answers and encouraging feedback for incorrect answers. If the response is off topic, gently steer the conversation back to the original topic.
                    ii. Explanation:
                        For correct answers, provide a concise explanation to deepen understanding.
                        For incorrect answers, scaffold further to guide the child’s thinking.
                    iii. Follow-up question: if the conversation is not ended, pose a related question based on previous question to continue the discussion or transition to the end of the conversation.
            3. End Conversation:
                After asking 3 to 4 questions in total, ask if the child has any questions. If the child needs scaffolding, you can use more rounds.
                If they don’t have further questions, politely close the interaction with a friendly line like: "It was fun chatting with you! Have a great time reading."

        **Response Guidelines**:
        - Maintain a friendly, conversational tone suitable for a 6-8-year-old child.
        - Keep sentences simple, engaging, and under 25 words.
        - Use English exclusively for questions and responses.
        - Avoid assuming or making up the child’s response. If you do not get response, just ask again.
        - Ensure that all responses align with the structured three-turn process, focusing on scaffolding, evaluation, and explanation.

        You should learn from the following examples to mimic the teacher's style of teaching.
        **In-Context Learning Examples**:
        [Example 1]
        Teacher's first question: What is Amara’s favorite animal?
        Child: Bats
        Teacher: 
            {Acknowledgement}: Yes, that’s correct. 
            {Explanation}: Bats are Amara’s favorite animals!
            {Follow-up question}: What is one thing you know about bats?
        Child: They can fold their wings
        Teacher:
            {Acknowledgement}: Wow, that is a great observation!
            {Explanation}: Like you said, bats can fold their wings in different situations.
            {Follow-up question}: When do you think bats fold their wings? 
        Child: Sleep
        Teacher:
            {Acknowledgement}: Great job! That’s what I am thinking about too!
            {Explanation}: Bats fold their wings when they sleep, but guess what? They also fold them when it rains to stay dry, just a rain jacket! Isn’t that so interesting?

        [Example 2]
        Teacher's first question: How did Amara and her family make sure the bat is safe without touching it?
        Child: Another person can catch it safely
        Teacher:
            {Acknowledgement}: Yeah, good thinking!
            {Explanation}: Amara and her family wait for the other person to catch it, so that the bat won't get hurt.
            {Follow-up question}: Who is the person they are waiting for?
        Child: The person who gets pets can look after them
        Teacher:
            {Acknowledgement}: Ah! Interesting idea! 
            {Explanation}: Let’s talk about what to call the person who takes care of pets. Think about how you call the person who helps in fire emergencies a firefighter
            {Follow-up question}: What do we call that person who helps catch and take care of the bat?
        Child: I don’t remember
        Teacher:
            {Acknowledgement}: That’s okay!
            {Explanation}: The people who help animals like the bat are called a “wildlife rescuer”. They are trained to help wild animals like bats stay safe.
            {Follow-up question}: Can we keep bats as regular pets like dogs and cats?
        Child: No
        Teacher:
            {Acknowledgement}: I bet!  
            {Explanation}: Bats aren’t pets like dogs and cats because they are wild animals and they need to live in nature.

        [Example 3]
        Teacher's first question: What did the wildlife rescue team do with the bat?
        Child: Kept it safe
        Teacher:
            {Acknowledgement}: Excellent! You are really paying attention to the story details!
            {Explanation}: The wildlife rescue team is making sure the bat is safe and helping them go back to nature. 
            {Follow-up question}: Let’s make a closer observation. What did they use to keep the bat safe?
        Child: A big jar so it can fly around
        Teacher:
            {Acknowledgement}: Aha! You jumped ahead of me a little bit, but that’s okay. 
            {Explanation}: Before the bat got into the jar, the wildlife rescuer first used a towel to gently catch the bat and then placed it in the jar. 
            {Follow-up question}: What did Amara notice about the bat’s appearance when she saw it up close? 
        Child: Different than a dog and a cat
        Teacher:
            {Acknowledgement}: You’re on the right track! 
            {Explanation}: Bats look different from dogs and cats because bats have wings, while dogs and cats do not.
            {Follow-up question}: Let’s take a closer look at this bat’s picture. How did Amara describe the bat’s face?
        Child: I think it’s kind of fluffy
        Teacher:
            {Acknowledgement}: Exactly! 
            {Explanation}: The bat has a fluffy face
            {Follow-up question}: Do you know what beady eyes are?
        Child: like the bat’s eyes
        Teacher:
            {Acknowledgement}: Yes bat’s eyes are beady.
            {Explanation}: Beady means small, shiny, and round, just like the bat’s eyes.
        `;
        console.log(instruction4Guiding);
        return instruction4Guiding;
    }

    const getInstruction4FollowUp = (items, evaluation) => {
        console.log('evaluation', evaluation);
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
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Here are different situations for acknowledgement based on the child's response:
            1. If the evaluation is 'invalid', reply with a friendly line (e.g., "I didn't hear your answer, can you say it again?", "Oh I didn't catch that, can you say it again?")
            2. If the evaluation is 'incorrect', you should first provide encouraging feedback (e.g., "Let's try again!", "Let's think about it together!", "It's okay if you don't remember!", "Let's think again!", "Aha! You jumped ahead of me a little bit, but that’s okay.")
            3. If the evaluation is 'partially correct', you should first provide encouraging feedback (e.g., "That's a good try!", "Aha! You're on the right track!"), then hint the child to think about the correct answer.
            4. If the evaluation is 'correct', you should first acknowledge their answer (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!")
            5. If the evaluation is 'question-posed', you should acknowledge their question (e.g., “Good question!”, “Oh it’s an interesting question!”)
            6. If the evaluation of the child's response is 'off-topic', you should steer the conversation back to the original topic.
        
        **Instructions for Explanation**:
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Here are different situations for explanation based on the child's response:
            1. If the evaluation is 'correct', provide a concise explanation to deepen their understanding.
            2. If the evaluation is 'incorrect', briefly explain why what the child has chosen is not right (without explicitly telling them they did wrong) 
            3. If the evaluation is 'partially correct', hint the child to think to get the correct answer (without explicitly telling the correct answer)
            4. If the evaluation is ‘question-posed’, answer the child’s question using simple words.

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
            Here are some examples of follow-up questions for your reference, you don't need to use all of them:
            ${knowledgeRef.current[currentPageRef.current]?.example_nonrecall_questions.join('\n')}
            2. If the evaluation of the child's response is 'partially correct' or 'incorrect' to the previous question:
                i. If this is the first time the child answers incorrectly (you haven't rephrased the previous question into a multiple-choice question), rephrase the previous question into a multiple-choice question. The rephrased question should ask about the same thing as the previous question, but in a multiple-choice format. For the options of the multiple-choice question, avoid using “A, B, C” to make it sound more natural. (e.g., What did Amara’s mom and brother do? Did they ignore the bat, play with the bat, or wait for a wildlife rescue team?)
                ii.  If the child answers incorrectly more than one time (it means you already rephrased into a multiple-choice question), do not rephrase the question or ask the question in the same way again. Do not pose a new question. You should provide the correct answer and end the conversation (refer to **Instructions for Conclusion**).
            3. If the evaluation is 'question-posed', and you have not asked three different questions in total, pose a follow-up question related to the learning objective: ${knowledgeRef.current[currentPageRef.current]?.learning_objective} after the explanation.

        **Instructions for Conclusion**:
        - You cannot conclude the conversation if you’re posing a follow-up question.
        - If you are not asking a question, after the explanation, transition to a conclusion. 
        - If the child repeatedly answers incorrectly, you should provide the correct answer, then transition to a conclusion.
        - Keep the conclusion part concise, under 15 words.
        - Here is an example: "It was fun chatting with you! You can click the close button and let's continue reading the story." (Make sure to use different conclusions based on the examples.)

        **Instructions for Whole Response**:
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence.
        - If your response includes a question, you can't conclude the conversation. You need to address the question first.
        `;
        console.log(instruction4FollowUp);
        return instruction4FollowUp;
    }

    const updateClientInstruction = async (instruction) => {
        const client = clientRef.current;
        client.updateSession({ instructions: instruction });
        client.realtime.send('response.create');
        console.log(instruction);
    }

    const setupClient = async (instruction) => {
        (async () => {
            console.log('setting up client');
            console.log('currentPageRef.current', currentPageRef.current);
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            client.updateSession({ instructions: instruction });
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1' } });
            // if (client.tools.length == 0) {
            //     client.addTool({
            //         "name": "answer_evaluation",
            //         "description": "After the child answers the question, and before you provide feedback, evaluate the answer",
            //         "parameters": {
            //             "type": "object",
            //             "properties": {
            //                 "child_response": {
            //                     "type": "string",
            //                     "description": "the child's answer",
            //                 }
            //             },
            //             "required": ["child_response"]
            //         }
            //     },
            //     async ({child_response}) => {
            //         console.log(child_response);
            //     });
            // }
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
            client.on('conversation.item.appended', (item) => {
                console.log('conversation.item.appended');
                // console.log(item);
            });
            client.on('conversation.updated', async ({ item, delta }) => {
                const items = client.conversation.getItems();
                // console.log(item, item.content[0]?.transcript);
                // if the item starts with <test>, delete it
                if (item.content[0]?.transcript?.startsWith('<')) {
                    // keep the item id, and when the item status is completed, delete it
                    setItemToDelete(item.id);
                    console.log('evaluation result', item.content[0]?.transcript);
                    if (item.status === 'completed') {
                        console.log('!!! deleting item', item.content[0]?.transcript);
                        // setEvaluation(item.content[0]?.transcript.replace('<eval>', '').trim());
                        await client.realtime.send('conversation.item.delete', {
                            item_id: item.id
                        });
                        // if this is the first completed item for the item id, send a response
                        if (item.id !== itemToRespond && item.role === 'assistant' && items[items.length - 1]?.status === 'completed') {
                            setItemToRespond(item.id);
                            // send this instruction after the item is completed
                            setTimeout(async () => {
                                await client.realtime.send('response.create', {
                                    response: {
                                        "modalities": ["text", "audio"],
                                        "instructions": getInstruction4FollowUp(items, item.content[0]?.transcript.replace('<eval>', '').trim())
                                    }
                                });
                            }, 1000);
                        }
                    }
                }
                else if (item.id !== itemToDelete || (!item.content[0]?.transcript?.startsWith('<'))) {
                    console.log('logging this item: ', item.content[0]?.transcript);
                    if (delta?.transcript) {
                        setChatHistory(items);
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
                        const wavFile = await WavRecorder.decode(
                            item.formatted.audio,
                            24000,
                            24000
                        );
                        item.formatted.file = wavFile;
                        setChatHistory(items);
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

    const handleEndChat = () => {
        setIsEnding(false);
        // setIsClientSetup(false);
        handleNextPage();
    }

    const handleCaptionToggle = () => {
        setShowCaption(!showCaption);
    }

    // useEffect(() => {
    //     console.log('showCaption changed', showCaption);
    //     if (!showCaption) {
    //         console.log('showCaption is false');
    //         // set the max-height of the book-container to calc(100% - 100px)
    //         const bookContainer = document.getElementById('book-container');
    //         bookContainer.style.maxHeight = 'calc(100% - 30px)';
    //         // set the max-height of the bottom-box to 0
    //         const bottomBox = document.getElementById('bottom-box');
    //         bottomBox.style.flexBasis = '30px';
    //     } else {
    //         console.log('showCaption is true');
    //         // set the max-height of the book-container to 100%
    //         const bookContainer = document.getElementById('book-container');
    //         bookContainer.style.maxHeight = 'calc(100% - 130px)';
    //         // set the flex-basis of the bottom-box to 130px
    //         const bottomBox = document.getElementById('bottom-box');
    //         bottomBox.style.flexBasis = '130px';
    //     }
    // }, [showCaption]);

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (currentPageRef.current < pages.length - 1) {
                handleNextPage();
            }
        },
        onSwipedRight: () => {
            if (currentPageRef.current > 0) {
                handlePrevPage();
            }
        },
        preventDefaultTouchmoveEvent: true,
        trackMouse: true
    });

    const handleImageClick = (event) => {
        console.log('image clicked', currentPageRef.current);
        const { left, width, top, height } = event.currentTarget.getBoundingClientRect();
        const clickX = event.clientX - left;
        const clickY = event.clientY - top;
    
        if (clickX < width / 2 && clickY > height / 3) {
            handlePrevPage();
        } else if (clickX > width / 2 && clickY > height / 3) {
            console.log('moving to next page', currentPageRef.current);
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
        replayAudio.src = chatHistory[index].formatted.file.url;
        // pause the replayAudio
        replayAudio.pause();
        replayAudio.currentTime = 0;
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
    
    const handleMinimizeChat = async () => {
        setIsMinimizedChat(!isMinimizedChat);
        setIsExpandedChat(false);
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
    }

    const handleAutoPageToggle = () => {
        setAutoPage((prev) => !prev);
    };

    const handleAudioSpeedChange = (event, newValue) => {
        setAudioSpeed(newValue);
    };


    useEffect(() => {
        audioRef.current.playbackRate = audioSpeed;
    }, [audioSpeed]);

    const handlePenguinClick = async () => {

        audioRef.current.pause();
        setIsPlaying(false);
        setIsAsking(true);
        if (isMinimizedChat) {
            setIsMinimizedChat(false);
            return;
        }
        console.log('penguin clicked to ask question');
        if (!clientRef.current.realtime.isConnected()) {
            if (!isKnowledge) {
                setupClient(getInstruction4Asking());
            } else {
                setupClient(await getInstruction4Guiding());
            }
            setIsClientSetup(true);
            console.log('client is setup!');
        } else {
            if (!isKnowledge) {
                updateClientInstruction(getInstruction4Asking());
            } else {
                updateClientInstruction(await getInstruction4Guiding());
            }
        }
    }

    const processChatHistory = (chatHistory) => {
        const newChatHistory = [];
        let index = 0;
        for (const item of chatHistory) {
            // const formData = new FormData();
            // formData.append('audio', item.formatted.blob, `${user}-${title}-${currentPageRef.current}-${index}.mp3`);
            const newItem = {
                id: item.id,
                role: item.role,
                content: item.content[0].transcript,
                audio: item.formatted.audio
            }
            newChatHistory.push(newItem);
            index++;
        }
        console.log('newChatHistory', newChatHistory);
        return newChatHistory;
    }

    const handleCloseChat = async () => {
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
        if (isKnowledge) {
            setIsKnowledge(false);
            setTimeout(() => {
                setIsPlaying(true);
                // audioRef.current.play();
                handleNextPage();
            }, 500);
        }
        else {
            setIsAsking(false);
            audioRef.current.play();
            setIsPlaying(true);
        }
        setIsAsked(true);
        // send the chat history to backend
        console.log('chatHistory to save', chatHistory);
        const newChatHistory = processChatHistory(chatHistory);
        try {
            const data = {
                chatHistory: newChatHistory,
                user: user,
                title: title,
                page: currentPageRef.current
            }
            const formData = new FormData();
            formData.append('data', JSON.stringify(data));
            const response = await fetch(`${apiUrl}/api/chat_history`, {
                method: 'POST',
                body: formData
            });
        } catch (error) {
            console.error('Error sending chat history to backend', error);
        }
    }

    const handleCloseMessage = () => {
        // hide the message box
        setIsFirstTime(false);
        audioRef.current.play();
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

                    <Box id='book-img' {...swipeHandlers} onClick={handleImageClick}>
                        <div id='caption-btn-box'>
                            <IconButton variant='plain' onClick={handleCaptionToggle} style={{ zIndex: 1, color: 'white', fontSize: '30px', backgroundColor: 'rgba(0,0,0,0)' }}>
                                <FaRegClosedCaptioning />
                            </IconButton>
                        </div>
                        <div id='play-btn-box'>
                            <IconButton id='play-btn' variant='plain' onClick={togglePlayPause} style={{ zIndex: 1, color: 'white', fontSize: '25px', backgroundColor: 'rgba(0,0,0,0)' }}>
                                {isPlaying ? <FaPause /> : <FaPlay />}
                            </IconButton>
                        </div>
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
                <div id='penguin-box' onClick={handlePenguinClick}>
                    <img src='./files/imgs/penguin.svg' alt='penguin' style={{ width: '128px' }}></img>
                    
                </div>
                {/* the message should appear for 5 seconds and then disappear */}
                {isFirstTime && (
                    <div className='penguin-message' >
                        {/* add a triangle at the right of the message box, as a message tail */}
                        <div className='message-tail'></div>
                        { `Hey ${user}, I'm your reading mate. You can click me to ask anything about the story! 😃`}
                        <button id='close-message' onClick={handleCloseMessage}>
                            <h4 style={{ color: 'white', fontSize: '20px', fontFamily: 'Cherry Bomb', zIndex: 2 }}>Got it!</h4>
                        </button>
                    </div>
                )}
            </div>
            {(isAsking || isKnowledge) && !isMinimizedChat && (
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
                                        <Image id='chatbot-avatar' src='./files/imgs/penguin.svg'></Image>
                                        <Box id="msg-bubble" style={{ position: 'relative' }} onClick={() => handleReplay(index)}>
                                            {!msg.content[0].transcript.startsWith('<') && (
                                                <h5 level='body-lg' style={{margin: '0px', marginRight: '30px'}}>
                                                    {msg.content[0].transcript}
                                                </h5>
                                            )}
                                            {msg.status === 'completed' && !msg.content[0].transcript.startsWith('<') && (
                                                <IconButton variant='plain' style={{ 
                                                    position: 'absolute', 
                                                    right: '8px', 
                                                    bottom: '8px', 
                                                }}>
                                                    <FaCirclePlay size={25} color='#2A2278' />
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
                                        <h4 style={{ color: 'white', fontSize: '30px', fontFamily: 'Cherry Bomb' }}>Push to talk!</h4>
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

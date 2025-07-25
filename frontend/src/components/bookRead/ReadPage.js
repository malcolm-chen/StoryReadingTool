import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Box, IconButton, Slider} from '@mui/joy';
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";
import { Image } from 'react-bootstrap';
import { AiOutlineLoading } from "react-icons/ai";
import Header from '../header';
import { useSwipeable } from 'react-swipeable';
import { FaRegClosedCaptioning } from "react-icons/fa6";
import { FaPlay, FaPause, FaCirclePlay, FaCirclePause } from "react-icons/fa6";
import { FaChevronCircleUp, FaChevronCircleDown, FaMinusCircle } from "react-icons/fa";
import { FaCaretRight, FaCaretLeft } from "react-icons/fa6";
import { RiSpeedUpFill } from "react-icons/ri";
import { useVoiceVisualizer, VoiceVisualizer } from "react-voice-visualizer";
import { Howl } from 'howler';
import AudioWave from './AudioWave';
// let currentPage = 0;
// let sentenceIndex = 0;
const apiUrl = process.env.REACT_APP_API_URL;

const ReadChatPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = localStorage.getItem('username') || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [isKnowledge, setIsKnowledge] = useState(false);
    const [isClientSetup, setIsClientSetup] = useState(false);
    const [isFirstTime, setIsFirstTime] = useState(false);
    const [isEnding, setIsEnding] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [canPushToTalk, setCanPushToTalk] = useState(true);
    const [isConversationEnded, setIsConversationEnded] = useState(false);
    const [showCaption, setShowCaption] = useState(true);
    const [isExpandedChat, setIsExpandedChat] = useState(false);
    const [isMinimizedChat, setIsMinimizedChat] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(localStorage.getItem(`${title}-audioSpeed`) ? parseFloat(localStorage.getItem(`${title}-audioSpeed`)) : 1);
    const [speedSliderValue, setSpeedSliderValue] = useState(audioSpeed);
    const [chatBoxSize, setChatBoxSize] = useState({ width: 400, height: 300 });
    const [isPlaying, setIsPlaying] = useState(true);
    const [replayingIndex, setReplayingIndex] = useState(null);
    // const [isAsking, setIsAsking] = useState(false);
    const [isAsked, setIsAsked] = useState(false);
    const [showSpeedSlider, setShowSpeedSlider] = useState(false);
    const recorderControls = useVoiceVisualizer();
    const [timer, setTimer] = useState(0);
    const [answerRecord, setAnswerRecord] = useState([]);
    const [isShaking, setIsShaking] = useState(false);
    const [currentPageChatHistory, setCurrentPageChatHistory] = useState([]);
    const timerRef = useRef(null);
    const isStartingRecordingRef = useRef(false);

    // currentPage = localStorage.getItem(`${title}-currentPage`) ? parseInt(localStorage.getItem(`${title}-currentPage`), 10) : 0;
    
    const currentPageRef = useRef(localStorage.getItem(`${title}-currentPage`) ? parseInt(localStorage.getItem(`${title}-currentPage`), 10) : 0);
    const audioRef = useRef(new Audio());
    const replayAudioRef = useRef(new Audio());
    const storyTextRef = useRef([]); 
    const sentenceIndexRef = useRef(0);
    const knowledgeRef = useRef([]);
    const isWaitingForResponseRef = useRef(false);
    const userRespondedRef = useRef(false);
    const chatHistoryRef = useRef([]);
    const isAskingRef = useRef(false);
    const isReplayingRef = useRef(false);
    const noReponseCntRef = useRef(0);
    const questionListRef = useRef([]);
    const timestampsRef = useRef([]);
    const currentWordIndexRef = useRef(0);
    const currentTranscriptRef = useRef('');
    const hasAskedRef = useRef(false);
    const isAskedRef = useRef(false);

    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    // Declare recognition as a ref at the component level
    const recognitionRef = useRef(null);

    useEffect(() => {
        if (user === null) {
            navigate('/');
        }
    }, [user]);

    useEffect(() => {
        console.log('chatHistoryRef', chatHistoryRef.current);
    }, [chatHistoryRef.current]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                console.log('space key pressed');
                if (!isRecording) {
                    startRecording();
                }
            }
        };
        const handleKeyUp = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                console.log('space key released');
                if (isRecording) {
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
                    image: `files/books/${title}/pages/page${index}.jpg`,
                    text: storyText[index]
                }));
                setPages(loadedPages);
                // initialize chatHistoryRef
                chatHistoryRef.current = Array.from({ length: loadedPages.length }, () => []);
            } catch (error) {
                console.error('Error loading story:', error);
            }
        };
        const loadQuestion = async () => {
            try {
                const response = await fetch(`/files/books/${title}/multichoice_script.json`);
                const question = await response.json();
                questionListRef.current = question;
            } catch (error) {
                console.error('Error loading question:', error);
            }
        }
        const loadTimeStamps = async () => {
            try {
                const response = await fetch(`/files/books/${title}/timestamps.json`);
                const timestamps = await response.json();
                timestampsRef.current = timestamps;
            } catch (error) {
                console.error('Error loading timestamps:', error);
            }
        }
        loadStory();
        loadDictionary();
        loadQuestion();
        loadTimeStamps();

        audioRef.current.play();
        audioRef.current.playbackRate = audioSpeed;
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

        try {
            // Set up MediaRecorder
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            recordedChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.start();
            isStartingRecordingRef.current = false;

            // Initialize SpeechRecognition
            console.log('Initializing SpeechRecognition');
            recognitionRef.current = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
            console.log('SpeechRecognition initialized');
            recognitionRef.current.lang = 'en-US';
            recognitionRef.current.interimResults = false;
            recognitionRef.current.maxAlternatives = 1;

            recognitionRef.current.onresult = (event) => {
                console.log('SpeechRecognition result event triggered');
                const transcript = event.results[0][0].transcript;
                console.log('Transcription:', transcript);
                
                // Use the state setter function to properly update the chat history
                setCurrentPageChatHistory(prevHistory => [
                    ...prevHistory,
                    {
                        role: 'user',
                        content: transcript,
                        audio: new Blob(recordedChunksRef.current, { type: 'audio/webm' })
                    }
                ]);
                
                console.log('apiUrl', apiUrl);
                // Send transcription to backend
                fetch(`${apiUrl}/api/evaluate_response`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        user: user,
                        title: title,
                        page: currentPageRef.current,
                        transcript: transcript
                    })
                })
                .then(response => response.json())
                .then(data => {
                    console.log('Backend response:', data);
                    playResponseAudio(data.response);
                })
                .catch(error => console.error('Error sending transcription to backend:', error));
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
            };

            // Start recognition
            console.log('Starting SpeechRecognition');
            recognitionRef.current.start();
        } catch (error) {
            console.error('Error starting recording:', error);
            setIsRecording(false);
            isStartingRecordingRef.current = false;
        }
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
        console.log('stop recording');
        mediaRecorderRef.current.stop();
        
        // Check if recognition is defined before stopping
        if (recognitionRef.current) {
            setTimeout(() => {
                recognitionRef.current.stop();
            }, 1000);
        } else {
            console.error('SpeechRecognition is not initialized');
        }

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
            const audioUrl = URL.createObjectURL(audioBlob);
            console.log('Recorded audio URL:', audioUrl);
        };
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
                        const currentSpeed = parseFloat(localStorage.getItem(`${title}-audioSpeed`)) || 1;
                        audio.playbackRate = currentSpeed;
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
                        if (!hasAskedRef.current) {
                            console.log('start guiding'); 
                            setTimeout(() => {
                                playOpening();
                            }, 500);
                        }
                    } else {
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
        console.log('currentPageChatHistory', currentPageChatHistory);
    }, [currentPageChatHistory]);
    
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
        if (isKnowledge) {
            return;
        }
        console.log('moving to previous page', currentPageRef.current);
        if (currentPageRef.current > 0) {
            audioRef.current.pause();
            //setIsPlaying(false);
            audioRef.current.currentTime = 0;
            setIsKnowledge(false);
            // setIsAsking(false);
            isAskingRef.current = false;
            hasAskedRef.current = false;
            isAskedRef.current = false;
            setIsAsked(false);
            setIsMinimizedChat(false);
            setIsExpandedChat(false);
            setAnswerRecord([]);
            noReponseCntRef.current = 0;
            // setChatHistory([]);
            setCurrentPageChatHistory([]);
            isWaitingForResponseRef.current = false;
            const newPage = currentPageRef.current - 1;
            //setCurrentPage(newPage);
            currentPageRef.current = newPage;
            sentenceIndexRef.current = 0;
            setCurrentSentence(0);
            if (timerRef.current) clearInterval(timerRef.current);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
            playPageSentences();  
        }
    };

    const handleNextPage = async () => {
        console.log('moving to next page', currentPageRef.current);
        if (isKnowledge && !isAskedRef.current) {
            console.log('isKnowledge and isAsked', isKnowledge, isAskedRef.current);
            return;
        }
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // setIsPlaying(false);
        setIsKnowledge(false);
        // setIsAsking(false);
        isAskingRef.current = false;
        hasAskedRef.current = false;
        setIsAsked(false);
        isAskedRef.current = false;
        setIsMinimizedChat(false);
        setIsExpandedChat(false);
        setAnswerRecord([]);
        noReponseCntRef.current = 0;
        // setChatHistory([]);
        setCurrentPageChatHistory([]);
        isWaitingForResponseRef.current = false;
        const newPage = ( currentPageRef.current + 1 ) % pages.length;
        // setCurrentPage(newPage);
        currentPageRef.current = newPage;
        setCurrentSentence(0);
        sentenceIndexRef.current = 0;
        if (timerRef.current) clearInterval(timerRef.current);
        localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
        localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0  
        playPageSentences();  
    };

    const showWords = (convAudio, timestamps, onComplete) => {
        if (currentWordIndexRef.current >= timestamps?.length) {
            console.log('All words displayed');
            console.log('Final transcript:', currentTranscriptRef.current);
            // console.log('currentPageChatHistory', currentPageChatHistory);
            // console.log('chat history', chatHistoryRef.current);
            setCurrentPageChatHistory(prevHistory => {
                const updatedHistory = [...prevHistory];
                console.log('updatedHistory when showing words', updatedHistory);
                if (updatedHistory.length > 0) {
                    updatedHistory[updatedHistory.length - 1] = {
                        ...updatedHistory[updatedHistory.length - 1],
                        status: 'completed',
                        audio: !updatedHistory[updatedHistory.length - 1].audio.includes(convAudio._src) 
                            ? [...updatedHistory[updatedHistory.length - 1].audio, convAudio._src]
                            : updatedHistory[updatedHistory.length - 1].audio
                    };
                } else {
                    updatedHistory.push({
                        role: 'assistant',
                        content: currentTranscriptRef.current,
                        audio: [convAudio._src],
                        status: 'completed'
                    });
                }
                return updatedHistory;
            });
            
            // Call completion callback if provided
            if (onComplete) {
                onComplete();
            }
            return;
        } else {
            const now = convAudio.seek();
            if (now >= timestamps?.[currentWordIndexRef.current]?.time) {
                console.log('now', now, 'timestamps', timestamps);
                const wordToAdd = timestamps?.[currentWordIndexRef.current]?.word;
                currentTranscriptRef.current += wordToAdd;
                console.log('Added word:', wordToAdd, 'Current transcript:', currentTranscriptRef.current);
                setCurrentPageChatHistory(prevHistory => {
                    const updatedHistory = [...prevHistory];
                    if (updatedHistory.length > 0) {
                        updatedHistory[updatedHistory.length - 1] = {
                            ...updatedHistory[updatedHistory.length - 1],
                            content: currentTranscriptRef.current,
                            status: 'in_progress'
                        };
                    } else {
                        updatedHistory.push({
                            role: 'assistant',
                            content: currentTranscriptRef.current,
                            audio: [convAudio._src],
                            status: 'in_progress'
                        });
                    }
                    return updatedHistory;
                });
                currentWordIndexRef.current += 1;
            }
            requestAnimationFrame(() => showWords(convAudio, timestamps, onComplete));
        }
    }

    const playOpening = () => {
        console.log('chat history', chatHistoryRef.current);
        console.log('currentPageChatHistory', currentPageChatHistory);
        const openingIndex = Math.floor(Math.random() * 6);
        const openingAudioSrc = `/files/books/${title}/conv_audio/opening_${openingIndex}.mp3`;
        const convAudio = new Howl({
            src: [openingAudioSrc],
            onplay: () => {
                showWords(convAudio, timestampsRef.current['opening'][openingIndex], () => {
                    console.log('Opening showWords completed, transcript:', currentTranscriptRef.current);
                    setTimeout(() => {
                        playQuestion();
                    }, 700); // Small delay to ensure state is updated
                });
            }
        });
        // Ensure chat history is updated before playing question
        currentWordIndexRef.current = 0;
        currentTranscriptRef.current = '';
        console.log('Opening starting, reset transcript to:', currentTranscriptRef.current);

        setCurrentPageChatHistory([{
            role: 'assistant',
            content: currentTranscriptRef.current,
            audio: [openingAudioSrc],
            status: 'in_progress'
        }]);
        console.log('currentPageChatHistory after updating', currentPageChatHistory);
        convAudio.play();
    }

    const playNoAnswer = () => {
        console.log('playNoAnswer called');
        const noAnswerAudioSrc = `/files/books/${title}/conv_audio/no_answer_0.mp3`;
        const convAudio = new Howl({
            src: [noAnswerAudioSrc],
            onplay: () => {
                setTimeout(() => {
                    showWords(convAudio, timestampsRef.current['no-answer'], () => {
                        console.log('No answer showWords completed');
                        playQuestion();
                    });
                }, 700);
            }
        });
        currentWordIndexRef.current = 0;
        currentTranscriptRef.current = '';
        setCurrentPageChatHistory(prevHistory => [
            ...prevHistory,
            {
                role: 'assistant',
                content: currentTranscriptRef.current,
                audio: [noAnswerAudioSrc],
                status: 'in_progress'
            }
        ]);
        convAudio.play();
    }

    const playQuestion = () => {
        console.log('playQuestion called');
        console.log('Transcript at start of playQuestion:', currentTranscriptRef.current);
        const questionAudioSrc = `/files/books/${title}/conv_audio/page_${currentPageRef.current}_question.mp3`;
        const convAudio = new Howl({
            src: [questionAudioSrc],
            onplay: () => {
                console.log('Question audio started playing, current transcript:', currentTranscriptRef.current);
                showWords(convAudio, timestampsRef.current[currentPageRef.current]['question'], () => {
                    console.log('Question showWords completed');
                    if (currentPageChatHistory.length < 2) {
                        startResponseTimer();
                    }
                });
            }
        });
        
        // Reset word index for the question timestamps (each audio file has its own timestamp sequence)
        currentWordIndexRef.current = 0;
        const previousContent = currentTranscriptRef.current;
        // Add a space between opening and question if there's previous content
        currentTranscriptRef.current = previousContent + (previousContent ? ' ' : '');
        console.log('Updated transcript before question starts:', currentTranscriptRef.current);
        
        // Update the most recent assistant message (last assistant message in the chat)
        setCurrentPageChatHistory(prevHistory => {
            console.log('Previous chat history in question:', prevHistory);
            const updatedHistory = [...prevHistory];
            
            // Find the most recent assistant message
            for (let i = updatedHistory.length - 1; i >= 0; i--) {
                if (updatedHistory[i].role === 'assistant') {
                    console.log('Updating assistant message at index:', i);
                    updatedHistory[i] = {
                        ...updatedHistory[i],
                        // Don't update content here - let showWords handle it
                        audio: updatedHistory[i].audio ? [...updatedHistory[i].audio, questionAudioSrc] : [questionAudioSrc],
                        status: 'in_progress'
                    };
                    break;
                }
            }
            
            console.log('Updated chat history:', updatedHistory);
            return updatedHistory;
        });
        
        convAudio.play();
        hasAskedRef.current = true;
    }

    // useEffect(() => {
    //     console.log('currentPageChatHistory updated:', currentPageChatHistory);
    // }, [currentPageChatHistory]);

    const playResponseAudio = (response) => {
        let responseAudioSrc;
        switch (response) {
            case 'correct':
                responseAudioSrc = `/files/books/${title}/conv_audio/page_${currentPageRef.current}_correct_answer.mp3`;
                break;
            case 'incorrect':
                responseAudioSrc = `/files/books/${title}/conv_audio/page_${currentPageRef.current}_incorrect_answer.mp3`;
                break;
            case 'off-topic':
                responseAudioSrc = `/files/books/${title}/conv_audio/page_${currentPageRef.current}_off_topic_answer.mp3`;
                break;
            case 'uncertainty':
                responseAudioSrc = `/files/books/${title}/conv_audio/page_${currentPageRef.current}_uncertainty_answer.mp3`;
                break;
        }
        const convAudio = new Howl({
            src: [responseAudioSrc],
            onplay: () => {
                let timestampsKey;
                switch (response) {
                    case 'correct':
                        timestampsKey = 'correct_answer';
                        break;
                    case 'incorrect':
                        timestampsKey = 'incorrect_answer';
                        break;
                    case 'off-topic':
                        timestampsKey = 'off_topic_answer';
                        break;
                    case 'uncertainty':
                        timestampsKey = 'uncertainty_answer';
                        break;
                }
                showWords(convAudio, timestampsRef.current[currentPageRef.current][timestampsKey], () => {
                    console.log('response audio showWords completed');
                    setIsConversationEnded(true);
                });
            }
        });
        currentWordIndexRef.current = 0;
        currentTranscriptRef.current = '';
        // add the a new message to chatHistoryRef
        setCurrentPageChatHistory(prevHistory => [
            ...prevHistory,
            {
                role: 'assistant',
                content: currentTranscriptRef.current,
                audio: [responseAudioSrc],
                status: 'in_progress'
            }
        ]);
        convAudio.play();
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
          // play the question again
          playNoAnswer();
          if (timerRef.current) clearInterval(timerRef.current); // 停止计时器
        }
    }, [timer, userRespondedRef.current]);
    // clear the timer when page changes

    useEffect(() => {
        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
        };
      }, []);

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

    const handleReplay = async (index, audioSources) => {
        console.log('handleReplay', index, audioSources);
        if (!Array.isArray(audioSources)) {
            audioSources = [audioSources];
        }

        const replayAudio = replayAudioRef.current;
        console.log('handleReplay', index, audioSources);

        // If clicking on a different message while another is playing
        if (replayingIndex !== null && replayingIndex !== index) {
            replayAudio.pause();
            replayAudio.currentTime = 0;
            isReplayingRef.current = false;
            setReplayingIndex(null);
        }

        // If clicking on the currently playing message
        if (replayingIndex === index) {
            if (isReplayingRef.current) {
                replayAudio.pause();
                isReplayingRef.current = false;
            }
            return;
        }

        // Function to play audio sources sequentially
        const playSequentially = async (sources, currentIndex = 0) => {
            if (currentIndex >= sources.length) {
                isReplayingRef.current = false;
                setReplayingIndex(null);
                return;
            }

            replayAudio.src = sources[currentIndex];
            replayAudio.currentTime = 0;
            
            try {
                await replayAudio.play();
                setReplayingIndex(index);
                isReplayingRef.current = true;

                replayAudio.onended = () => {
                    playSequentially(sources, currentIndex + 1);
                };
            } catch (error) {
                console.error('Error playing audio:', error);
                isReplayingRef.current = false;
                setReplayingIndex(null);
            }
        };

        // Start playing the sequence
        playSequentially(audioSources);
    }

    const handleExpandChat = () => {
        setIsExpandedChat(!isExpandedChat);
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.height = isExpandedChat ? '50%' : '80%';
    }
    
    const handleMinimizeChat = async () => {
        setIsMinimizedChat(!isMinimizedChat);
        setIsExpandedChat(false);
    }

    const handlePenguinClick = () => {
        if (isMinimizedChat) {
            setIsMinimizedChat(false);
        }
    }

    const toggleSpeedClick = () => {
        setShowSpeedSlider(!showSpeedSlider);
    };

    const handleSpeedChange = (event, newValue) => {
        if (newValue === 0.5) {
            setAudioSpeed(0.7);
            setSpeedSliderValue(0.5);
        }
        else {
            setAudioSpeed(newValue);
            setSpeedSliderValue(newValue);
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
                id: index,
                role: item.role,
                content: item.content,
            }
            formData.append(`${prefix}_dict`, JSON.stringify(itemDict));
            if (item.role === 'user' && item.audio) {
                formData.append(`${prefix}_audioBlob`, item.audio, `${user}-${title}-Page_${currentPageRef.current}-ID_${index}.mp3`);
            }
        });
        console.log('formData', formData);
        return formData;
    }

    const handleCloseChat = async () => {
        console.log('handleCloseChat');
        console.log('Chat history', chatHistoryRef.current);
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
            isAskedRef.current = true;
            chatHistoryRef.current[currentPageRef.current] = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory];
            // audioRef.current.play();
            if (currentPageRef.current < pages.length - 1) {
                setTimeout(() => {
                    setIsPlaying(true);
                    console.log('playing next page');
                    handleNextPage();
                }, 1500);
            }
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

    return (
        <Box className="background-container">
            <Header user={user} title={title} hasTitle={true} />
            <div id='main-container'>
                <div id='book-container'>
                    <Box id='book-content'>
                        {/* <IconButton
                        id="prev-btn"
                        variant='plain'
                        onClick={handlePrevPage}
                        disabled={currentPageRef.current === 0}
                        sx={{ opacity: 0.7 }}
                        >
                            <FaCaretLeft size={60} color='#2A2278'/>
                        </IconButton> */}
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
                                    value={speedSliderValue}
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

                    <Box id='book-img'>
                        <img src={pages[currentPageRef.current]?.image} alt={`Page ${currentPageRef.current + 1}`}/>
                    </Box>

                    {/* <IconButton
                        id="next-btn"
                        variant='plain'
                        onClick={handleNextPage}
                        sx={{ opacity: 0.7 }}
                        >
                        <FaCaretRight size={60} color='#2A2278'/>
                    </IconButton> */}
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
                <div id='penguin-box' onClick={handlePenguinClick}>
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
                            <div id='audio-visualizer' style={{position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', zIndex: 101}}>
                                <AudioWave />
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
                       
                    <Box className='chat-window'>
                        
                        {[...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].length == 0 && (
                            <Box id='loading-box'>
                                <AiOutlineLoading id='loading-icon' size={40} color='#7AA2E3' />
                            </Box>
                        )}
                        {[...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory].map((msg, index) => (
                            msg.content !== '' && (
                            <Box key={index} id={msg.role === 'user' ? 'user-msg' : 'chatbot-msg'}>
                                {msg.role === 'user' ? (
                                    // if message is loading, add a loading icon
                                    <Box id="user-chat">
                                        <Avatar id='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793', marginRight: "8px"}}>{user.substring(0, 2)}</Avatar>
                                        <Box id="msg-bubble" style={{ backgroundColor: '#ECECEC' }}>
                                            {msg.content !== null ? (
                                                <h5 level='body-lg' style={{margin: '0px'}}>{msg.content}</h5>
                                            ) : (
                                                <AiOutlineLoading id='loading-icon' size={20} color='#7AA2E3' />
                                            )}
                                        </Box>
                                    </Box>
                                ) : (
                                    <Box id="chatbot-chat">
                                        <Image id='chatbot-avatar' src='./files/imgs/penguin.svg'></Image>
                                        <Box id="msg-bubble" style={{ position: 'relative' }} onClick={() => handleReplay(index, msg.audio)}>
                                                <h5 level='body-lg' style={{margin: '0px', marginRight: '50px'}}>
                                                    {msg.content}
                                                </h5>
                                            {msg.status === 'completed' && (
                                                <Box sx={{ display: 'flex', gap: 1, position: 'absolute', right: '8px', bottom: '8px' }}>
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
                                    <h4 style={{ color: 'white', fontSize: '30px', fontFamily: 'Cherry Bomb', zIndex: 104 }}>Talking...</h4>
                                : <div>
                                        <div style={{ width: '90%', height: '25%', backgroundColor: '#FFFFFF4D', position: 'absolute', top: '7px', left: '3%', borderRadius: '20px' }}></div>
                                        <img src='./files/imgs/ring.svg' alt='ring' style={{ width: '35px', height: '35px', position: 'absolute', top: '2px', right: '6px', borderRadius: '50%' }} />
                                        <h4 style={{ color: 'white', fontSize: '30px', fontFamily: 'Cherry Bomb', zIndex: 104 }}>Hold to talk!</h4>
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

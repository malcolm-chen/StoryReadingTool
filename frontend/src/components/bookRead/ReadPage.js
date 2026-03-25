import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress, Menu, List, ListItem, Slider, MenuButton, MenuList, MenuItem } from '@mui/joy';
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";
import { Button, Dropdown, Image } from 'react-bootstrap';
import { GiSpellBook } from "react-icons/gi";
import { AiOutlineLoading } from "react-icons/ai";
import { WavRecorder, WavStreamPlayer } from '../../lib/wavtools/index';
import { uploadChatHistoryToBackend } from '../../lib/uploadChatHistoryToS3';
import Header from '../header';
import { RealtimeClient } from '@openai/realtime-api-beta';
import { useSwipeable } from 'react-swipeable';
import { FaCaretRight, FaCaretLeft } from "react-icons/fa6";
import { FaPlay, FaPause, FaCirclePlay, FaCirclePause } from "react-icons/fa6";
import { FaChevronCircleUp, FaChevronCircleDown, FaMinusCircle } from "react-icons/fa";
import { FaRegClosedCaptioning } from "react-icons/fa6";
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
    const [isVoiceInputDisabled, setIsVoiceInputDisabled] = useState(false);
    const [isConversationEnded, setIsConversationEnded] = useState(false);
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
    const [isPlaying, setIsPlaying] = useState(true);
    const [replayingIndex, setReplayingIndex] = useState(null);
    const [isAsked, setIsAsked] = useState(false);
    // const [isAsking, setIsAsking] = useState(false);
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
    const responseResendRef = useRef(false);
    // const [evaluation, setEvaluation] = useState(null);
    const [isImageLoading, setIsImageLoading] = useState(false);
    const [audioSpeed, setAudioSpeed] = useState(localStorage.getItem(`${title}-audioSpeed`) ? parseFloat(localStorage.getItem(`${title}-audioSpeed`)) : 1);
    const [speedSliderValue, setSpeedSliderValue] = useState(audioSpeed);
    const penguin = './files/imgs/penguin1.svg';
    const chatWindowRef = useRef(null);

    // currentPage = localStorage.getItem(`${title}-currentPage`) ? parseInt(localStorage.getItem(`${title}-currentPage`), 10) : 0;
    
    const wavRecorderRef = useRef(
        new WavRecorder({ sampleRate: 24000 })
    );
    const wavStreamPlayerRef = useRef(
        new WavStreamPlayer({ sampleRate: 24000 })
    );
    const clientRef = useRef(
        new RealtimeClient( { url: 'wss://storybook-reader.hailab.io:8766', model: 'gpt4o-realtime' } )
    );

    const storyTextRef = useRef([]);
    const currentPageRef = useRef(localStorage.getItem(`${title}-currentPage`) ? parseInt(localStorage.getItem(`${title}-currentPage`), 10) : 0);
    const sentenceIndexRef = useRef(0);
    const askedQuestionsRef = useRef({});
    const knowledgeRef = useRef([]);
    const isWaitingForResponseRef = useRef(false);
    const userRespondedRef = useRef(false);
    const chatHistoryRef = useRef([]);
    const isAskingRef = useRef(false);
    const isAskedRef = useRef(false);
    const isReplayingRef = useRef(false);
    const noReponseCntRef = useRef(0);
    const noResponseReminderCountRef = useRef(0);
    const [regenerateIndex, setRegenerateIndex] = useState(null);
    const itemToRespondRef = useRef(null);
    const deletedItemsRef = useRef(new Set());
    const recordingStartTimeRef = useRef(null);
    const isWaitingForEvaluationRef = useRef(false);
    const evaluationInProgressRef = useRef(false);  // Guard against duplicate response.create
    const responseTimeoutRef = useRef(null);
    const replayAudioRef = useRef(new Audio());
    const askedPageRef = useRef([]);
    const audioRef = useRef(new Audio());
    /** Bumps on each playPageSentences() so stale async chains (rapid page turns, aborted play()) cannot advance or trigger knowledge UI. */
    const playbackSessionRef = useRef(0);
    /** Only the latest scheduled knowledge guiding activation may run after await getInstruction4Guiding (dedupes double entry). */
    const guidingActivationNonceRef = useRef(0);
    /** client.reset() clears custom client.on handlers — set false after reset so setupClient can re-register. Prevents stacking duplicate handlers if setupClient runs twice before reset. */
    const realtimeListenersAttachedRef = useRef(false);
    const sessionInstructionRef = useRef('');
    const answerRecordRef = useRef([]);

    const resetAnswerRecord = () => {
        answerRecordRef.current = [];
        setAnswerRecord([]);
    };

    const appendAnswerRecord = (answerOrder, value) => {
        const current = answerRecordRef.current;
        if (answerOrder > current.length - 1) {
            const next = [...current, value];
            answerRecordRef.current = next;
            setAnswerRecord(next);
        }
    };


    const [audioPage, setAudioPage] = useState(() => {
        const savedPage = localStorage.getItem(`${title}-currentPage`);
        return savedPage ? parseInt(savedPage, 10) : 0;
    });

    const [currentSentence, setCurrentSentence] = useState(() => {
        const savedSentence = localStorage.getItem(`${title}-currentSentence`);
        return savedSentence ? parseInt(savedSentence, 10) : 0;
    });

    useEffect(() => {
        console.log('chatHistoryRef', chatHistoryRef.current);
    }, [chatHistoryRef.current]);

    useEffect(() => {
        answerRecordRef.current = answerRecord;
    }, [answerRecord]);


    useEffect(() => {
        if (user === null) {
            navigate('/');
        }
    }, [user]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (clientRef.current.realtime.isConnected() && !isVoiceInputDisabled) {
                    toggleRecording();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isRecording, isVoiceInputDisabled]);
    // const [currentPage, setCurrentPage] = useState(() => {
    //     const savedPage = localStorage.getItem(`${title}-currentPage`);
    //     console.log('savedPage', savedPage);
    //     return savedPage ? parseInt(savedPage, 10) : 0;
    // });

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
        loadStory();
        loadDictionary();
        // loadAskedQuestions();
    }, []);

    useEffect(() => {
        console.log('isKnowledge has changed', isKnowledge);
    }, [isKnowledge]);

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

        // Try to connect to microphone. Prefer the device selected on the
        // greeting page (stored in localStorage) so that the user’s choice
        // carries over into the reading interaction.
        const storedDeviceId = localStorage.getItem('selectedMicrophoneDeviceId') || '';

        // On iPad/Safari or when another app (e.g. Zoom) is using the microphone,
        // this can fail. In that case, we still want to connect the realtime
        // client so that the AI can respond (at least via audio/text), but we
        // disable voice input.
        let microphoneAvailable = true;
        try {
            await wavRecorder.begin(storedDeviceId || undefined);
        } catch (err) {
            console.error('Failed to start microphone stream:', err);
            microphoneAvailable = false;
            setIsVoiceInputDisabled(true);
        }

        // Connect to audio output
        try {
            await wavStreamPlayer.connect();
        } catch (err) {
            console.error('Failed to start audio output:', err);
            // Continue anyway so text can still work
        }

        // Connect to realtime API
        await client.connect();
        console.log('connected')
        setIsConnected(true);

        if (microphoneAvailable && client.getTurnDetectionType() === 'server_vad') {
            await wavRecorder.record((data) => client.appendInputAudio(data.mono));
        }
    }, []);

    /**
     * Disconnect and reset conversation state
     */
    const disconnectConversation = useCallback(async () => {
        console.log('disconnecting conversation');
        if (responseTimeoutRef.current) {
            clearTimeout(responseTimeoutRef.current);
            responseTimeoutRef.current = null;
        }
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
     * Toggle recording: click to start, click again to send
     */
    const toggleRecording = () => {
        if (isVoiceInputDisabled) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    };

    /**
     * In click-to-talk mode, start recording
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
        // Record the start time for duration validation
        recordingStartTimeRef.current = Date.now();
        userRespondedRef.current = true;
        isWaitingForResponseRef.current = false;
        evaluationInProgressRef.current = false;  // Reset guard when user starts recording
        if (timerRef.current) clearInterval(timerRef.current);
        replayAudioRef.current.pause();
        setReplayingIndex(null);
        isReplayingRef.current = false;
        noResponseReminderCountRef.current = 0; // 重置无响应提醒计数器
        
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
     * Compute RMS (root mean square) of Int16Array for volume detection
     * @param {Int16Array} samples
     * @returns {number}
     */
    const getAudioRMS = (samples) => {
        if (!samples || samples.length === 0) return 0;
        let sum = 0;
        for (let i = 0; i < samples.length; i++) {
            sum += samples[i] * samples[i];
        }
        return Math.sqrt(sum / samples.length);
    };

    /**
     * In push-to-talk mode, stop recording
     * Filters invalid responses: duration < 0.1s or volume too low, skip response creation
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
        
        // Validity check 1: recording duration
        const recordingDuration = recordingStartTimeRef.current 
            ? (Date.now() - recordingStartTimeRef.current) / 1000 
            : 0;
        
        // Validity check 2: volume (RMS threshold ~100 for 16-bit audio, catches near-silence)
        const MIN_VOLUME_RMS = 300;
        const audioBuffer = client.inputAudioBuffer;
        const rms = getAudioRMS(audioBuffer);
        
        const isInvalid = recordingDuration < 0.1 || rms < MIN_VOLUME_RMS;
        
        if (isInvalid) {
            if (recordingDuration < 0.1) {
                console.log(`Recording duration (${recordingDuration.toFixed(2)}s) is too short, skipping evaluation`);
            } else {
                console.log(`Recording volume too low (RMS: ${rms.toFixed(0)}), skipping evaluation`);
            }
            recordingStartTimeRef.current = null;
            isWaitingForResponseRef.current = false;
            if (client.inputAudioBuffer) client.inputAudioBuffer = new Int16Array(0);
            setIsVoiceInputDisabled(true);
            if (isKnowledge) {
                const items = client.conversation.getItems();
                const answerOrder = Math.floor((items.length - noReponseCntRef.current) / 2) - 1;
                appendAnswerRecord(answerOrder, 'invalid');
                await sendResponse(client, 'invalid', items);
            }
            return;
        }
        
        recordingStartTimeRef.current = null;
        isWaitingForResponseRef.current = false;
        setIsVoiceInputDisabled(true);
        if (isKnowledge && !evaluationInProgressRef.current) {
            evaluationInProgressRef.current = true;
            const items = client.conversation.getItems();
            client.realtime.send('input_audio_buffer.commit');
            client.conversation.queueInputAudio(client.inputAudioBuffer);
            client.inputAudioBuffer = new Int16Array(0);
            if (responseTimeoutRef.current) {
                clearTimeout(responseTimeoutRef.current);
                responseTimeoutRef.current = null;
            }
            const sendEvaluationResponse = async () => {
                const currentItems = client.conversation.getItems();
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text"],
                        "instructions": getInstruction4Evaluation(currentItems),
                    }
                });
            };
            await sendEvaluationResponse();
            isWaitingForEvaluationRef.current = true;
            responseResendRef.current = false;
            const scheduleFallbackRetry = () => {
                responseTimeoutRef.current = setTimeout(async () => {
                    if (!isWaitingForEvaluationRef.current || !client.realtime.isConnected()) return;
                    responseTimeoutRef.current = null;
                    console.log('No response within 3 seconds, canceling and resending response.create');
                    try {
                        await client.realtime.send('response.cancel');
                        const currentItems = client.conversation.getItems();
                        await client.realtime.send('response.create', {
                            response: {
                                "modalities": ["text"],
                                "instructions": getInstruction4Evaluation(currentItems),
                            }
                        });
                        scheduleFallbackRetry();
                    } catch (error) {
                        console.error('Error in response fallback:', error);
                    }
                }, 3000);
            };
            scheduleFallbackRetry();
        }
        // else {
        //     client.createResponse();
        // }
    };

    const handleImageLoad = () => {
        setIsImageLoading(false);
        // playPageSentences();
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

    useEffect(() => {
        if (audioRef.current) {
          audioRef.current.playbackRate = audioSpeed;
        }
        localStorage.setItem(`${title}-audioSpeed`, audioSpeed);
      }, [audioSpeed, title]);

    const playPageSentences = () => {
        const pageText = pages[currentPageRef.current]?.text;
        if (pageText && pageText.length > 0) {
            const session = ++playbackSessionRef.current;
            const startPage = currentPageRef.current;  // 记录开始播放时的页码
            const pageSentences = pages[startPage]?.text ?? [];
            /** Per-invocation index — must NOT use sentenceIndexRef here: rapid flips run overlapping playPageSentences and shared ref corrupts progress. */
            let localSentenceIndex = 0;
            sentenceIndexRef.current = 0;
            setCurrentSentence(0);
            const audio = audioRef.current;
            const syncCaptionIndex = (idx) => {
                if (session === playbackSessionRef.current && currentPageRef.current === startPage) {
                    sentenceIndexRef.current = idx;
                    setCurrentSentence(idx);
                }
            };
            const playNextSentence = async () => {
                if (session !== playbackSessionRef.current) {
                    return;
                }
                // 防止跨页触发：如果当前页已改变，不要继续播放或触发 AI 对话
                if (currentPageRef.current !== startPage) {
                    return;
                }
                setAudioPage(startPage);
                if (localSentenceIndex < pageSentences.length) {
                    syncCaptionIndex(localSentenceIndex);
                    audio.src = `/files/books/${title}/audio/p${startPage}sec${localSentenceIndex}.mp3`;

                    audio.onended = () => {
                        if (session !== playbackSessionRef.current || currentPageRef.current !== startPage) {
                            return;
                        }
                        localSentenceIndex += 1;
                        syncCaptionIndex(localSentenceIndex);
                        playNextSentence();
                    };
                    try {
                        await audio.play();
                        if (session !== playbackSessionRef.current || currentPageRef.current !== startPage) {
                            return;
                        }
                        const currentSpeed = parseFloat(localStorage.getItem(`${title}-audioSpeed`)) || 1;
                        audio.playbackRate = currentSpeed;
                        setIsPlaying(true);
                    } catch (error) {
                        // AbortError: rapid page turns / pause() — do not advance index or recurse (avoids fake "page complete" and double knowledge setup)
                        if (error?.name === 'AbortError' || session !== playbackSessionRef.current || currentPageRef.current !== startPage) {
                            return;
                        }
                        console.error('Error playing audio:', error);
                        localSentenceIndex += 1;
                        syncCaptionIndex(localSentenceIndex);
                        playNextSentence();
                    }
                } else {
                    // setIsPlaying(false);
                    if (session !== playbackSessionRef.current || currentPageRef.current !== startPage) {
                        return;
                    }
                    if (startPage in knowledgeRef.current) {
                        const activatingPage = startPage;
                        const guidingNonce = ++guidingActivationNonceRef.current;
                        (async () => {
                            const instruction = await getInstruction4Guiding();
                            if (guidingNonce !== guidingActivationNonceRef.current) {
                                return;
                            }
                            if (session !== playbackSessionRef.current || currentPageRef.current !== activatingPage) {
                                return;
                            }
                            if (!(activatingPage in knowledgeRef.current)) {
                                return;
                            }
                            console.log('currentPage in knowledge', activatingPage);
                            setIsKnowledge(true);
                            audio.pause();
                            setIsPlaying(false);
                            setIsConversationEnded(false);
                            resetAnswerRecord();
                            noReponseCntRef.current = 0;
                            setCurrentPageChatHistory([]);
                            if (!clientRef.current.realtime.isConnected()) {
                                console.log('setting up client for guiding');
                                setupClient(instruction);
                                setIsClientSetup(true);
                            } else {
                                console.log('resetting client for guiding');
                                updateClientInstruction(instruction);
                            }
                        })();
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
        if (isKnowledge) {
            return;
        }
        console.log('moving to previous page', currentPageRef.current);
        if (currentPageRef.current > 0) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            setIsKnowledge(false);
            // setIsAsking(false);
            isAskingRef.current = false;
            isAskedRef.current = false;
            setIsMinimizedChat(false);
            setIsExpandedChat(false);
            resetAnswerRecord();
            noReponseCntRef.current = 0;
            // setChatHistory([]);
            isWaitingForResponseRef.current = false;
            if (clientRef.current.realtime.isConnected()) {
                console.log('disconnecting conversation');
                // deleteConversationItem(items[0].id);
                await disconnectConversation();
                const client = clientRef.current;
                client.reset();
                realtimeListenersAttachedRef.current = false;
                setIsClientSetup(false);
            }
            const newPage = currentPageRef.current - 1;
            //setCurrentPage(newPage);
            currentPageRef.current = newPage;
            sentenceIndexRef.current = 0;
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
            playPageSentences();  
        }
    };

    // const handleNextPage = async () => {
    //     console.log('moving to next page', currentPageRef.current);
    //     if (isKnowledge && !isAskedRef.current) {
    //         console.log('isKnowledge and isAsked', isKnowledge, isAskedRef.current);
    //         return;
    //     }
    //     if (currentPageRef.current in knowledgeRef.current && !isKnowledge && !isAskedRef.current && !askedPageRef.current.includes(currentPageRef.current)) {
    //         console.log('currentPage in knowledge', currentPageRef.current);
    //         setIsKnowledge(true);
    //         setIsConversationEnded(false);
    //         setAnswerRecord([]);
    //         noReponseCntRef.current = 0;
    //         setCurrentPageChatHistory([]);
    //         // check if the client is not setup for guiding
    //         if (!clientRef.current.realtime.isConnected()) {
    //             console.log('setting up client for guiding');
    //             setupClient(await getInstruction4Guiding());
    //             setIsClientSetup(true);
    //         } else {
    //             console.log('resetting client for guiding');
    //             updateClientInstruction(await getInstruction4Guiding());
    //         }
    //     } else {
    //         console.log('really moving to next page', currentPageRef.current);
    //         setIsKnowledge(false);
    //         // setIsAsking(false);
    //         if (!askedPageRef.current.includes(currentPageRef.current)) {
    //             askedPageRef.current.push(currentPageRef.current);
    //         }
    //         isAskingRef.current = false;
    //         isAskedRef.current = false;
    //         setIsMinimizedChat(false);
    //         setIsExpandedChat(false);
    //         setAnswerRecord([]);
    //         noReponseCntRef.current = 0;
    //         isWaitingForResponseRef.current = false;
    //         if (clientRef.current.realtime.isConnected()) {
    //             console.log('disconnecting conversation');
    //             await disconnectConversation();
    //             const client = clientRef.current;
    //             client.reset();
    //             setIsClientSetup(false);
    //         }
    //         const newPage = ( currentPageRef.current + 1 ) % pages.length;
    //         currentPageRef.current = newPage;
    //         sentenceIndexRef.current = 0;
    //         localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
    //         localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0  
    //         playPageSentences();  
    //     }
    // };

    const handleNextPage = async () => {
        console.log('moving to next page', currentPageRef.current);
        if (isKnowledge && !isAskedRef.current) {
            console.log('isKnowledge and isAsked', isKnowledge, isAskedRef.current);
            if (currentPageRef.current != 7 && currentPageRef.current != 8 && currentPageRef.current != 10 && currentPageRef.current != 12 && currentPageRef.current != 14) {
                return;
            }
        }
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        // setIsPlaying(false);
        setIsKnowledge(false);
        // setIsAsking(false);
        isAskingRef.current = false;
        isAskedRef.current = false;
        setIsMinimizedChat(false);
        setIsExpandedChat(false);
        resetAnswerRecord();
        noReponseCntRef.current = 0;
        // setChatHistory([]);
        isWaitingForResponseRef.current = false;
        if (clientRef.current.realtime.isConnected()) {
            console.log('disconnecting conversation');
            // deleteConversationItem(items[0].id);
            await disconnectConversation();
            const client = clientRef.current;
            client.reset();
            realtimeListenersAttachedRef.current = false;
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


    function getInstruction4Evaluation(items) {
        const instruction4Evaluation = `
You need to evaluate whether the child's response covers all the key points in the answer.
        
        **Instructions for Evaluation**:
        You need to evaluate the child's latest response based on the following inputs:
        - Main Question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - Answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - Acceptance Criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story Context: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}

        **Steps for Evaluation**:
        Step 1: Check Response Validity
        If the child’s response is empty, unintelligible (noise), too short, or clearly accidental, mark it as "invalid". Jumping straight to **Response Format**.
       
        Step 2: Check the status of the conversation
        - Conversation History: ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')}
        - Check if the assistant already asked "What questions do you have for me about this page?"
        - If YES, AND the child's latest response contains a question mark (child is asking a question), mark the evaluation as "child asks question". Ignore all the following instructions and jump to **Response Format**.
        - If YES, AND the child's latest response does NOT contain a question mark, mark the evaluation as "conv end". Ignore all the following instructions and jump to **Response Format**. (If the child has no reply, mark it as "irrelevant".)
        - If NO (assistant hasn't asked the conv end question yet), continue to Step 3.
        
        Step 3: Check if the child asks a question
        If the assistant has NOT asked “What questions do you have for me about this page?” and the child asks any question (relevant or not), mark the evaluation as "child asks question". Jumping straight to **Response Format**.
        
        Step 4: Evaluate Valid Responses if the conversation is not ended
        For meaningful responses (and if conversation is not ended):
        - Main Question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - Answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        
        Compare all of the child’s responses on this page against the acceptance criteria:
        - **Fully correct**: Children's responses in the conversation history collectively cover all the points in the acceptance criteria without any incorrect information. The acceptance criteria is: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}. (The child's responses do not need to be in the exact same words as the acceptance criteria, but they should cover the same key points.)
        - **Correct but incomplete**: As long as the response is missing one or more points in the acceptance criteria, mark it as 'correct but incomplete'.
        - **Factually incorrect**: The response contains incorrect information compared to the answer.
        - **Irrelevant response**: Unrelated to the question or story context (e.g., the child talks about other things, does not want to talk about frogs, does not want to keep talking). Do not use this if response is invalid.
        - **Uncertainty answer**: Shows doubt, e.g., “I don’t know,” “I’m not sure.”
                    
        **Response Format**:
        Return the evaluation result in a json format.
        Below are the examples of your output, reply with one of these only:
        1. {"evaluation": "invalid"}
        2. {"evaluation": "conv end"}
        3. {"evaluation": "child asks question"}
        4. {"evaluation": "fully correct"}
        5. {"evaluation": "correct but incomplete"}
        6. {"evaluation": "factually incorrect"}
        7. {"evaluation": "irrelevant"}
        8. {"evaluation": "uncertainty"}

        **Important Reminder**:
        - Always consider the entire conversation history on this page, not just the latest response. If all responses combined meet the acceptance criteria, mark as fully correct.
        - Only return valid JSON from the list above. No extra text, no empty outputs.

        `;
        console.log(instruction4Evaluation);
        return instruction4Evaluation;
    }

    // update the instruction4Guiding when the currentPageRef.current changes   
    async function getInstruction4Guiding() {
        const instruction4Guiding = `
        You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Your task is to initiate an interactive conversation based on instructions.
        
        **Story Information**:
        - Story Title: ${title}
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story Text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        - First Question: ${knowledgeRef.current[currentPageRef.current]?.question}

        **Instructions for initiating the Conversation**:
            You should use different ways to open the conversation. For example: "Hmm, this part of the story is so interesting!" + first question (${knowledgeRef.current[currentPageRef.current]?.question}); "Hey xxx, before we move to the next page, share with me what you think" + first question (${knowledgeRef.current[currentPageRef.current]?.question}); "xxx, before we move to the next page, let's chat about what you just read!" + first question (${knowledgeRef.current[currentPageRef.current]?.question}); etc. 
            ** Make sure to ask the first question (${knowledgeRef.current[currentPageRef.current]?.question}) in the conversation. **
            **DO NOT* ask the first question in the form of yes/no question (BAD Example: "Can you tell me xxx?", or "Do you know xxx?").
            ** Your first question must be identical to the provided main question, meaning that you should not substitute any keyword.
            ** YOU MUST ASK EXACTLY ONLY ONE QUESTION. **
        `;
        
        console.log(instruction4Guiding);
        return instruction4Guiding;
    }

    const getInstruction4Correct = (items, evaluation) => {
        const instruction4Correct = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - the evaluation of the child's latest response: ${evaluation};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgement, 2. repeat answer, and 3. conclusion.
    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history.
        - Since the evaluation of the child's response is 'correct', you should acknowledge their answer and tailor your acknowledgment to the context (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!", and other similar acknowledgments)

    **Instructions for Repeating Answer**:
        - Repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) in this part. DO NOT OMIT ANY DETAILS.
        ${currentPageRef.current == 3 ? " - !!! Highlight that frogs' skin needs to be wet." : ''}
        ${currentPageRef.current === 4 ? "- !!! Highlight frogs can breathe through both LUNGS and SKIN in your response.": ""}
        ${currentPageRef.current === 5 ? " - !!! Highlight the word 'hibernation' when explaining the answer." : ''}
        ${currentPageRef.current === 11 ? "- !!! Highlight frogs' eyes are 'bulging', and can see in all directions without moving in your response.": ""}
        - Do not extend the explanation to the page details. Focus only on the provided answer.

    **Instructions for Conclusion**:
        - Your conclusion should include ONLY ONE question "What questions do you have for me about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! What questions do you have for me about this page? " (Make sure to use different conclusions based on the examples, but always end with ONLY ONE question "What questions do you have for me about this page?")
       
    **Instructions for Whole Response**:
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking).
        - Do not extend your response to story text details.
        - Your response MUST repeat the answer to strengthen understanding.
        - The whole response should only include and end with ONE question: "What questions do you have for me about this page?" *No other question allowed*
        `
        return instruction4Correct;
    }

    const getInstruction4Incomplete = (items, evaluation) => {
        const instruction4Incomplete1 = `
You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 && currentPageRef.current !==  7 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the main question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - the acceptance criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}
        - the evaluation of the child's latest response: ${evaluation};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgement, 2. hint, and 3. Ask a reprompt question.

    **Instructions for acknowledgment**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        ${currentPageRef.current === 7 ? `- If the child's answer is reasonable, you should accept the answers by saying 'Great!', 'Good job!', 'Nice work!', 'Great Thinking!', 'Wow, that is a great observation!' etc.` : "- Since the evaluation of the child's response is 'correct but incomplete', you should first provide encouraging feedback (e.g., 'Great start!', 'Nice work! There's more to it', 'You got part of it!', etc.)."}
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.
    
    **Instructions for hint (one sentence)**:
        - Since the evaluation of child's response is 'incomplete', compare the child's response with acceptance criteria (${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}), and provide an INDIRECT hint that guides children towards the missing parts of the correct answer. Do not disclose keywords in the answer.
        - NO QUESTION in hint! Do not include any question or directly reveal parts of the correct answer and acceptance criteria in the hint.
        - Your hint should NOT be specific.
        - Only hint at ONE part of the answer at once.
        ${currentPageRef.current === 3 ? "- If the child did not come up with 'wet skin' yet, prioritizing guiding them to think about the unique feature of frogs' skin." : ''}
        ${currentPageRef.current === 4 ? " - Do not explicitly mention lungs and skin in the hint. You must implicitly guide the child to figure out the fact that frogs use wet skin to breath in water, use lungs and wet skins to breath on land, if the child didn't mention this in their answers." : ''}
${currentPageRef.current === 9 ? " - Do not explicitly mention scenarios like 'use their voices', ‘scream when frightened’ and 'scare others when frightened' in the hint. You can use implicit hint like 'when frogs encounter predators'." : ''} 
        ${currentPageRef.current === 11 ? "- If the child did not mention “big, bugling or stick out”, you should hint “the characteristics of frogs’ eyes”\n- If the child mentioned 'bulging', you must explain it means the eyes are big and stick out. \nIf the child did not mention 'see in all directions', you need to prompt them to think about the frog's range of their vision." : ''}
        ${currentPageRef.current === 13 ? "- Do not mention 'frog’s tongue is sticky'/'moves quickly/fast'/'wraps around an insect'/’sticks to the insect’ in the hint.\n- Do not prompt the child to think about the speed of the frog’s tongue movement.\nYou must implicitly guide the child to figure out the characteristics of a frog's tongue and how it helps the frog catch living insects. These are the key points you need to scaffold the child to come up with. In addition, include 'living, moving insects' in your response to strengthen children's understanding of it." : ''}

    **Instructions for Asking a Reprompt Question (ONE question)**:   
        - After the hint, ask ***ONE*** reprompt question that 1) CONSISTENTLY follows the hint and reinforces the same underlying concept of the correct answer; 2) guides the child to find the missing part in the acceptance criteria;
        - The reprompt question must focus on connecting the hint to the answer and guiding the child to identify the missing part. Do not diverge the question to the page details. DO NOT MAKE THE QUESTION OBVIOUS ABOUT THE ANSWER OR THE KEY IDEA.
        - DO NOT include multiple elements in the reprompt question.
        ${currentPageRef.current === 3 ? "- If the child did not come up with 'wet skin' yet, prioritizing guiding them to think about the unique feature of frogs' skin. You can ask about 'what feature does a frog's skin have?'." : ""}
        ${currentPageRef.current === 4 ? " - Do not pose questions about emphasizing frogs' wet skin. Instead, guide the child to think about the two ways frogs breathe underwater and on land." : ''} 
        ${currentPageRef.current === 9 ? " - Do not pose questions about what sound the frogs would make. Instead, guide the child to think about how they attract mates and when they scream. Do not directly include the ways (e.g., use their voice, and when they are frightened) in the followup question." : ''}
        ${currentPageRef.current === 11 ? "- USE THESE CANDIDATE QUESTIONS: What are the features of frogs’ eyes? Why are frogs' big eyes helpful? What are frogs’ vision ranges? What directions can a frog see without moving?" : ''}
        ${currentPageRef.current === 13 ? "- If the child did not mention frogs' tongue wraps around an insect, you can ask 'What does a frog's tongue do to hold a living, moving insect?' \n- If the child did not mention frogs' tongue moves quickly, you can ask 'How does a frog’s tongue move when it catches a living insect?\nIf the child did not mention frogs’ tongue sticks to an insect, you can ask ‘How does a frog’s tongue move to catch an insect?; What happens when the frog’s tongue touches the insect?’" : ''} 
        - !!! DO NOT ASK "Can you ..." or "Do you ...".
        - !!! Ask exactly *ONE* question.
        - *DO NOT* ask a reprompt question that is not related to the hint you just provided OR not related to elements in the provided answer.

    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response (the acknowledgement, hint, and reprompt question taken together) should *NOT* reveal the answer. You should HINT the child to think more deeply and move in the right direction.
        ${currentPageRef.current === 11 ? "- !!! Make sure to mention the word 'bulging' in your response to help children understand its meaning." : ''}
        - The whole response must only include and end with *ONE question* (i.e., the reprompt question).
        - !!! Check if the hint can be used to answer your reprompt question. If so, you need to make it more implicit.
        - !!! ONLY INCLUDE ***ONE QUESTION*** IN THE WHOLE RESPONSE.
        - !! DO NOT USE "Can you ..." or "Do you ..." in the reprompt question.
        - Strictly focus your response on scaffolding the child to find the answer. Do not diverge the page content details to the importance of something.
        `
        const instruction4Incomplete2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        
        - the evaluation of the child's latest response: ${evaluation};
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        - the correct answer: ${knowledgeRef.current[currentPageRef.current]?.answer}

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. repeat answer, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        ${currentPageRef.current === 7 ? `- If the child's answer is reasonable, you should accept the answers by saying 'Great!', 'Good job!', 'Nice work!', 'Great Thinking!', 'Wow, that is a great observation!' etc.` : "- Since the evaluation of the child's response is 'correct but incomplete', you should first provide encouraging feedback (e.g., 'Great start!', 'Nice work! There's more to it', 'You got part of it!', etc.)."}
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for Repeating Answer**:
        - Repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) in this part. DO NOT OMIT ANY DETAILS.
        ${currentPageRef.current == 3 ? " - !!! Highlight that frogs' skin needs to be wet." : ''}
        ${currentPageRef.current === 4 ? "- !!! Highlight frogs can breathe through both LUNGS and SKIN in your response.": ""}
        ${currentPageRef.current === 5 ? " - !!! Highlight the word 'hibernation' when explaining the answer." : ''}
        ${currentPageRef.current === 11 ? "- !!! Highlight frogs' eyes are 'bulging', and can see in all directions without moving in your response.": ""}
        - Do not extend the explanation to the page details. Focus only on the provided answer.


    **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "What questions do you have for me about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! What questions do you have for me about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "What questions do you have for me about this page?")

    **Instructions for Whole Response**:
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response MUST repeat the answer to strengthen understanding.
        ${currentPageRef.current === 5 ? " - Highlight the word 'hibernation' when explaining the answer." : ''}
        - Do not extend your response to story text details.
        - The whole response should only include and end with ONE question sentence, which is the question "What questions do you have for me about this page?"
        `;
        let sumCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'fully correct' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 2) {
            console.log('instruction4Incomplete1');
            console.log(instruction4Incomplete1)
            return instruction4Incomplete1;
        } else {
            console.log('instruction4Incomplete2');
            return instruction4Incomplete2;
        }

    }

    const getInstruction4FactuallyIncorrect = (items, evaluation) => {
        const instruction4FactuallyIncorrect1 = `
You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - the acceptance criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}
        - the evaluation of the child's latest response: ${evaluation};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. hint, and 3. restate the main question.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        ${currentPageRef.current === 7 ? `- If the child's answer is reasonable, you should accept the answers by saying 'Great!', 'Good job!', 'Nice work!', 'Great Thinking!', 'Wow, that is a great observation!' etc.` : "- Since the evaluation of the child's response is 'factually incorrect', you should acknowledge their efforts and tailor your acknowledgment to the context (e.g., 'Let's think about it together!', 'That's a good try!', 'Let's try it again', and other similar acknowledgments)."}
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for hint (one sentence)**:
        - Provide an INDIRECT hint that guides children towards the correct answer. Do not disclose keywords in the answer.
        - Do not include any question or directly reveal parts of the correct answer and acceptance criteria in the hint.
        - Do not hint at multiple parts of the answer at once.
        - Your hint should NOT be specific.
        ${currentPageRef.current === 3 ? "- If the child did not come up with 'wet skin' yet, prioritizing guiding them to think about the unique feature of frogs' skin." : ''}
        ${currentPageRef.current === 4 ? " - Do not explicitly mention lungs and skin in the hint. You must implicitly guide the child to figure out the fact that frogs use wet skin to breath in water, use lungs and wet skins to breath on land, if the child didn't mention this in their answers." : ''}
        ${currentPageRef.current === 9 ? " - Do not explicitly mention scenarios like 'use their voices', ‘scream when frightened’ and 'scare others when frightened' in the hint. You can use implicit hint like 'when frogs encounter predators'." : ''} 
        ${currentPageRef.current === 11 ? "- If the child did not mention “big, bugling or stick out”, you should hint “the characteristics of frogs’ eyes”\n- If the child mentioned 'bulging', you must explain it means the eyes are big and stick out. \nIf the child did not mention 'see in all directions', you need to prompt them to think about the frog's range of their vision." : ''}
        ${currentPageRef.current === 13 ? "- Do not mention 'frog’s tongue is sticky'/'moves quickly/fast'/'wraps around an insect'/’sticks to the insect’ in the hint.\n- Do not prompt the child to think about the speed of the frog’s tongue movement.\nYou must implicitly guide the child to figure out the characteristics of a frog's tongue and how it helps the frog catch living insects. These are the key points you need to scaffold the child to come up with. In addition, include 'living, moving insects' in your response to strengthen children's understanding of it." : ''}


 **Instructions for Asking a Reprompt Question (ONE question)**:   
        - After the hint, ask ONE reprompt question that 1) CONSISTENTLY follows the hint and reinforces the same underlying concept; 2) guides the child to think in the right direction toward the key idea the child missed from the provided correct answer;
        - Strictly stick to acceptance criteria. Do not divergent the question to story details that not covered in the answer.
        - The reprompt question must focus on **connecting the hint to the answer and guiding the child to identify the missing part**. Do not diverge the question to the page details. DO NOT MAKE THE QUESTION OBVIOUS ABOUT THE ANSWER OR THE KEY IDEA.
         ${currentPageRef.current === 4 ? " - Do not pose questions about emphasizing frogs' wet skin. Instead, guide the child to think about the two ways frogs breathe underwater and on land." : ''}
      
        ${currentPageRef.current === 9 ? " - Do not pose questions about what sound the frogs would make. Instead, guide the child to think about how they attract mates and when they scream. Do not directly include the ways (e.g., use their voice, and when they are frightened) in the followup question." : ''}
        ${currentPageRef.current === 11 ? "- USE THESE CANDIDATE QUESTIONS: What are the features of frogs’ eyes? Why are frogs' big eyes helpful? What are frogs’ vision ranges? What directions can a frog see without moving?" : ''}
        ${currentPageRef.current === 13 ? "- If the child did not mention frogs' tongue wraps around an insect, you can ask 'What does a frog's tongue do to hold a living, moving insect?' \n- If the child did not mention frogs' tongue moves quickly, you can ask 'How does a frog’s tongue move when it catches a living insect?\nIf the child did not mention frogs’ tongue sticks to an insect, you can ask ‘How does a frog’s tongue move to catch an insect?; What happens when the frog’s tongue touches the insect?’" : ''} 
        - ***Do NOT start the question with "Can you xxx?", or "Do you xxx?" *** The reprompt question should be open-ended instead of in the form of a yes/no question.    
        - *DO NOT* ask a reprompt question that is not related to the hint you just provided OR not related to elements in the provided answer.
        - Ask exactly *ONE* question.

    **Instructions for Whole Response**:
        - End your response with a question.
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response (the acknowledgement, hint, and reprompt question taken together) should *NOT* reveal the answer. You should HINT the child to think more deeply and move in the right direction. Check if the hint can be used to answer your reprompt question. If so, you need to make it more implicit.
         ${currentPageRef.current === 11 ? "- !!! Make sure to mention the word 'bulging' in your response to help children understand its meaning." : ''}
        - The whole response must only include and end with *ONE question* (i.e., the reprompt question. *DO NOT* use yes/no questions like "Can you xxx?", or "Do you xxx?"
        - I noticed that you sometimes ask more than one question in a single turn. You must ask only ONE question in the whole response.
        - Your hint and reprompt question should focus on guiding the child coming up with correct the answer instead of diverging the page content details to the importance of something.
        `
        const instruction4FactuallyIncorrect2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the evaluation of the child's latest response: ${evaluation};
        - the correct answer: ${knowledgeRef.current[currentPageRef.current]?.answer}

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. repeat answer, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        ${currentPageRef.current === 7 ? `- If the child's answer is reasonable, you should accept the answers by saying 'Great!', 'Good job!', 'Nice work!', 'Great Thinking!', 'Wow, that is a great observation!' etc.` : "- Since the evaluation of the child's response is 'factually incorrect', you should acknowledge their efforts and tailor your acknowledgment to the context (e.g., 'Let's try it again', 'Let's think about it together!', 'That's a good try!', and other similar acknowledgments)."}
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for Repeating Answer**:
        - Repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) in this part. DO NOT OMIT ANY DETAILS.
        ${currentPageRef.current == 3 ? " - !!! Highlight that frogs' skin needs to be wet." : ''}
        ${currentPageRef.current === 4 ? "- !!! Highlight frogs can breathe through both LUNGS and SKIN in your response.": ""}
        ${currentPageRef.current === 5 ? " - !!! Highlight the word 'hibernation' when explaining the answer." : ''}
        ${currentPageRef.current === 11 ? "- !!! Highlight frogs' eyes are 'bulging', and can see in all directions without moving in your response.": ""}
        - Do not extend the explanation to the page details. Focus only on the provided answer.

   **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "What questions do you have for me about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! What questions do you have for me about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "What questions do you have for me about this page?")

    **Instructions for Whole Response**:
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response MUST repeat the answer to strengthen understanding.
        - Do not extend your response to story text details.
        - The whole response should only include ONE question sentence, which is the question "What questions do you have for me about this page?" * No Other Question Allowed *
        - Never explicitly include the acceptance criteria in the whole response.
        `
        let sumCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'fully correct' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant' || answer === 'uncertainty') {
                sumCount++;
            }
        }

        if (sumCount < 2) {
            console.log('instruction4FactuallyIncorrect1');
            return instruction4FactuallyIncorrect1;
        } else {
            console.log('instruction4FactuallyIncorrect2');
            return instruction4FactuallyIncorrect2;
        }
    }

    const getInstruction4IrrelevantResponse = (items, evaluation) => {
        const instruction4IrrelevantResponse1 = `
You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - the acceptance criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}
        - the evaluation of the child's latest response: ${evaluation};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. hint, and 3. restate the main question.
    **!!!Note!!!**: If the child doesn't want to talk, you must still focus the conversation on the question and answer. DO NOT diverge to other things.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        ${currentPageRef.current === 7 ? `- If the child's answer is reasonable, you should accept the answers by saying 'Great!', 'Good job!', 'Nice work!', 'Great Thinking!', 'Wow, that is a great observation!' etc.` : "- Since the child's response is irrelevant, acknowledge their efforts, gently redirect their focus to the question, and tailor your acknowledgment to the context (e.g., 'Great Thinking!', 'Let's think about what the question is asking,' 'Thanks for sharing that! Let's focus on what we are reading here,' 'I heard you! Let's think about what the question is asking' and other similar acknowledgments)."}
        - The acknowledgment should always shift the focus back to story.

    **Instructions for hint (one sentence)**:
        - Provide an INDIRECT hint that guides children towards the correct answer. Do not disclose keywords in the answer.
        - Do not include any question or directly reveal parts of the correct answer and acceptance criteria in the hint.
        - Do not hint at multiple parts of the answer at once.
        - Your hint should NOT be specific.
        ${currentPageRef.current === 3 ? "- If the child did not come up with 'wet skin' yet, prioritizing guiding them to think about the unique feature of frogs' skin." : ''}
        ${currentPageRef.current === 4 ? " - Do not explicitly mention lungs and skin in the hint. You must implicitly guide the child to figure out the fact that frogs use wet skin to breath in water, use lungs and wet skins to breath on land, if the child didn't mention this in their answers." : ''}
        ${currentPageRef.current === 9 ? " - Do not explicitly mention scenarios like 'use their voices', ‘scream when frightened’ and 'scare others when frightened' in the hint. You can use implicit hint like 'when frogs encounter predators'." : ''} 
        ${currentPageRef.current === 11 ? "- If the child did not mention “big, bugling or stick out”, you should hint “the characteristics of frogs’ eyes”\n- If the child mentioned 'bulging', you must explain it means the eyes are big and stick out. \nIf the child did not mention 'see in all directions', you need to prompt them to think about the frog's range of their vision." : ''}
        ${currentPageRef.current === 13 ? "- Do not mention 'frog’s tongue is sticky'/'moves quickly/fast'/'wraps around an insect'/’sticks to the insect’ in the hint.\n- Do not prompt the child to think about the speed of the frog’s tongue movement.\nYou must implicitly guide the child to figure out the characteristics of a frog's tongue and how it helps the frog catch living insects. These are the key points you need to scaffold the child to come up with. In addition, include 'living, moving insects' in your response to strengthen children's understanding of it." : ''}


       **Instructions for Asking a Reprompt Question (ONE question)**:   
        - After the hint, ask ONE reprompt question that 1) CONSISTENTLY follows the hint and reinforces the same underlying concept; 2) guides the child to think in the right direction toward the key idea the child missed from the provided correct answer;
        - Strictly stick to acceptance criteria. Do not divergent the question to story details that not covered in the answer.
        - The reprompt question must focus on connecting the hint to the answer and guiding the child to identify the missing part. Do not diverge the question to the page details. DO NOT MAKE THE QUESTION OBVIOUS ABOUT THE ANSWER OR THE KEY IDEA.
        ${currentPageRef.current === 4 ? " - Do not pose questions about emphasizing frogs' wet skin. Instead, guide the child to think about the two ways frogs breathe underwater and on land." : ''}
        ${currentPageRef.current === 9 ? " - Do not pose questions about what sound the frogs would make. Instead, guide the child to think about how they attract mates and when they scream. Do not directly include the ways (e.g., use their voice, and when they are frightened) in the followup question." : ''}
        ${currentPageRef.current === 11 ? "- USE THESE CANDIDATE QUESTIONS: What are the features of frogs’ eyes? Why are frogs' big eyes helpful? What are frogs’ vision ranges? What directions can a frog see without moving?" : ''}
        ${currentPageRef.current === 13 ? "- If the child did not mention frogs' tongue wraps around an insect, you can ask 'What does a frog's tongue do to hold a living, moving insect?' \n- If the child did not mention frogs' tongue moves quickly, you can ask 'How does a frog’s tongue move when it catches a living insect?\nIf the child did not mention frogs’ tongue sticks to an insect, you can ask ‘How does a frog’s tongue move to catch an insect?; What happens when the frog’s tongue touches the insect?’" : ''} 
        - ***Do NOT start the question with "Can you xxx?", or "Do you xxx?" *** The reprompt question should be open-ended instead of in the form of a yes/no question.    
        - *DO NOT* ask a reprompt question that is not related to the hint you just provided OR not related to elements in the provided answer.
        - Ask exactly *ONE* question.

    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response (the acknowledgement, hint, and reprompt question taken together) should *NOT* reveal the answer. You should HINT the child to think more deeply and move in the right direction. Check if the hint can be used to answer your reprompt question. If so, you need to make it more implicit.
         ${currentPageRef.current === 11 ? "- !!! Make sure to mention the word 'bulging' in your response to help children understand its meaning." : ''}
        - The whole response must only include and end with *ONE question* (i.e., the reprompt question. *DO NOT* use yes/no questions like "Can you xxx?", or "Do you xxx?"
        - I noticed that you sometimes ask more than one question in a single turn. You must ask only ONE question in the whole response.
        - Your hint and reprompt question should focus on guiding the child coming up with correct the answer instead of diverging the page content details to the importance of something.
        `
        const instruction4IrrelevantResponse2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the evaluation of the child's latest response: ${evaluation};
        - the correct answer: ${knowledgeRef.current[currentPageRef.current]?.answer};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. repeat answer, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        ${currentPageRef.current === 7 ? `- If the child's answer is reasonable, you should accept the answers by saying 'Great!', 'Good job!', 'Nice work!', 'Great Thinking!', 'Wow, that is a great observation!' etc.` : "- Since the child's response is irrelevant, acknowledge their efforts, gently redirect their focus to the question, and tailor your acknowledgment to the context (e.g., 'Let's think about what the question is asking,' 'Thanks for sharing that! Let's focus on what we are reading here,' 'I heard you! Let's think about what the question is asking' and other similar acknowledgments)."}
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for Repeating Answer**:
        - Repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) in this part. DO NOT OMIT ANY DETAILS.
        ${currentPageRef.current == 3 ? " - !!! Highlight that frogs' skin needs to be wet." : ''}
        ${currentPageRef.current === 4 ? "- !!! Highlight frogs can breathe through both LUNGS and SKIN in your response.": ""}
        ${currentPageRef.current === 5 ? " - !!! Highlight the word 'hibernation' when explaining the answer." : ''}
        ${currentPageRef.current === 11 ? "- !!! Highlight frogs' eyes are 'bulging', and can see in all directions without moving in your response.": ""}
        - Do not extend the explanation to the page details. Focus only on the provided answer.

   **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "What questions do you have for me about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! What questions do you have for me about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "What questions do you have for me about this page?")

    **Instructions for Whole Response**:
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response MUST repeat the answer to strengthen understanding.
        - Do not extend your response to story text details.
        - The whole response should only include ONE question sentence, which is the question "What questions do you have for me about this page?" * No Other Question Allowed *
        - Never explicitly include the acceptance criteria in the whole response.
        `
        let sumCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'fully correct' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 2) {
            console.log('instruction4IrrelevantResponse1');
            return instruction4IrrelevantResponse1;
        } else {
            console.log('instruction4IrrelevantResponse2');
            return instruction4IrrelevantResponse2;
        }
    }

    const getInstruction4Uncertainty = (items, evaluation) => {
        const instruction4Uncertainty1 = `
You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - the acceptance criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}
        - the evaluation of the child's latest response: ${evaluation};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. hint, and 3. restate the main question.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Since the child's response is uncertain, acknowledge their efforts and tailor your acknowledgment to the context (e.g., 'That's okay, I see you're unsure,' 'No worries,' 'Thank you for letting me know,' 'That's alright. I'm here to help', 'Let's think together', and other similar acknowledgments).

    **Instructions for hint (one sentence)**:
        - Provide an INDIRECT hint that guides children towards the correct answer. Do not disclose keywords in the answer.
        - Do not include any question or directly reveal parts of the correct answer and acceptance criteria in the hint.
        - Do not hint at multiple parts of the answer at once.
        - Your hint should be helpful but NOT too specific. 
         ${currentPageRef.current === 3 ? "- If the child did not come up with 'wet skin' yet, prioritizing guiding them to think about the unique feature of frogs' skin." : ''}
        ${currentPageRef.current === 4 ? " - Do not explicitly mention lungs and skin in the hint. You must implicitly guide the child to figure out the fact that frogs use wet skin to breath in water, use lungs and wet skins to breath on land, if the child didn't mention this in their answers." : ''}
        ${currentPageRef.current === 9 ? " - Do not explicitly mention scenarios like 'use their voices', ‘scream when frightened’ and 'scare others when frightened' in the hint. You can use implicit hint like 'when frogs encounter predators'." : ''} 
        ${currentPageRef.current === 11 ? "- If the child did not mention “big, bugling or stick out”, you should hint “the characteristics of frogs’ eyes”\n- If the child mentioned 'bulging', you must explain it means the eyes are big and stick out. \nIf the child did not mention 'see in all directions', you need to prompt them to think about the frog's range of their vision." : ''}
        ${currentPageRef.current === 13 ? "- Do not mention 'frog’s tongue is sticky'/'moves quickly/fast'/'wraps around an insect'/’sticks to the insect’ in the hint.\n- Do not prompt the child to think about the speed of the frog’s tongue movement.\nYou must implicitly guide the child to figure out the characteristics of a frog's tongue and how it helps the frog catch living insects. These are the key points you need to scaffold the child to come up with. In addition, include 'living, moving insects' in your response to strengthen children's understanding of it." : ''}

     
       **Instructions for Asking a Reprompt Question (ONE question)**:   
        - After the hint, ask ONE reprompt question that 1) CONSISTENTLY follows the hint and reinforces the same underlying concept; 2) guides the child to think in the right direction toward the key idea the child missed from the provided correct answer;
        - Strictly stick to acceptance criteria. Do not divergent the question to story details that not covered in the answer.
        - The reprompt question must focus on connecting the hint to the answer and guiding the child to identify the missing part. Do not divert the question to the page details. Do not include answer details in the reprompt question.
        ${currentPageRef.current === 3 ? "- If the child did not come up with 'wet skin' yet, prioritizing guiding them to think about the unique feature of frogs' skin. You can ask about 'what feature does a frog's skin have?'." : ""}
        ${currentPageRef.current === 4 ? " - Do not pose questions about emphasizing frogs' wet skin. Instead, guide the child to think about the two ways frogs breathe underwater and on land." : ''}
        ${currentPageRef.current === 9 ? " - Do not pose questions about what sound the frogs would make. Instead, guide the child to think about how they attract mates and when they scream. Do not directly include the ways (e.g., use their voice, and when they are frightened) in the followup question." : ''}
        ${currentPageRef.current === 11 ? "- USE THESE CANDIDATE QUESTIONS: What are the features of frogs’ eyes? Why are frogs' big eyes helpful? What are frogs’ vision ranges? What directions can a frog see without moving?" : ''}
        ${currentPageRef.current === 13 ? "- If the child did not mention frogs' tongue wraps around an insect, you can ask 'What does a frog's tongue do to hold a living, moving insect?' \n- If the child did not mention frogs' tongue moves quickly, you can ask 'How does a frog’s tongue move when it catches a living insect?\nIf the child did not mention frogs’ tongue sticks to an insect, you can ask ‘How does a frog’s tongue move to catch an insect?; What happens when the frog’s tongue touches the insect?’" : ''} 

        - ***Do NOT start the question with "Can you xxx?", or "Do you xxx?" *** The reprompt question should be open-ended instead of in the form of a yes/no question.    
        - *DO NOT* ask a reprompt question that is not related to the hint you just provided OR not related to elements in the provided answer.
        - Ask exactly *ONE* question.

    **Instructions for Whole Response**:
        - Do not end the conversation.
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response (the acknowledgement, hint, and reprompt question taken together) should *NOT* reveal the answer. You should HINT the child to think more deeply and move in the right direction. Check if the hint can be used to answer your reprompt question. If so, you need to make it more implicit.
         ${currentPageRef.current === 11 ? "- !!! Make sure to mention the word 'bulging' in your response to help children understand its meaning." : ''}
        - The whole response must only include and end with *ONE question* (i.e., the reprompt question. *DO NOT* use yes/no questions like "Can you xxx?", or "Do you xxx?"
        - I noticed that you sometimes ask more than one question in a single turn. You must ask only ONE question in the whole response.
        - Your hint and reprompt question should focus on guiding the child coming up with correct the answer instead of diverging the page content details to the importance of something.
        `
        const instruction4Uncertainty2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        - conversation history: ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
        - the evaluation of the child's latest response: ${evaluation};
        - the correct answer: ${knowledgeRef.current[currentPageRef.current]?.answer};

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgment, 2. explanation, and 3. conclusion.

    **Instructions for acknowledgment**:
        - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
        - Since the evaluation of the child's response is 'uncertainty', you should first provide encouraging feedback (e.g., "Let's try it again!", "Let's think about it together!", "That's a good try!", etc.).
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for Repeating Answer**:
        - Repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) in this part. DO NOT OMIT ANY DETAILS.
        ${currentPageRef.current == 3 ? " - !!! Highlight that frogs' skin needs to be wet." : ''}
        ${currentPageRef.current === 4 ? "- !!! Highlight frogs can breathe through both LUNGS and SKIN in your response.": ""}
        ${currentPageRef.current === 5 ? " - !!! Highlight the word 'hibernation' when explaining the answer." : ''}
        ${currentPageRef.current === 11 ? "- !!! Highlight frogs' eyes are 'bulging', and can see in all directions without moving in your response.": ""}
        - Do not extend the explanation to the page details. Focus only on the provided answer.

    **Instructions for Conclusion**:
        - Your conclusion should include ONE EXACT question "What questions do you have for me about this page?"
        - Keep the conclusion part concise, under 15 words. 
        - Here is an example: "It was fun chatting with you! What questions do you have for me about this page? " (Make sure to use different conclusions based on the examples, but always include ONLY ONE question "What questions do you have for me about this page?")

    **Instructions for Whole Response**:
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - Your response MUST repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) to strengthen understanding.
        - Do not extend your response to story text details.
        - The whole response should only include ONE question sentence, which is the question "What questions do you have for me about this page?" * No Other Question Allowed *
        - Never explicitly include the acceptance criteria in the whole response.
        `
        
        let sumCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'fully correct' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 2) {
            console.log('instruction4Uncertainty1');
            return instruction4Uncertainty1;
        } else {
            console.log('instruction4Uncertainty2');
            return instruction4Uncertainty2;
        }
        
        
    }

    const getInstruction4ChildQuestion = (items, evaluation) => {
        const instruction4ChildQuestion1 = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - child's latest response: the most recent input from the child.
        - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        
    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgement, 2. explanation, and 3. restate the main question

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Since the child posed a question, you should first acknowledge their effort and tailor your acknowledgement to the context (e.g., Good thinking!", "Oh it's an interesting question!", and more).
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for Explanation**:
        - If the child's question is not about the story, steer the conversation back to the story.
        - Give a concise explanation to the child's question.
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.
        - Since the child poses a question, answer the question with easy-to-understand words.

    **Instructions for Restate the Main Question**:
        - Restate the main question (${knowledgeRef.current[currentPageRef.current]?.question}) to the child using a natural, conversational tone that flows smoothly and avoids robotic repetition.
        - *Do NOT* ask the question in the form of "Can you xxx?", or "Do you xxx?" The restated question should be open-ended instead of in the form of a yes/no question.    
        - *DO NOT* ask a question that is beyond the main question.

    **Instructions for Whole Response**:
        - Do not include any inappropriate content, such as violence, sex, drugs, etc.
        - ALWAYS KEEP THE CONVERSATION FOCUS ON THE STORY AND FROGS (even if the child says irrelevant things / do not want to talk about frogs / do not want to keep talking)
        - When organizing all the elements above to form a whole response, make sure the whole response only includes one question sentence at the end.
        `;

        const instruction4ChildQuestion2 = `
    You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - child's latest response: the most recent input from the child (user).

    Building on previous conversation history, your response MUST contain three parts: 1. acknowledgement, 2. explanation, and 3. conclusion

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - If the child does not want to talk about the story, the acknowledgment should always shift the focus back to story.

    **Instructions for Explanation**:
        - First, if the child's question is not about the story, steer the conversation back to the story.
        - Then, determine if you are able to answer the question correctly. If you can, provide a simple and concise explanation of the question being asked. If you cannot, just say "I am not very knowledgeable about [topic], you can refer to [related books] book to learn more!", and end the conversation.
        - Do not extend the explanation to the page details. Focus only on the provided answer.

    **Instructions for Conclusion**:
        - DO NOT use question marks in the conclusion.
        - End the conversation with a declarative sentence.
        - Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples, but end the conclusion using declarative sentence, instead of questions.))
    
    **Instructions for Whole Response**:
        - Your response MUST repeat the answer (${knowledgeRef.current[currentPageRef.current]?.answer}) to strengthen understanding.
        - Do not extend your response to story text details.
        - End the conversation with a declarative sentence. Do not include any question marks in the whole response.
        `;
        let sumCount = 0;
        let correctCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant' || answer === 'uncertainty') {
                sumCount++;
            }
            if (answer === 'fully correct') {
                correctCount++;
            }
        }
        // check if correct
        if (sumCount === 2 && answerRecord[answerRecord.length - 1] === "child asks question") {
            console.log('instruction4ChildQuestion2');
            return instruction4ChildQuestion2;
        }
        else if (sumCount > 2 || correctCount > 0 ) {
            console.log('instruction4ChildQuestion2');
            return instruction4ChildQuestion2;
        } else {
            console.log('instruction4ChildQuestion1');
            return instruction4ChildQuestion1;
        }
    }

    const getInstruction4Invalid = (items, evaluation) => {
        const instruction4Invalid1 = `
        You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook. Now your task is to generate a response to the child's latest answer, based on the following information: 
        
        - the evaluation of the child's latest response: ${evaluation};

        **Instructions for Response**:
        - Since the evaluation of the child's response is 'invalid', you should respond with a friendly line, such as "I didn't hear your answer, can you say it again?", or "Oh I didn't catch that, can you say it again?".
        - DO NOT SAY ANYTHING ELSE THAT IS NOT IN THE INSTRUCTIONS.
        `;

        const instruction4Invalid2 = `
You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        - main question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        
        - child's latest response: the most recent input from the child (user).

    Since the evaluation of the child's response is 'invalid', your response should include three parts: 1. acknowledgement, 2. explanation, and 3. conclusion.

    **Instructions for Acknowledgement**:
        - Your acknowledgement should be friendly, non-repetitive, and under 25 words.
        - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
        - Use various acknowledgements. Do not repeat the same acknowledgement as in the conversation history. 
        - Example: "Let me share with you! (If the child didn't say anything) / No worries! We are learning together! (If the child didn't say anything) + While I didn't hear your answer, ...", and move on to the explanation.
    
    **Instructions for Explanation**:
        - Since the evaluation of the child's response is 'invalid', you should Cover ALL key elements of the answer's acceptance criteria (${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}) in your explanation, EXCLUDING THE ACCEPTANCE CRITERIA.
        - Your explanation should be suitable for children aged 6 to 8.
        - Keep your explanation simple, engaging and under 20 words.

    **Instructions for Conclusion**:
        - DO NOT use question marks in the conclusion.
        - End the conversation with a declarative sentence.
        - Here is an example: "It was fun chatting with you! Let's continue reading the story." (Make sure to use different conclusions based on the examples, but end the conclusion using declarative sentence, instead of questions.)
    
    **Instructions for Whole Response**:
        - End the conversation with a declarative sentence. Do not include any question marks in the whole response.
        - Never explicitly include the acceptance criteria in the whole response.
        `;

        let invalidCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'invalid') {
                invalidCount++;
            }
        }
        if (invalidCount > 2) {
            console.log('instruction4Invalid2');
            return instruction4Invalid2;
        } else {
            console.log('instruction4Invalid1');
            return instruction4Invalid1;
        }
    }


    const getInstruction4ConvEnd = (items, evaluation) => {
        const instruction4ConvEnd = `
        You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. 
        Now your task is to keep the focus of the conversation on the story and END the conversation with a friendly line, such as "It was fun chatting with you! Let's continue reading the story."
        
        **Instructions for Response**:
        - If the child asks a question, acknowledge their curiosity. If the asked question is not about the story, steer the conversation back to the story, and end the conversation with a friendly line, such as "It was fun chatting with you! Let's continue reading the story."
        - Otherwise (the child didn't ask a question), end your response with a friendly line, such as "It was fun chatting with you! Let's continue reading the story."
        - DO NOT INCLUDE ANY QUESTION IN YOUR RESPONSE.
        - DO NOT SAY ANYTHING ELSE THAT IS NOT IN THE INSTRUCTIONS.
        `;
        console.log(instruction4ConvEnd);
        return instruction4ConvEnd;
    }

    const getInstruction4FollowUp = (items, evaluation) => {
        const instruction4FollowUp1 = `
        You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. Now your task is to generate a response to the child's latest answer, based on the following information: 
        ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
        
        - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
        - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
        - the acceptance criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}

        You should first evaluate the child's latest response based on the main question and the answer, and then generate a response based on the evaluation.

        **Instructions for Evaluation**:
        *Question*: ${knowledgeRef.current[currentPageRef.current]?.question}
        *Answer*: ${knowledgeRef.current[currentPageRef.current]?.answer}
        Step 1: Read the conversation history, compare the child's latest response with the answer, and determine whether the child's latest response accurately addresses the main question (e.g., contains the key elements in the answer).
        Step 2: - If the child's response is CORRECT, your response should include three parts: acknowledgement, explanation, and conclusion.
                - In ALL OTHER CASES, including factually incorrect, irrelevant response, and uncertain answers (such as 'I don't know'), your response should include three parts: acknowledgement, hint, and ONE follow-up question.

        **Instructions for Response to Correct Answer**:
        - Your response should include three parts: acknowledgement, explanation, and conclusion.
        1. Acknowledgement:
            - For acknowledgement, your acknowledgment should be friendly, non-repetitive, and under 25 words.
            - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
            - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history.
            - Since the evaluation of the child's response is 'correct', you should acknowledge their answer and tailor your acknowledgment to the context (e.g., "Great job!", "Wow, that is a great observation!", "You are on the right track!", "Exactly!", "Excellent! You are really paying attention to the story details!", "Ah! Interesting idea!", "Good thinking!", and other similar acknowledgments)
        2. Explanation:
            - Your explanation should be suitable for children aged 6 to 8.
            - Keep your explanation simple, engaging, and under 20 words.
            - Since the evaluation of the child's response is 'correct', provide a concise explanation to deepen their understanding.
            - Do not include a question in the explanation.
        3. Conclusion:
            - Your conclusion should include ONE EXACT question "What questions do you have for me about this page?"
            - Keep the conclusion part concise, under 15 words. 
            - Here is an example: "It was fun chatting with you! What questions do you have for me about this page? " (Make sure to use different conclusions based on the examples, but always end with ONLY ONE question "What questions do you have for me about this page?")
        - When organizing all the elements above to form a whole response, make sure the whole response only includes and ends with ONE question sentence, which is the question "What questions do you have for me about this page?"

        **Instructions for Response to Answers that are NOT correct**:
        - Your response should include two parts: acknowledgement, hint, and ONE restated question.
        1. Acknowledgement:
            - Your acknowledgment should be friendly, non-repetitive, and under 25 words.
            - You need to avoid using judgmental words like 'wrong', 'incorrect', 'correct', 'right', etc.
            - Use various acknowledgments. Do not repeat the same acknowledgment as in the conversation history. 
            - Since the evaluation of the child's response is 'incorrect', you should acknowledge their efforts and tailor your acknowledgment to the context (e.g., "Let's try it again, "Let's think about it together!", and other similar acknowledgments).
        2. Hint:
            - *DO NOT* include the explicit correct answer in the hint.
            - Your hint should be suitable for children aged 6 to 8. Keep your hint indirect, simple, engaging and under 20 words.
            - *DO NOT* include a question in the hint.
            - Since the child's response is not correct, provide an implicit hint that guides them toward the correct answer without directly stating it.
        3. Restated Question:
            - Restate the main question (${knowledgeRef.current[currentPageRef.current]?.question}) to the child using a natural, conversational tone that flows smoothly and avoids robotic repetition.
            - ***Do NOT start the question with "Can you xxx?", or "Do you xxx?" *** The restated question should be open-ended instead of in the form of a yes/no question.    
            - *DO NOT* ask a question that is not the main question.

        **Instructions for Whole Response**:
            - If the child's response is CORRECT, make sure to only include and end with your response with ONE question "What questions do you have for me about this page?" in the whole response.
            - If the child's response is NOT correct, make sure your response ends with ONLY ONE restated question (RESTATING THE MAIN QUESTION (${knowledgeRef.current[currentPageRef.current]?.question})).
        `;

        const instruction4FollowUp2 = `
        You are a friendly chatbot engaging with a 6-8-year-old child, who is reading a storybook titled ${title}. 
        Now your task is to keep the focus of the conversation on the story and END the conversation with a friendly line, such as "It was fun chatting with you! Let's continue reading the story."
        
        **Instructions for Response**:
        Step 1: Evaluate the child's latest response based on the following information: 
            ${currentPageRef.current !== 5 && currentPageRef.current !== 6 ? `- Story text: ${pages[currentPageRef.current]?.text.join(' ')}` : ''}
            - Conversation history: 
            ${items.map(item => `${item.role}: ${item.content[0]?.transcript}`).join('\n')};
            - the question: ${knowledgeRef.current[currentPageRef.current]?.question}
            - the answer: ${knowledgeRef.current[currentPageRef.current]?.answer}
            - the acceptance criteria: ${knowledgeRef.current[currentPageRef.current]?.acceptance_criteria}
            - the evaluation of the child's latest response: ${evaluation};
        Step 2: Generate a response based on the evaluation.
            - If the child asks a question, acknowledge their curiosity and steer the conversation back to the story.
            - If the child answers the question correctly, acknowledge their answer and provide a concise explanation to deepen their understanding.
            - If the child answers the question incorrectly, acknowledge their efforts and explain the correct answer.
        Step 3: End the conversation:
            - End your response with a friendly line, such as "It was fun chatting with you! Let's continue reading the story."
        
        **Important Reminder**:
        - DO NOT INCLUDE ANY QUESTION IN YOUR RESPONSE.
        - DO NOT SAY ANYTHING ELSE THAT IS NOT IN THE INSTRUCTIONS.
        - END THE CONVERSATION WITH A FRIENDLY, DECLARATIVE LINE, SUCH AS "It was fun chatting with you! Let's continue reading the story."
        `;

        let sumCount = 0;
        for (const answer of answerRecordRef.current) {
            if (answer === 'fully correct' || answer === 'correct but incomplete' || answer === 'factually incorrect' || answer === 'irrelevant' || answer === 'uncertainty') {
                sumCount++;
            }
        }
        if (sumCount < 2) {
            console.log('instruction4FollowUp1');
            return instruction4FollowUp1;
        } else {
            console.log('instruction4FollowUp2');
            return instruction4FollowUp2;
        }
    }

    const getInstruction4NoResponse = () => {
        if (noResponseReminderCountRef.current == 1) {
            const lastQuestion = items[items.length - 1]?.content[0]?.transcript;
            console.log('lastQuestion', lastQuestion);
            if (lastQuestion?.toLowerCase().includes('what questions')) {
                const instruction4NoResponse1_1 = `
    **Instructions**:
        1. Ignore the chat history. Say "Hey, I didn't hear your answer. What questions do you have for me about this page?"
    **Important Reminder**:
        - Make sure to only ask this exact question ONCE ("Hey, I didn't hear your answer. What questions do you have for me about this page?"), and DO NOT SAY ANYTHING ELSE. DO NOT PROVIDE ANSWER TO YOUR QUESTION.`;
                console.log(instruction4NoResponse1_1);
                return instruction4NoResponse1_1;
            } else {
                const instruction4NoResponse2_1 = `
    **Instructions**:
        1. Find the last question the assistant asked in the previous round of the conversation: ${lastQuestion}
        2. Ignore the chat history. Say "Hey, I didn't hear your answer." and ADD the last question asked in the chat history.
        3. Do not ask a question that is not the last question in the chat history.
    **Important Reminder**:
        - Make sure to only ask this exact question ONCE, and do not say or ask anything else. DO not provide answer to your question.
                `;
                console.log(instruction4NoResponse2_1);
                return instruction4NoResponse2_1;
            }
        } else if (noResponseReminderCountRef.current == 2) {
            const lastQuestion = items[items.length - 2]?.content[0]?.transcript;
            console.log('lastQuestion', lastQuestion);
            if (lastQuestion?.toLowerCase().includes('what questions')) {
                const instruction4NoResponse1_2 = `
    **Instructions**:
        1. Ignore the chat history. Say "Hey, are you still there? What questions do you have for me about this page?"
    **Important Reminder**:
        - Make sure to only ask this exact question ONCE, and do not say or ask anything else. DO not provide answer to your question.`;
                console.log(instruction4NoResponse1_2);
                return instruction4NoResponse1_2;
            } else {
                const instruction4NoResponse2_2 = `
    **Instructions**:
        1. Find the last question the assistant asked in the previous round of the conversation: ${lastQuestion}
        2. Ignore the chat history. Say "Hey, are you still there?" and ADD the last question asked in the chat history.
        3. Do not ask a question that is not the last question in the chat history.
    **Important Reminder**:
        - Make sure to only ask this exact question ONCE, and do not say or ask anything else. DO not provide answer to your question.
                `;
                console.log(instruction4NoResponse2_2);
                return instruction4NoResponse2_2;
            }
        } else {
            const lastQuestion = items[items.length - 2]?.content[0]?.transcript;
            console.log('lastQuestion', lastQuestion);
            if (lastQuestion?.toLowerCase().includes('what questions')) {
                const instruction4NoResponse1_3 = `
        **Instructions**:
            1. Ignore the chat history. Say "Hey, let's continue reading the story."
        **Important Reminder**:
            - You must not say or ask anything else.`;
                    console.log(instruction4NoResponse1_3);
                    return instruction4NoResponse1_3;
                } else {
                    const instruction4NoResponse2_3 = `
       **Instructions**:
            1. Ignore the chat history. Reveal the answer ( ${knowledgeRef.current[currentPageRef.current]?.answer?.split('(The acceptance criteria')[0]}), and say "Let's continue reading the story."
        **Important Reminder**:
            - If there is an acceptance criteria in the answer, remove it in your response.
            - You must not say or ask anything else.`;
                    console.log(instruction4NoResponse2_3);
                    return instruction4NoResponse2_3;
                }
        }
    }

    const updateClientInstruction = async (instruction) => {
        if (evaluationInProgressRef.current) return;  // Guard against duplicate calls
        evaluationInProgressRef.current = true;
        const client = clientRef.current;
        sessionInstructionRef.current = instruction;
        client.updateSession({ instructions: instruction });
        client.realtime.send('response.create');
        console.log(instruction);
    }

    const startResponseTimer = async () => {
        // update the response timer every 1 second
        console.log('startResponseTimer');
        userRespondedRef.current = false;
        if (noResponseReminderCountRef.current < 3) {
            isWaitingForResponseRef.current = false;
        } else {
            isWaitingForResponseRef.current = true;
        }
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
          if (isClientSetup && !evaluationInProgressRef.current) {
            noReponseCntRef.current = noReponseCntRef.current + 1;
            noResponseReminderCountRef.current += 1;
            
            client.realtime.send('response.create', {
                response: {
                    "modalities": ["text", "audio"],
                    "instructions": getInstruction4NoResponse(),
                    "temperature": 0.7
                }
            });
            
            console.log(`No response reminder count: ${noResponseReminderCountRef.current}`);
            
            // 重置计时器以便下一个15秒计时
            setTimer(0);
            
            // 只有在发送了3次提醒后才停止计时器
            if (noResponseReminderCountRef.current >= 3) {
              if (timerRef.current) clearInterval(timerRef.current);
            }
          }
        }
    }, [timer, userRespondedRef.current]);

    useEffect(() => {
        return () => {
          if (timerRef.current) clearInterval(timerRef.current);
          if (responseTimeoutRef.current) clearTimeout(responseTimeoutRef.current);
        };
      }, []);

    const setupClient = async (instruction) => {
        (async () => {
            console.log('setting up client');
            console.log('currentPageRef.current', currentPageRef.current);
            const wavStreamPlayer = wavStreamPlayerRef.current;
            const client = clientRef.current;
            sessionInstructionRef.current = instruction;
            client.updateSession({ instructions: instruction });
            client.updateSession({ voice: 'alloy' });
            client.updateSession({ input_audio_transcription: { model: 'whisper-1', language: 'en' } });
            // client.updateSession({
            //     turn_detection: { type: 'server_vad' }, // or 'server_vad'
            //     input_audio_transcription: { model: 'whisper-1', language: 'en' },
            // });
            if (!realtimeListenersAttachedRef.current) {
            client.on('error', (event) => console.error(event));
            client.on('conversation.interrupted', async () => {
                const trackSampleOffset = await wavStreamPlayer.interrupt();
                if (trackSampleOffset?.trackId) {
                const { trackId, offset } = trackSampleOffset;
                await client.cancelResponse(trackId, offset);
                }
                userRespondedRef.current = true;
                isWaitingForResponseRef.current = false;
                evaluationInProgressRef.current = false;  // Reset guard when conversation interrupted
                setIsVoiceInputDisabled(false);
                noResponseReminderCountRef.current = 0; // 重置无响应提醒计数器
                if (timerRef.current) clearInterval(timerRef.current);
                setTimer(0);
            });
            client.on('conversation.item.appended', (item) => {
                console.log('conversation.item.appended');
                // Clear response fallback timeout when we receive any assistant response
                if (item.role === 'assistant' && isWaitingForEvaluationRef.current) {
                    if (responseTimeoutRef.current) {
                        clearTimeout(responseTimeoutRef.current);
                        responseTimeoutRef.current = null;
                    }
                }
            });
            client.on('conversation.updated', async ({ item, delta }) => {
                const items = client.conversation.getItems();
                // set timer to 0
                setTimer(0);
                // console.log('item', item);
                if(timerRef.current) clearInterval(timerRef.current);
                // Clear response fallback timeout when we receive assistant content
                if ((delta?.transcript || delta?.audio) && item.role === 'assistant' && isWaitingForEvaluationRef.current) {
                    if (responseTimeoutRef.current) {
                        clearTimeout(responseTimeoutRef.current);
                        responseTimeoutRef.current = null;
                    }
                }
                // if the item starts with <eval>, delete it
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
                // the evaluation failed
                console.log('waiting for evaluation', isWaitingForEvaluationRef.current);
                if (item.status === 'incomplete' && item.role === 'assistant' && isWaitingForEvaluationRef.current) {
                    console.log('incomplete item', item);
                    try {
                        await client.realtime.send('response.cancel');
                    } catch (error) {
                        console.error('Error deleting item:', error);
                    }
                    if (!resendFlagRef.current) {
                        try {
                            console.log('resending response');
                            const currentItems = client.conversation.getItems();
                            await client.realtime.send('response.create', {
                                response: {
                                    "modalities": ["text", "audio"],
                                    "instructions": getInstruction4Evaluation(currentItems)
                                }
                            });
                            resendFlagRef.current = true;
                        } catch (error) {
                            console.error('Error deleting item:', error);
                        }
                    } else {
                        console.log('second time, do not resend');
                        try {
                            isWaitingForEvaluationRef.current = false;
                            const answerOrder = Math.floor((items.length - noReponseCntRef.current) / 2) - 1;
                            
                            appendAnswerRecord(answerOrder, 'follow up');
                            console.log('answerRecord', answerRecordRef.current);
                            await sendResponse(client, 'follow up', items);
                        } catch (error) {
                            console.error('Error sending response:', error);
                        }
                    }
                }
                // console.log('item.id, item to respond', item.id, itemToRespondRef.current);
                // console.log('item status', item.status);
                // console.log('item', item);
                if (item.status === 'completed') {
                    if (isWaitingForEvaluationRef.current) {
                        if (item.content.length === 0 && item.role === 'assistant' && item.id !==itemToRespondRef.current) {
                            console.log('item content is empty');
                            itemToRespondRef.current = item.id;
                            try {
                                await client.realtime.send('conversation.item.delete', {
                                    item_id: item.id
                                });
                                console.log('follow up response for empty evaluation');
                                // another method is to use the follow up prompt
                                isWaitingForEvaluationRef.current = false;
                                    evaluationInProgressRef.current = false;
                                await sendResponse(client, 'follow up', items);
                                // await client.realtime.send('response.create', {
                                //     response: {
                                //         "modalities": ["text", "audio"],
                                //         "instructions": getInstruction4Evaluation(items)
                                //     }
                                // });
                            } catch (error) {
                                console.error('Error sending response:', error);
                            }
                        }
                        else if (item.content[0]?.text && item.role === 'assistant' && item.id !==itemToRespondRef.current) {
                            console.log('evaluation item', item.content[0]?.text);
                            let evaluation = getEvaluation(item.content[0]?.text);
                            itemToRespondRef.current = item.id;
                            try {
                                await client.realtime.send('conversation.item.delete', {
                                    item_id: item.id
                                });
                                isWaitingForEvaluationRef.current = false;
                                    evaluationInProgressRef.current = false;
                                const answerOrder = Math.floor((items.length - noReponseCntRef.current) / 2) - 1;
                                
                                appendAnswerRecord(answerOrder, evaluation);
                                console.log('answerRecord', answerRecordRef.current);
                                await sendResponse(client, evaluation, items);
                            } catch (error) {
                                console.error('Error sending response:', error);
                            }
                        }
                    }
                    if (item.formatted.audio?.length) {
                        // console.log('current item', item);
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
                        // const chatWindow = document.getElementsByClassName('chat-window')[0];
                        // if (chatWindow) {
                        //     chatWindow.scrollTop = chatWindow.scrollHeight;
                        // }
                        if (item.role === 'assistant') {
                            // if the last item does not end with a question mark, it means the conversation is ended
                            if (!item?.content[0]?.transcript?.endsWith('?') && !item?.content[0]?.transcript?.endsWith('? ') && !item?.content[0]?.transcript?.endsWith('talk.')) {
                                while (wavStreamPlayer.isPlaying() || isReplayingRef.current) {
                                    await new Promise(resolve => setTimeout(resolve, 100));
                                }
                                console.log('conversation ended');
                                if (!isReplayingRef.current && !isAskingRef.current) {
                                    setIsVoiceInputDisabled(false);
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
                                        setIsVoiceInputDisabled(false);
                                        startResponseTimer();
                                    }
                                }
                            }
                        } else {
                            setIsFirstTime(false);
                        }
                    } else if (item.role === 'assistant' && item.content[0]?.transcript) {
                        // Conversation end detection when response has transcript but no audio (e.g. API edge case, async audio)
                        // Skip evaluation items (JSON format, get deleted - they have content[0].text with "evaluation")
                        const transcript = item.content[0].transcript;
                        const isEvaluationItem = transcript.trim().startsWith('{') || transcript.includes('"evaluation"');
                        if (!isEvaluationItem && !transcript.endsWith('?') && !transcript.endsWith('? ') && !transcript.endsWith('talk.')) {
                            console.log('conversation ended (transcript only, no audio)');
                            if (!isReplayingRef.current && !isAskingRef.current) {
                                setIsVoiceInputDisabled(false);
                                setIsConversationEnded(true);
                            }
                        }
                    }
                }
                setItems(items);
            });
            client.on('disconnect', async () => {
                console.log('WebSocket disconnected');
                setIsConnected(false);
                
                // 尝试重新连接
                try {
                    await connectConversation();
                    console.log('Successfully reconnected');
                    // 重新设置client配置
                    client.updateSession({ instructions: sessionInstructionRef.current });
                    client.updateSession({ voice: 'alloy' });
                    client.updateSession({ input_audio_transcription: { model: 'whisper-1', language: 'en' } });
                } catch (error) {
                    console.error('Failed to reconnect:', error);
                }
            });
            realtimeListenersAttachedRef.current = true;
            }
            
            if (!client.isConnected()) {
                await connectConversation();
            }   
        
            if (!evaluationInProgressRef.current) {
                evaluationInProgressRef.current = true;
                client.realtime.send('response.create');
            }
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
        if (transcript.includes('correct') || transcript.includes('correct but incomplete') || transcript.includes('factually incorrect') || transcript.includes('irrelevant') || transcript.includes('uncertainty') || transcript.includes('child asks question') || transcript.includes('invalid') || transcript.includes('conv end')) {
            return true;
        }
        return false;
    }

    const getEvaluation = (transcript) => {
        if (transcript.includes('correct but incomplete')) {
            return 'correct but incomplete';
        }
        else if (transcript.includes('factually incorrect')) {
            return 'factually incorrect';
        }
        else if (transcript.includes('fully correct')) {
            return 'fully correct';
        }
        else if (transcript.includes('irrelevant')) {
            return 'irrelevant';
        }
        else if (transcript.includes('uncertainty')) {
            return 'uncertainty';
        }
        else if (transcript.includes('child asks question')) {
            return 'child asks question';
        }
        else if (transcript.includes('invalid')) {
            return 'invalid';
        }
        else if (transcript.includes('conv end')) {
            return 'conv end';
        }
        return 'follow up';
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
            // Keep disabled - we're about to play another message
        }

        // If clicking on the currently playing message
        if (replayingIndex === index) {
            if (isReplayingRef.current) {
                replayAudio.pause();
                isReplayingRef.current = false;
                setIsVoiceInputDisabled(false);
            }
            else {
                // Resume playing
                await wavStreamPlayer.interrupt();
                setIsVoiceInputDisabled(true);
                replayAudio.play();
                isReplayingRef.current = true;
            }
            return;
        }

        // Start playing a new message
        await wavStreamPlayer.interrupt();
        setIsVoiceInputDisabled(true);
        replayAudio.src = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory][index].formatted.file.url;
        replayAudio.currentTime = 0;
        try {
            await replayAudio.play();
            setReplayingIndex(index);
            isReplayingRef.current = true;
            
            const enableVoiceInput = () => {
                isReplayingRef.current = false;
                setReplayingIndex(null);
                setIsVoiceInputDisabled(false);
            };
            
            // 添加暂停事件监听器
            replayAudio.onpause = () => {
                enableVoiceInput();
            };
    
            // 添加播放事件监听器
            replayAudio.onplay = () => {
                isReplayingRef.current = true;
            };
            
            replayAudio.onended = () => {
                console.log('replay ended');
                enableVoiceInput();
            };
        } catch (error) {
            console.error('Error playing audio:', error);
            isReplayingRef.current = false;
            setReplayingIndex(null);
            setIsVoiceInputDisabled(false);
        }
    }

    const handleExpandChat = () => {
        setIsExpandedChat(!isExpandedChat);
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.height = isExpandedChat ? '35%' : '55%';
    }
    
    const handleMinimizeChat = async () => {
        setIsMinimizedChat(!isMinimizedChat);
        setIsExpandedChat(false);
        const chatContainer = document.getElementById('chat-container');
        chatContainer.style.height = isMinimizedChat ? '30%' : '35%';
        // const wavStreamPlayer = wavStreamPlayerRef.current;
        // await wavStreamPlayer.interrupt();
    }

    const handlePenguinClick = () => {
        if (isMinimizedChat) {
            setIsMinimizedChat(false);
        }
    }


    const handleCloseChat = async () => {
        console.log('handleCloseChat');
        const wavStreamPlayer = wavStreamPlayerRef.current;
        await wavStreamPlayer.interrupt();
        try {
            await uploadChatHistoryToBackend({
                apiUrl,
                user,
                title,
                page: currentPageRef.current,
                chatHistory: currentPageChatHistory,
            });
        } catch (error) {
            console.error('Error sending chat history to backend', error);
        }
        setIsVoiceInputDisabled(false);
        if (isKnowledge) {
            console.log('isKnowledge', isKnowledge);
            setIsKnowledge(false);
            isAskedRef.current = true;
            chatHistoryRef.current[currentPageRef.current] = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory];
            setTimeout(() => {
                // audioRef.current.play();
                console.log('isKnowledge', isKnowledge);
                if (currentPageRef.current < pages.length - 1) {
                    setIsPlaying(true);
                    handleNextPage();
                }
            }, 300);
        }
        else {
            // setIsAsking(false);
            setIsKnowledge(false);
            isAskingRef.current = false;
            chatHistoryRef.current[currentPageRef.current] = [...chatHistoryRef.current[currentPageRef.current], ...currentPageChatHistory];
        }
    }


    // if the 'clientsetup' changes, console log the change
    useEffect(() => {
        console.log('clientsetup changed', isClientSetup);
    }, [isClientSetup]);

    // if currentPage changes, set isAsked to false
    // useEffect(() => {
    //     console.log('currentPage changed', currentPage);
    // }, [currentPage]);


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
            case 'fully correct':
                return getInstruction4Correct(items, evaluation);
            case 'correct but incomplete':
                return getInstruction4Incomplete(items, evaluation);
            case 'factually incorrect':
                return getInstruction4FactuallyIncorrect(items, evaluation);
            case 'irrelevant':
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
        const currentItems = client.conversation.getItems();
        for (const item of currentItems) {
            if ((item.status === 'in_progress' || item.status === 'failed') && evalStatus(item.content?.[0]?.transcript)) {
                await client.realtime.send('response.cancel', {
                    item_id: item.id
                });
            }
        }

        switch (evaluation) {
            case 'fully correct':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Correct(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'correct but incomplete':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Incomplete(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'factually incorrect':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4FactuallyIncorrect(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'irrelevant':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4IrrelevantResponse(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'uncertainty':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Uncertainty(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'child asks question':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4ChildQuestion(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'invalid':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4Invalid(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
            case 'conv end':
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4ConvEnd(items, evaluation),
                        "temperature": 0.7
                    }
                });
                break;
            default:
                await client.realtime.send('response.create', {
                    response: {
                        "modalities": ["text", "audio"],
                        "instructions": getInstruction4FollowUp(items, evaluation),
                        "temperature": 0.7
                    }
                });
                userRespondedRef.current = false;
                break;
        }
        // Reset guard after response.create completes
        evaluationInProgressRef.current = false;
    };

    // Define style objects for conditional rendering
    const bookContentStyle = {
        justifyContent: isKnowledge ? 'flex-start' : 'center'
    };
    
    const bottomBoxStyle = {
        flexBasis: isKnowledge ? '150px' : '100px'
    };

    const bookImgStyle = {
        width: isKnowledge ? (currentPageRef.current === 2 ? '70%' : '75%') : '100%'
    };

    const toggleSpeedClick = () => {
        setShowSpeedSlider(!showSpeedSlider);
    };

    const chatContainerStyle = {
        // height: isKnowledge 
        //     ? (currentPageRef.current === 2 || currentPageRef.current === 5) ? '40%' : (currentPageRef.current === 7)
        //         ? '35%'
        //         : '55%'
        //     : chatBoxSize.height
        height: '36%'
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

    // Auto-scroll chat window to bottom when content changes
    useEffect(() => {
        if (chatWindowRef.current) {
            chatWindowRef.current.scrollTop = chatWindowRef.current.scrollHeight;
        }
    }, [currentPageChatHistory, currentPageRef.current]);

    return (
        <Box className="background-container">
            <Header user={user} title={title} hasTitle={true} />
            <div id='main-container'>
                <div id='book-container'>
                    <Box id='book-content' style={bookContentStyle}>
                        <IconButton
                        id="prev-btn"
                        variant='plain'
                        onClick={handlePrevPage}
                        disabled={currentPageRef.current === 0}
                        sx={{ opacity: 0.7, padding: '12px', minWidth: '96px', minHeight: '96px' }}
                        >
                            <FaCaretLeft size={80} color='#2A2278'/>
                        </IconButton>

                        <Box id='book-img' style={bookImgStyle}>
                            <img 
                                src={pages[currentPageRef.current]?.image} 
                                alt={`Page ${currentPageRef.current + 1}`}
                                onLoad={handleImageLoad}
                            />
                        </Box>

                    <IconButton
                        id="next-btn"
                        variant='plain'
                        onClick={handleNextPage}
                        sx={{ opacity: 0.7, padding: '12px', minWidth: '96px', minHeight: '96px' }}
                        >
                        <FaCaretRight size={80} color='#2A2278'/>
                    </IconButton>
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
                        <div id='caption-btn-box'>
                            <IconButton variant='plain' onClick={handleCaptionToggle} style={{ zIndex: 2, color: 'white', fontSize: '30px', backgroundColor: 'rgba(0,0,0,0)' }}>
                                <FaRegClosedCaptioning />
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
                </Box>            
            </div>
            <div id='bottom-box' style={bottomBoxStyle}>
                {showCaption && 
                        <div id='caption-box'>
                            {/* keep the caption at the center of the caption-box */}
                        <h4 id="caption">
                            {/* <Button onClick={togglePlayPause} variant="contained" color="primary">
                                {isPlaying ? <FaPause /> : <FaPlay />}
                            </Button> */}
                            {pages[currentPageRef.current]?.text[currentSentence]}
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
            {(isAskingRef.current || isKnowledge) && (
                    <Box id='chat-container' style={chatContainerStyle} sx={{ position: 'absolute', width: chatBoxSize.width, height: chatBoxSize.height }}>
                        {/* if is recording, add a black layer on top of chat-window, if isn't recording, remove the layer */}
                        {isRecording && (
                            <Box id='recording-layer' style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderRadius: '16px', backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 101 }}></Box>
                        )}
                        {isRecording && (
                            <div id='audio-visualizer' style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%, -50%)', width: '100px', height: '100px', zIndex: 105, pointerEvents: 'none' }}>
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
                        {/* <IconButton 
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
                            <IoMdCloseCircle size={36} color='#7AA2E3' />
                        </IconButton> */}
                       
                    <Box className='chat-window' ref={chatWindowRef}>
                        
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
                                            {msg.status === 'completed' && !msg.content?.[0]?.transcript?.startsWith('<') && msg.content?.[0]?.transcript !== '' && (
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
                            { isRecording && (
                                <>
                                    <div id='recording-box-1' />
                                    <div id='recording-box-2' />
                                </>
                            )}
                            <div 
                                id='chat-input'
                                role="button"
                                tabIndex={0}
                                aria-disabled={!isConnected || !canPushToTalk || isVoiceInputDisabled}
                                className='no-selection'
                                onKeyDown={(e) => { if (e.key === 'Enter' && isConnected && canPushToTalk && !isVoiceInputDisabled) toggleRecording(); }}
                                onContextMenu={(e) => e.preventDefault()}
                                style={{
                                    border: 'none',
                                    cursor: isVoiceInputDisabled ? 'not-allowed' : 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    backgroundColor: '#F4A011',
                                    position: 'relative',
                                    zIndex: 103,
                                    opacity: isVoiceInputDisabled ? 0.8 : 1
                                }}
                            >
                                {/* Invisible overlay to capture clicks on entire button area */}
                                <div 
                                    style={{ 
                                        position: 'absolute', 
                                        inset: 0, 
                                        zIndex: 104,
                                        pointerEvents: (!isConnected || !canPushToTalk || isVoiceInputDisabled) ? 'none' : 'auto'
                                    }} 
                                    onClick={(e) => { e.stopPropagation(); toggleRecording(); }}
                                />
                                {isVoiceInputDisabled && !isRecording ? (
                                    <h4 style={{ color: 'white', fontSize: '27px', fontFamily: 'Cherry Bomb' }} className="loading-dots">...</h4>
                                ) : isRecording ? 
                                    <h4 style={{ color: 'white', fontSize: '27px', fontFamily: 'Cherry Bomb' }}>Click to send</h4>
                                : <div>
                                        <div style={{ width: '90%', height: '25%', backgroundColor: '#FFFFFF4D', position: 'absolute', top: '7px', left: '3%', borderRadius: '20px' }}></div>
                                        <img src='./files/imgs/ring.svg' alt='ring' style={{ width: '35px', height: '35px', position: 'absolute', top: '2px', right: '6px', borderRadius: '50%' }} />
                                        <h4 style={{ color: 'white', fontSize: '27px', fontFamily: 'Cherry Bomb' }}>Click to talk!</h4>
                                </div>}
                            </div>
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

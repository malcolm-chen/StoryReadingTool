import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress } from '@mui/joy';
import { Button, Image } from 'react-bootstrap';
import { GiSpellBook } from "react-icons/gi";
import { FcNext } from "react-icons/fc";
import { RiChatVoiceFill } from "react-icons/ri";
import { MdOutlineReplayCircleFilled } from "react-icons/md";

const GreetPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [user, setUser] = useState(location.state?.user || 'User');
    const [isListening, setIsListening] = useState(false); 
    const [transcript, setTranscript] = useState('');
    const penguin = './files/imgs/penguin1.svg';

    let audio = new Audio();

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

    const startVoiceRecognition = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';
        recognition.interimResults = false;

        recognition.start();
        setIsListening(true);

        recognition.onresult = (event) => {
            const text = event.results[0][0].transcript;
            setTranscript(text);
            handleSubmit(text); 
        };

        recognition.onend = () => {
            setIsListening(false); 
        };

        recognition.onerror = (error) => {
            console.error('Speech recognition error:', error);
            setIsListening(false);
        };
    };

    const handleSubmit = (text) => {
        console.log('Submitted text:', text);
    };


    useEffect(() => {
        
    });
    

    return (
        <Box className="background-container">
            <Box className='header' >
                <Typography level='h4' component='h1' sx={{ fontWeight: 'bold', textAlign: 'center', color: '#272343', fontStyle: 'italic' }}>
                    <GiSpellBook size={30} color='229799' style={{ marginRight: "1%" }}/>StoryMate
                </Typography>
                <Avatar className='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793'}}>{'U'.substring(0, 2)}</Avatar>
            </Box>
            <Breadcrumbs id='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                <Link href='/select' onClick={handleLinkSelect} >Library</Link>
                <Link href='/mode' onClick={handleLinkMode} >Mode Select</Link>
                <Typography>{title}</Typography>
            </Breadcrumbs>
            <Box className='main-content'>
                <Box className='instruction-box-greet'>
                    <Typography className='instruction' level='h4' style={{ display: "flex", alignItems: "center" }} ><FcNext style={{ marginRight: "1%" }}/>Meet </Typography>
                    <Typography className='instruction' level='h4' style={{ marginLeft: "5px", marginRight: "5px", color: "#ffd803", fontWeight: "900" }} > Sparky </Typography>
                    <Typography className='instruction' level='h4'>, your reading mate!</Typography>
                </Box>
                <Box className='greet-chat-box'>
                    <Box id='chat-window'>
                        <Box id="chatbot-msg">
                            <Image id='chatbot-avatar' src={penguin}></Image>
                            <Box id='msg-bubble'>
                                <Typography id="chatbot-text" level='h4'>Hello! I am Sparky, your reading mate. I am here to help you read your book. Let's get started!</Typography>
                            </Box>
                        </Box>
                        <Box id="user-msg">
                        </Box>
                    </Box>
                    <Box id='chat-input'>
                        {!isListening && (
                            <IconButton id='voice-input-btn' variant='plain' onClick={startVoiceRecognition} >
                                <RiChatVoiceFill size={40} color='#7AA2E3' style={{marginRight: "2vw"}} />
                                <Typography id='voice-input-text' level='h4'>Click here to reply!</Typography>
                            </IconButton>
                        )}
                        {isListening && (
                        <input id='chat-input-text' type='text' placeholder='Listening...' value={transcript}/>)}                    
                    </Box>
                </Box>
            </Box>
        </Box>
    )

};

export default GreetPage;
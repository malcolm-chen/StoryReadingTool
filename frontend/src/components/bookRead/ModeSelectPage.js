import React, { useState, useEffect } from 'react';
import { Avatar, Button, Box, Card, Typography, Breadcrumbs } from '@mui/joy';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FcReading, FcIdea, FcNext } from "react-icons/fc";
import { GiSpellBook } from "react-icons/gi";

const ModeSelectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [user, setUser] = useState(location.state?.user || 'User');
    const [modeSet, setModeSet] = useState(false);

    const handleModeSelect = (isReadMode) => {
        setModeSet(true); 
        localStorage.setItem('modeSet', 'true');  
        localStorage.setItem('isReadOnly', isReadMode.toString());  
        navigate(isReadMode ? '/read' : '/greet', { state: {
            title: title,
            user: user
        } }); 
    };

    const handleLinkSelect = (e) => {
        e.preventDefault();
        navigate('/select', { state: { title: title, user: user } });
    };

    return (
        <Box className="background-container">
            <Box className='header' >
                <Typography level='h4' component='h1' sx={{ fontWeight: 'bold', textAlign: 'center', color: '#272343', fontStyle: 'italic' }}>
                    <GiSpellBook size={30} color='229799' style={{ marginRight: "1%" }}/>StoryMate
                </Typography>
                <Avatar className='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793'}}>{user.substring(0, 2)}</Avatar>
            </Box>
            <Breadcrumbs id='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                <Link href='/select' onClick={handleLinkSelect} >Library</Link>
                <Typography>Mode Select</Typography>
            </Breadcrumbs>
            <Box className='main-content'>
                <Box className='instruction-box'>
                    <Typography className='instruction' level="h4" gutterBottom><FcNext style={{ marginRight: "1%" }}/> Select a mode to read the book!</Typography>
                </Box>
                <Box className='mode-select'>
                    <Button id='mode-btns' onClick={() => handleModeSelect(true)}><FcReading style={{ marginRight: "3vh" }} />  Read Only</Button>
                    <Typography className='mode-text' level='h4' sx={{ fontWeight: '300' }} >Enjoy reading along with a narration.</Typography>
                </Box>
                <Box className='mode-select'>
                    <Button id='mode-btns' onClick={() => handleModeSelect(false)}><FcIdea style={{ marginRight: "3vh" }} />  Read and Chat</Button>
                    <Typography className='mode-text' level='h4' sx={{ fontWeight: '300' }} >Enjoy interactively reading with a reading mate.</Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default ModeSelectPage;

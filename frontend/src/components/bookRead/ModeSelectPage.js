import React, { useState, useEffect } from 'react';
import { Avatar, Button, Box, Card, Typography, Breadcrumbs } from '@mui/joy';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FcReading, FcIdea, FcNext } from "react-icons/fc";
import { GiSpellBook } from "react-icons/gi";
import { IoLibrary } from "react-icons/io5";
import { MdChromeReaderMode } from "react-icons/md";
import Header from '../header';

const ModeSelectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [user, setUser] = useState(localStorage.getItem('username') || 'User');
    console.log(user);
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
            <Header user={user} />
            <Breadcrumbs className='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                <Link href='/select' onClick={handleLinkSelect} ><IoLibrary /> Library</Link>
                <Typography><MdChromeReaderMode /> Mode Select</Typography>
            </Breadcrumbs>
            <Box className='main-content'>
                <Box className='instruction-box'>
                    <h2 id='page-title'><MdChromeReaderMode size={30} color='#ffd803' style={{ marginRight: "1%" }} /> Mode Select</h2>
                    <h4 className='instruction'>
                        {/* <FcNext style={{ marginRight: "1%" }}/>  */}
                    Select a mode to read the book!</h4>
                </Box>
                <Box className='mode-select'>
                    <Button id='mode-btns' onClick={() => handleModeSelect(true)}><FcReading style={{ marginRight: "3vh" }} />  Read Only</Button>
                    <h4 className='mode-text' sx={{ fontWeight: '300' }} >Enjoy reading along with a narration.</h4>
                </Box>
                <Box className='mode-select'>
                    <Button id='mode-btns' onClick={() => handleModeSelect(false)}><FcIdea style={{ marginRight: "3vh" }} />  Read and Chat</Button>
                    <h4 className='mode-text' sx={{ fontWeight: '300' }} >Enjoy interactively reading with a reading mate.</h4>
                </Box>
            </Box>
        </Box>
    );
};

export default ModeSelectPage;

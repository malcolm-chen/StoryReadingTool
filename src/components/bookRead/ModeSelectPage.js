import React, { useState, useEffect } from 'react';
import { Button, Box, Typography } from '@material-ui/core';
import { useNavigate, useLocation } from 'react-router-dom';

const ModeSelectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [modeSet, setModeSet] = useState(false);

    const handleModeSelect = (isReadMode) => {
        setModeSet(true); 
        localStorage.setItem('modeSet', 'true');  
        localStorage.setItem('isReadOnly', isReadMode.toString());  
        navigate(isReadMode ? '/read' : '/chat', { state: {
            title: title
        } }); 
    };

    return (
        <Box textAlign="center">
            <Box className='instruction'>
                <Typography variant="h3" gutterBottom>Select a mode to read the book!</Typography>
            </Box>
            <Box className="mode-btns">
                <Button variant="contained" color="primary" onClick={() => handleModeSelect(true)}>Read Only</Button>
                <Button variant="contained" color="secondary" onClick={() => handleModeSelect(false)}>Read and Chat</Button>
            </Box>
        </Box>
    );
};

export default ModeSelectPage;

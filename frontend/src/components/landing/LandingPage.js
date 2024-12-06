import React, { useState } from "react";
import { Container, Typography, Box, Button, Input } from '@mui/joy';
import { FloatingLabel, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { GiSpellBook } from "react-icons/gi";

const LandingPage = () => {
    const [username, setUsername] = useState(""); // State to store username
    const [error, setError] = useState(""); // State to store validation error
    const [responseMessage, setResponseMessage] = useState('');
    const [password, setPassword] = useState(""); // State to store password
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username) {
            setError("Username cannot be empty.");
            return;
        }
        
        const apiUrl = process.env.REACT_APP_API_URL;
        try {
            const response = await fetch(`${apiUrl}/api/users`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                username: username,
                password: password,
              }), 
            });
            if (response.ok) {
                setError("");
                navigate('/select', { state: { user: username } });
            } else {
                setError("Password is incorrect.");
                return;
            }
          } catch (error) {
            console.error('Error:', error);
            setResponseMessage('Error sending data');
        }
    };

    return (
        <Container className="login-container">
            <div className="logo-container">
                <GiSpellBook size={80} color='#229799' />
            </div>
            <Box id='login-box'>
                <h1 style={{ marginBottom: '30px', fontFamily: 'BM Jua' }}>Let's read with <span style={{ color: '#229799' }}>StoryMate</span>!</h1>
                <Form id='login-form' onSubmit={handleSubmit}>
                    <h4 style={{ textAlign: 'left', display: 'block', width: '100%' }}>What's your name?</h4>
                    <Input
                        type="text"
                        placeholder="Your Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} // Update username state
                        id='login-input'
                        style={{ borderRadius: '30px' }}
                    />
                    
                    {/* Display error message if validation fails */}
                    {<span style={{ height: '36px'}}></span>}

                    <h4 style={{ textAlign: 'left', display: 'block', width: '100%' }}>What's your password?</h4>
                    <Input
                        type="text"
                        placeholder="Your Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} // Update password state
                        id='login-input'
                        style={{ borderRadius: '30px' }}
                    />
                    {<span className="error" style={{ height: '36px'}}>{error}</span>}

                    <Button id='login-btn' className='mybtn' variant="solid" type="submit">
                        Get Started!
                    </Button>
                </Form>
            </Box>
            <div className="star">
                <img src = './files/imgs/star.svg' alt='star' />
            </div>
        </Container>
    );
};

export default LandingPage;

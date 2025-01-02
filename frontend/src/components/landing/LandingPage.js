import React, { useState, useEffect } from "react";
import { Container, Typography, Box, Button, Input } from '@mui/joy';
import { FloatingLabel, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import { GiSpellBook } from "react-icons/gi";

const LandingPage = () => {
    console.log('LandingPage rendered');
    const [username, setUsername] = useState(""); // State to store username
    const [error, setError] = useState(""); // State to store validation error
    const [responseMessage, setResponseMessage] = useState('');
    const [password, setPassword] = useState(""); // State to store password
    const navigate = useNavigate();

    useEffect(() => {
        // Check if the user is already logged in
        const token = localStorage.getItem('userToken');
        if (token) {
            navigate('/select');
        }
    }, [navigate]);

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
                localStorage.setItem('userToken', response.token);
                localStorage.setItem('username', username);
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
                <img src='./files/imgs/penguin-login.svg' alt='logo' style={{ width: '800px' }} />
            </div>
            <Box id='login-box'>
                <Form id='login-form' onSubmit={handleSubmit}>
                    <h4 style={{ textAlign: 'left', display: 'block', width: '100%' }}>What's your name?</h4>
                    <Input
                        type="text"
                        placeholder="Your Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} // Update username state
                        id='login-input'
                        style={{ borderRadius: '35px', padding: '0' }}
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
                        style={{ borderRadius: '35px', padding: '0' }}
                    />
                    {<span className="error" style={{ height: '36px'}}>{error}</span>}

                    <Button id='login-btn' className='mybtn' variant="solid" type="submit">
                        <div style={{ width: '80%', height: '15px', backgroundColor: '#FFFFFF4D', position: 'absolute', top: '10px', borderRadius: '30px' }}></div>
                        <img src='./files/imgs/ring.svg' alt='ring' style={{ width: '50px', height: '50px', position: 'absolute', top: '2px', right: '5px', borderRadius: '50%' }} />
                        Get Started!
                    </Button>
                </Form>
            </Box>
            {/* <div className="star">
                <img src = './files/imgs/star.svg' alt='star' />
            </div> */}
        </Container>
    );
};

export default LandingPage;

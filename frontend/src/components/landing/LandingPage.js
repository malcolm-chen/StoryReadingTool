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
        // if token is not undefined and not null, navigate to select page
        if (token !== 'undefined' && token !== null && token.length > 0) {
            const username = localStorage.getItem('username');
            navigate('/select', { state: { user: username } });
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
            const data = await response.json();
            if (data.success) {
                setError("");
                localStorage.setItem('userToken', data.token);
                localStorage.setItem('username', username);
                navigate('/select', { state: { user: username } });
            } else {
                setError(data.message);
                return;
            }
          } catch (error) {
            console.error('Error:', error);
            setResponseMessage('Error sending data');
        }
    };

    return (
        <div className="login-container">
            <div className="logo-container">
                <img src='./files/imgs/penguin-login.svg' alt='logo' style={{ height: '30vh' }} />
            </div>
            <Box id='login-box'>
                <Form id='login-form' onSubmit={handleSubmit}>
                    <h4 style={{ textAlign: 'center', display: 'block', width: '100%', color: '#E8EAF0' }}>What's your name?</h4>
                    {/* Dynamically adjust the font size of placeholder based on the height of the input */}
                    <Input
                        type="text"
                        placeholder="Your Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)} // Update username state
                        id='login-input'
                        style={{ borderRadius: '20px', padding: '0', width: '50vw', height: '5vh'}}
                    />
                    
                    {/* Display error message if validation fails */}
                    {<span style={{ height: '36px'}}></span>}

                    <h4 style={{ textAlign: 'center', display: 'block', width: '100%', color: '#E8EAF0' }}>What's your password?</h4>
                    <Input
                        type="text"
                        placeholder="Your Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)} // Update password state
                        id='login-input'
                        style={{ borderRadius: '20px', padding: '0', width: '50vw', height: '5vh' }}
                    />
                    {<span className="error" style={{ height: '36px'}}>{error}</span>}

                    <Button id='login-btn' className='mybtn' variant="solid" type="submit">
                        <div style={{ width: '90%', height: '25%', backgroundColor: '#FFFFFF4D', position: 'absolute', top: '7px', left: '3%', borderRadius: '20px' }}></div>
                        <img src='./files/imgs/ring.svg' alt='ring' style={{ width: '35px', height: '35px', position: 'absolute', top: '2px', right: '6px', borderRadius: '50%' }} />
                        Get Started!
                    </Button>
                </Form>
            </Box>
            <div className = "penguin-logo">
                <img src = './files/imgs/penguin-bg.svg' alt='penguin' />
            </div>
            <div className="moon">
                <img src = './files/imgs/moon.svg' alt='moon' />
            </div>
            {/* <div className="star">
                <img src = './files/imgs/star.svg' alt='star' />
            </div> */}
        </div>
    );
};

export default LandingPage;

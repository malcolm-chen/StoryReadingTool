import React, { useState } from "react";
import { Container, Typography, Box, Button } from '@mui/joy';
import { FloatingLabel, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const LandingPage = () => {
    const [username, setUsername] = useState(""); // State to store username
    const [error, setError] = useState(""); // State to store validation error
    const [responseMessage, setResponseMessage] = useState('');
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
              }), 
            });
            if (response.ok) {
                setError("");
                navigate('/select', { state: { user: username } });
            } else {
                setError("Username is already taken.");
                return;
            }
          } catch (error) {
            console.error('Error:', error);
            setResponseMessage('Error sending data');
        }
    };

    return (
        <Container className="login-container">
            <Box id='login-box'>
                <h1>Let's read!</h1>
                <h3>Enter your username.</h3>
                <Form id='login-form' onSubmit={handleSubmit}>
                    <FloatingLabel id='login-label'
                        controlId="floatingInput"
                        label="Username"
                        className="mb-3">
                        <Form.Control
                            type="text"
                            placeholder="Your Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)} // Update username state
                        />
                    </FloatingLabel>
                    
                    {/* Display error message if validation fails */}
                    {<span className="error" style={{ height: '24px'}}>{error}</span>}

                    <Button id='login-btn' className='mybtn' variant="solid" type="submit">
                        Log In
                    </Button>
                </Form>
            </Box>
        </Container>
    );
};

export default LandingPage;

import React, { useState } from "react";
import { Container, Typography, Button } from '@mui/joy';
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
            <Typography level="h1">Let's read!</Typography>
            <Typography level="h3">Create your username.</Typography>
            <Form onSubmit={handleSubmit}>
                <FloatingLabel
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
                {error && <Typography color="error">{error}</Typography>}

                <Button id='login-btn' variant="solid" type="submit">
                    Log In
                </Button>
            </Form>
        </Container>
    );
};

export default LandingPage;

import React, { useState } from "react";
import { Container, Typography } from "@material-ui/core";
import { Button, FloatingLabel, Form } from "react-bootstrap";
import { useNavigate } from "react-router-dom";

const existingUsernames = ["johnDoe", "janeDoe", "user123"]; // 假设已有的用户名列表

const LandingPage = () => {
    const [username, setUsername] = useState(""); // State to store username
    const [error, setError] = useState(""); // State to store validation error
    const navigate = useNavigate();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!username) {
            setError("Username cannot be empty.");
            return;
        }
        if (existingUsernames.includes(username)) {
            setError("Username is already taken.");
            return;
        }
        setError("");
        navigate('/select', { state: { user: username } });
    };

    return (
        <Container className="login-container">
            <Typography variant="h4">Let's read!</Typography>
            <Typography variant="h5">Create your username.</Typography>
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

                <Button variant="primary" type="submit">
                    Log In
                </Button>
            </Form>
        </Container>
    );
};

export default LandingPage;

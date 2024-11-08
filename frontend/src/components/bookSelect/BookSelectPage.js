import React, { useState, useEffect } from 'react';
import { Avatar, Button, Typography, Container, Box, Grid, Card, CardActions, CardContent, CardMedia } from '@mui/joy';
import { Image } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { GiSpellBook } from "react-icons/gi";
import { FcNext } from "react-icons/fc";
import { IoLibrary } from "react-icons/io5";

const BookSelectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(location.state?.user || 'User');
    const moveToStory = () => {
        navigate('/mode', { state: {
            title: 'Amara and the Bats',
            user: user
        } });
    }
    return (
        <Box className="background-container">
            <Box className='header' >
                <Typography level='h4' component='h1' sx={{ fontWeight: 'bold', textAlign: 'center', color: '#272343', fontStyle: 'italic' }}>
                    <GiSpellBook size={30} color='229799' style={{ marginRight: "1%" }}/>StoryMate
                </Typography>
                <Avatar className='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793'}} >{user.substring(0, 2)}</Avatar>
            </Box>
            <Box className='main-content'>
                <Box className='instruction-box'>
                    <Typography className='instruction' level='h4'><FcNext style={{ marginRight: "1%" }}/> Select a book that you want to read!</Typography>
                    <Typography id='library-page-title' level='h2'><IoLibrary size={30} color='#ffd803' style={{ marginRight: "1%" }} /> Library</Typography>
                </Box>
                <Box spacing={3} className='library'>
                    <Grid item xs={12} sm={4}>
                        <Card className="bookCardFrame" onClick={moveToStory} sx={{backgroundColor: '#fffffe', }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <Typography level='h3'>Amara and the Bats</Typography>
                            </CardContent>
                            <CardActions>
                                <Button variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions>
                        </Card>
                    </Grid>
                </Box>
            </Box>
        </Box>
    );
}

export default BookSelectPage;
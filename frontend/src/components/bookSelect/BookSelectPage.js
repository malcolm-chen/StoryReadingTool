import React, { useState, useEffect } from 'react';
import { Avatar, Button, Box, Grid, Card, CardActions, CardContent, CardMedia } from '@mui/joy';
import { Image } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { GiSpellBook } from "react-icons/gi";
import { FcNext } from "react-icons/fc";
import { IoLibrary } from "react-icons/io5";
import Header from '../header';

const BookSelectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(location.state?.user || 'User');
    console.log(user);
    // log type of user
    console.log(typeof user);
    const moveToStory = () => {
        navigate('/mode', { state: {
            title: 'Amara and the Bats',
            user: user
        } });
    }
    return (
        <Box className="background-container">
            <Header user={user} />
            <Box className='main-content'>
                <Box className='instruction-box' id='instruction-box-library'>
                    <h2 id='page-title'><IoLibrary size={30} color='#ffd803' style={{ marginRight: "1%" }} /> Library</h2>
                    <h4 className='instruction'>
                        {/* <FcNext style={{ marginRight: "1%" }}/>  */}
                        Select a book that you want to read!</h4>
                </Box>
                <Box spacing={3} className='library'>
                    <div className='book-list'>
                        <Card className="bookCardFrame" onClick={moveToStory} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <h3>Amara and the Bats</h3>
                            </CardContent>
                            <CardActions>
                                <Button className='mybtn' variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions>
                        </Card>
                    </div>
                </Box>
            </Box>
        </Box>
    );
}

export default BookSelectPage;
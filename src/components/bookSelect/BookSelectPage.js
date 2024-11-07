import React, { useState, useEffect } from 'react';
import { Typography, Container, Box, Grid, Card, CardActions, CardContent, CardMedia } from '@material-ui/core';
import { Button, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const BookSelectPage = () => {
    const navigate = useNavigate();
    const moveToStory = () => {
        navigate('/mode', { state: {
            title: 'Amara and the Bats'
        } });
    }
    return (
        <Container>
            <Box className='instruction'>
                <Typography variant='h3'>Select a book that you want to read!</Typography>
            </Box>
            <Grid container spacing={3} className='library'>
                <Grid item xs={12} sm={4}>
                    <Card className="bookCardFrame" onClick={moveToStory}>
                        <CardContent className='bookCardContent'>
                            <CardMedia>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                            </CardMedia>
                            <Typography variant='h4'>Amara and the Bats</Typography>
                        </CardContent>
                        <CardActions>
                            <Button variant='primary'>Read the book!</Button>
                        </CardActions>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}

export default BookSelectPage;
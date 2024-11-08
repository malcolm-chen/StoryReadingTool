import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, Typography, Breadcrumbs, Link, IconButton, LinearProgress } from '@mui/joy';
import { Button } from 'react-bootstrap';
import { GiSpellBook } from "react-icons/gi";
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";

const ReadOnlyPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state?.user || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    
    const [currentPage, setCurrentPage] = useState(() => {
        const savedPage = localStorage.getItem(`${title}-currentPage`);
        return savedPage ? parseInt(savedPage, 10) : 0;
    });
    const [currentSentence, setCurrentSentence] = useState(() => {
        const savedSentence = localStorage.getItem(`${title}-currentSentence`);
        return savedSentence ? parseInt(savedSentence, 10) : 0;
    });
    
    const [pages, setPages] = useState([]);
    
    let storyText = [];
    let audio = new Audio();

    useEffect(() => {
        const loadStory = async () => {
            try {
                const response = await fetch(`/files/books/${title}/${title}_sentence_split.json`);
                storyText = await response.json();
                const loadedPages = Array.from({ length: storyText.length }, (_, index) => ({
                    image: `files/books/${title}/pages/page${index + 1}.jpg`,
                    text: storyText[index]
                }));
                setPages(loadedPages);
            } catch (error) {
                console.error('Error loading story:', error);
            }
        };

        loadStory();
    }, [title]);

    const playPageSentences = () => {
        if (pages[currentPage]?.text) {
            let sentenceIndex = 0;
            const playNextSentence = () => {
                console.log(sentenceIndex, pages[currentPage].text.length);
                if (sentenceIndex < pages[currentPage].text.length) {
                    setCurrentSentence(sentenceIndex);
                    audio.src = `/files/books/${title}/audio/p${currentPage}sec${sentenceIndex}.mp3`;
                    /*audio = new Audio(`/files/books/${title}/audio/p${currentPage}sec${sentenceIndex}.mp3`);*/
                    audio.onended = () => {
                        console.log('end');
                        sentenceIndex += 1;
                        playNextSentence();
                    };
                    audio.play();
                }
            };
            playNextSentence();
        }
    };
    useEffect(() => {
        if (pages.length > 0 && currentPage === 0) {
            playPageSentences();
        }
    }, [pages.length]);
    
    useEffect(() => {
        if (pages.length > 0) {
            audio.pause();
            playPageSentences();
        }
    }, [currentPage]);

    const handleReplay = () => {
        audio.pause();
        setCurrentSentence(0);
        playPageSentences();
    };

    const handlePrevPage = () => {
        console.log(currentPage);
        if (currentPage > 0) {
            audio.pause();
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
        }
    };

    const handleNextPage = () => {
        console.log(currentPage);
        if (currentPage < pages.length - 1) {
            audio.pause();
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
        }
    };

    const handleLinkSelect = (e) => {
        e.preventDefault();
        audio.pause();
        navigate('/select', { state: { title: title, user: user } });
    };

    const handleLinkMode = (e) => {
        e.preventDefault();
        audio.pause();
        navigate('/mode', { state: { title: title, user: user } });
    };

    return (
        <Box className="background-container">
            <Box className='header' >
                <Typography level='h4' component='h1' sx={{ fontWeight: 'bold', textAlign: 'center', color: '#272343', fontStyle: 'italic' }}>
                    <GiSpellBook size={30} color='#229799' style={{ marginRight: "1%" }}/>StoryMate
                </Typography>
                <Avatar className='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793'}} >{user.substring(0, 2)}</Avatar>
            </Box>
            <Breadcrumbs id='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                <Link href='/select' onClick={handleLinkSelect} >Library</Link>
                <Link href='/mode' onClick={handleLinkMode} >Mode Select</Link>
                <Typography>{title}</Typography>
            </Breadcrumbs>
            <Box className='main-content'>
                <Typography className="title" level='h3' gutterBottom>{title}</Typography>
                <Box id="book-box" mt={4}>
                    <Box id='book-content' mt={4}>
                        <Typography id="caption" level='h4' sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                            {pages[currentPage]?.text[currentSentence]}
                            <IconButton variant='plain' onClick={handleReplay}><MdOutlineReplayCircleFilled size={30} color='#7AA2E3' /></IconButton>
                        </Typography>
                        <img src={pages[currentPage]?.image} alt={`Page ${currentPage + 1}`}/>
                    </Box>
                    <IconButton id="prev-btn" variant='plain' onClick={handlePrevPage} disabled={currentPage === 0}>
                        <MdArrowCircleLeft size={60} color='#7AA2E3'/>
                    </IconButton>
                    <IconButton id="next-btn" variant='plain' onClick={handleNextPage} disabled={currentPage === pages.length - 1}>
                        <MdArrowCircleRight size={60} color='#7AA2E3'/>
                    </IconButton>
                </Box>
                <Box display="flex" justifyContent="center" mt={2} gap="1rem">
                    <Typography level="h4">Page {currentPage + 1} of {pages.length}</Typography>
                    <LinearProgress determinate value={ (currentPage + 1) / pages.length * 100} />
                </Box>
            </Box>
        </Box>
    );
};

export default ReadOnlyPage;

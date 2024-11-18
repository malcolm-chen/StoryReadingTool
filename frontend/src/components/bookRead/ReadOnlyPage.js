import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import { Avatar, Container, Box, FormControl, FormLabel, FormHelperText, Breadcrumbs, Link, IconButton, LinearProgress, Typography, Switch } from '@mui/joy';
import { GiSpellBook } from "react-icons/gi";
import { IoLibrary } from "react-icons/io5";
import { MdChromeReaderMode } from "react-icons/md";
import { FaBook } from "react-icons/fa";
import { MdArrowCircleLeft, MdArrowCircleRight, MdOutlineReplayCircleFilled } from "react-icons/md";
import Header from '../header';
import { useSwipeable } from 'react-swipeable';

let audio = new Audio();

const ReadOnlyPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const user = location.state?.user || 'User';
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [showCaption, setShowCaption] = useState(true);
    
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
                } else {
                    console.log('this page ends');
                    handleNextPage();
                }
            };
            playNextSentence();
        }
    };

    const handleProgressBarClick = (event) => {
        const progressBar = event.currentTarget;
        const clickPosition = event.clientX - progressBar.getBoundingClientRect().left;
        const progressBarWidth = progressBar.offsetWidth;
        const clickRatio = clickPosition / progressBarWidth;
        const newPage = Math.floor(clickRatio * pages.length);
    
        if (newPage >= 0 && newPage < pages.length) {
            audio.pause();
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage);
            localStorage.setItem(`${title}-currentSentence`, 0);
        }
    };
    
    useEffect(() => {
        if (pages.length > 0) {
            audio.pause();
            playPageSentences();
        }
    }, [pages,currentPage]);

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

    const swipeHandlers = useSwipeable({
        onSwipedLeft: () => {
            if (currentPage < pages.length - 1) {
                handleNextPage();
            }
        },
        onSwipedRight: () => {
            if (currentPage > 0) {
                handlePrevPage();
            }
        },
        preventDefaultTouchmoveEvent: true,
        trackMouse: true
    });

    const handleCaptionToggle = () => {
        setShowCaption(!showCaption);
    };

    return (
        <Box className="background-container">
            <Header user={user} title={title} hasTitle={true} />
            <div className='breadcrumbs-container'>
                <Breadcrumbs className='breadcrumbs' separator="›" aria-label="breadcrumbs" size='lg'>
                    <Link href='/select' onClick={handleLinkSelect} ><IoLibrary /> Library</Link>
                    <Typography><FaBook /> {title}</Typography>
                </Breadcrumbs>
                <div className='space' />
                <FormControl
                    orientation="horizontal"
                    sx={{ width: 260, justifyContent: 'space-between' }}>
                    <div>
                        <FormLabel>Show captions</FormLabel>
                        <FormHelperText sx={{ mt: 0 }}>Turn on to see the story text.</FormHelperText>
                    </div>
                
                    <Switch className='caption-switch'
                        label="Caption"
                        checked={showCaption}
                        endDecorator={showCaption ? 'On' : 'Off'}
                        onChange={handleCaptionToggle}
                    />
                </FormControl>
            </div>

            <Box className='main-content'>
                <Box id="book-box" mt={4}>
                    <Box id='book-content' mt={4}>
                        <IconButton
                        id="prev-btn"
                        variant='plain'
                        onClick={handlePrevPage}
                        disabled={currentPage === 0}
                        sx={{ opacity: 0.1, '&:hover': { opacity: 0.5 } }}
                        >
                            <MdArrowCircleLeft size={60} color='#7AA2E3'/>
                        </IconButton>

                        <Box id='book-img' {...swipeHandlers}>
                            <img src={pages[currentPage]?.image} alt={`Page ${currentPage + 1}`}/>
                            {showCaption && <h4 id="caption" sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                {pages[currentPage]?.text[currentSentence]}
                                <IconButton variant='plain' onClick={handleReplay} sx={{ opacity: 0.2, '&:hover': { opacity: 0.5 } }}>
                                    <MdOutlineReplayCircleFilled size={30} color='#7AA2E3' />
                                </IconButton>
                            </h4>}
                        </Box>

                        <IconButton
                            id="next-btn"
                            variant='plain'
                            onClick={handleNextPage}
                            disabled={currentPage === pages.length - 1}
                            sx={{ opacity: 0.2, '&:hover': { opacity: 0.5 } }}
                            >
                            <MdArrowCircleRight size={60} color='#7AA2E3'/>
                        </IconButton>
                    </Box>
                </Box>
                <Box id='page-progress' display="flex" justifyContent="center" mt={2} gap="1rem">
                    <h4>Page {currentPage + 1} of {pages.length}</h4>
                    <Box onClick={handleProgressBarClick} sx={{ cursor: 'pointer', width: '100%' }}>
                        <LinearProgress determinate value={(currentPage + 1) / pages.length * 100} />
                    </Box>
                </Box>
            </Box>
        </Box>
    );
};

export default ReadOnlyPage;

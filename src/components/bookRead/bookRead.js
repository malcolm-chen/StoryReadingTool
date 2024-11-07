import React, { useState, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import { Container, Box, Typography } from '@material-ui/core';
import { Button } from 'react-bootstrap';

const BookReadPage = () => {
    const location = useLocation();
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    
    // Retrieve and initialize currentPage and currentSentence from localStorage
    const [currentPage, setCurrentPage] = useState(() => {
        const savedPage = localStorage.getItem(`${title}-currentPage`);
        return savedPage ? parseInt(savedPage, 10) : 0;
    });
    const [currentSentence, setCurrentSentence] = useState(() => {
        const savedSentence = localStorage.getItem(`${title}-currentSentence`);
        return savedSentence ? parseInt(savedSentence, 10) : 0;
    });
    
    // Retrieve modeSet from localStorage or default to false
    const [modeSet, setModeSet] = useState(() => {
        const savedMode = localStorage.getItem(`${title}-modeSet`);
        return savedMode === 'true'; // 'true' is saved as a string
    });
    
    const [isReadOnly, setIsReadOnly] = useState(true);
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

        if (modeSet) {
            loadStory();
        }
    }, [title, modeSet]);

    const playAudio = (text) => {
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'en-US';
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(speech);
        return speech;
    };

    const playPageSentences = () => {
        if (pages[currentPage]?.text) {
            let sentenceIndex = 0;

            const playNextSentence = () => {
                if (sentenceIndex < pages[currentPage].text.length) {
                    setCurrentSentence(sentenceIndex);

                    const speech = playAudio(pages[currentPage].text[sentenceIndex]);
                    speech.addEventListener('end', () => {
                        sentenceIndex += 1;
                        playNextSentence();
                    });
                }
            };

            playNextSentence();
        }
    };

    useEffect(() => {
        if (modeSet && pages.length > 0) {
            window.speechSynthesis.cancel();
            playPageSentences();
        }
    }, [currentPage, modeSet, pages]);

    const handleReplay = () => {
        window.speechSynthesis.cancel();
        setCurrentSentence(0);
        playPageSentences();
    };

    const handleNextPage = () => {
        if (currentPage < pages.length - 1) {
            window.speechSynthesis.cancel();
            const newPage = currentPage + 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 0) {
            window.speechSynthesis.cancel();
            const newPage = currentPage - 1;
            setCurrentPage(newPage);
            setCurrentSentence(0);
            localStorage.setItem(`${title}-currentPage`, newPage); // Save currentPage
            localStorage.setItem(`${title}-currentSentence`, 0);    // Reset currentSentence to 0
        }
    };

    const handleModeSelect = (isReadMode) => {
        setModeSet(true);
        setIsReadOnly(isReadMode);
        localStorage.setItem(`${title}-modeSet`, 'true'); // Save modeSet
        localStorage.setItem(`${title}-isReadOnly`, isReadMode.toString()); // Save isReadOnly state
    };

    return (
        <Container>
            {!modeSet ? (
                <Box className='instruction' textAlign="center">
                    <Typography variant='h3' gutterBottom>Select a mode to read the book!</Typography>
                    <Box display="flex" justifyContent="center" gap="1rem">
                        <Button variant='contained' color='primary' onClick={() => handleModeSelect(true)}>Read</Button>
                        <Button variant='contained' color='secondary' onClick={() => handleModeSelect(false)}>Read and Chat</Button>
                    </Box>
                </Box>
            ) : isReadOnly ? (
                <Box textAlign="center">
                    <Typography variant='h3' className='title' gutterBottom>{title}</Typography>
                    <Box mt={4}>
                        <Box mt={4}>
                            <Typography variant='h5' gutterBottom>{pages[currentPage]?.text[currentSentence]}</Typography>
                        </Box>
                        <img src={pages[currentPage]?.image} alt={`Page ${currentPage + 1}`} style={{ maxHeight: '70%', maxWidth: '70%' }} />
                    </Box>
                    <Box display="flex" justifyContent="center" mt={2} gap="1rem">
                        <Button variant='contained' onClick={handlePrevPage} disabled={currentPage === 0}>Previous</Button>
                        <Typography variant="subtitle1">Page {currentPage + 1} of {pages.length}</Typography>
                        <Button variant='contained' onClick={handleNextPage} disabled={currentPage === pages.length - 1}>Next</Button>
                    </Box>
                    <Box display="flex" justifyContent="center" mt={2}>
                        <Button variant='contained' onClick={handleReplay}>Replay Audio</Button>
                    </Box>
                </Box>
            ) : (
                <Box className='instruction' textAlign="center">
                    <Typography variant='h3'>You are in the edit mode!</Typography>
                </Box>
            )}
        </Container>
    );
};

export default BookReadPage;

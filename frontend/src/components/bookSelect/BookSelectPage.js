import React, { useState, useEffect } from 'react';
import { Avatar, Button, Box, Modal, Card, CardContent, ModalDialog, ModalClose } from '@mui/joy';
import { Image } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { GiSpellBook } from "react-icons/gi";
import { FcNext } from "react-icons/fc";
import { FcReading, FcIdea } from "react-icons/fc";
import { IoLibrary } from "react-icons/io5";
import Header from '../header';

const BookSelectPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(location.state?.user || 'User');
    const [modeSet, setModeSet] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState(location.state?.title || 'Untitled');

    const handleOpenModal = (title) => {
        setTitle(title);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setTitle('');
        setIsModalOpen(false);
    };
    
    const handleModeSelect = (isReadMode) => {
        setModeSet(true); 
        localStorage.setItem('modeSet', 'true');  
        localStorage.setItem('isReadOnly', isReadMode.toString());  
        navigate(isReadMode ? '/read' : '/greet', { state: {
            title: title,
            user: user
        } }); 
    };

    return (
        <Box className="background-container">
            <Header user={user} title={''} hasTitle={false} />
            <Box className='main-content'>
                <Box className='instruction-box' id='instruction-box-library'>
                    <h2 id='page-title'><IoLibrary size={30} color='#ffd803' style={{ marginRight: "1%" }} /> Library</h2>
                    <h4 className='instruction'>
                        {/* <FcNext style={{ marginRight: "1%" }}/>  */}
                        Select a book that you want to read!</h4>
                </Box>
                <Box spacing={3} className='library'>
                    <div className='book-list'>
                        <Card className="bookCardFrame" onClick={() =>handleOpenModal('Amara and the Bats')} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <h3 className='book-card-title'>Amara and the Bats</h3>
                            </CardContent>
                            {/* <CardActions>
                                <Button className='mybtn' variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions> */}
                        </Card>
                        <Card className="bookCardFrame" onClick={() =>handleOpenModal('Amara and the Bats')} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <h3 className='book-card-title'>Amara and the Bats</h3>
                            </CardContent>
                            {/* <CardActions>
                                <Button className='mybtn' variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions> */}
                        </Card>
                        <Card className="bookCardFrame" onClick={() =>handleOpenModal('Amara and the Bats')} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <h3 className='book-card-title'>Amara and the Bats</h3>
                            </CardContent>
                            {/* <CardActions>
                                <Button className='mybtn' variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions> */}
                        </Card>
                        <Card className="bookCardFrame" onClick={() =>handleOpenModal('Amara and the Bats')} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <h3 className='book-card-title'>Amara and the Bats</h3>
                            </CardContent>
                            {/* <CardActions>
                                <Button className='mybtn' variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions> */}
                        </Card>
                        <Card className="bookCardFrame" onClick={() =>handleOpenModal('Amara and the Bats')} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                            <CardContent className='bookCardContent'>
                                <Image className='bookCover' src='./files/covers/AmaraAndTheBats.jpg' alt='AmaraAndTheBats' />
                                <h3 className='book-card-title'>Amara and the Bats</h3>
                            </CardContent>
                            {/* <CardActions>
                                <Button className='mybtn' variant='solid' size='md' sx={{backgroundColor: '#bae8e8', color: '#272343'}}>Read the book!</Button>
                            </CardActions> */}
                        </Card>
                    </div>
                </Box>
            </Box>
            <Modal open={isModalOpen} onClose={handleCloseModal}>
                <ModalDialog sx={{ padding: '36px' }}>
                    <ModalClose onClick={handleCloseModal} />
                    <h3>How do you want to read <i>{title}</i>?</h3>
                    <Box className='mode-select'>
                    <Button id='mode-btns' onClick={() => handleModeSelect(true)}><FcReading style={{ marginRight: "3vh" }} />  Read Only</Button>
                        <h4 className='mode-text' sx={{ fontWeight: '300' }} >Enjoy reading along with a narration.</h4>
                    </Box>
                    <Box className='mode-select'>
                        <Button id='mode-btns' onClick={() => handleModeSelect(false)}><FcIdea style={{ marginRight: "3vh" }} />  Read and Chat</Button>
                        <h4 className='mode-text' sx={{ fontWeight: '300' }} >Enjoy interactively reading with a reading mate.</h4>
                    </Box>
                </ModalDialog>
            </Modal>
        </Box>
    );
}

export default BookSelectPage;
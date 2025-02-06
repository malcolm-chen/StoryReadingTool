import React, { useState, useEffect } from 'react';
import { Avatar, Button, Box, Card, CardContent, ModalDialog, ModalClose, CardCover, CardOverflow, IconButton } from '@mui/joy';
import { Image } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import { IoTimeOutline } from "react-icons/io5";
import { MdTimelapse } from "react-icons/md";
import { MdFavoriteBorder } from "react-icons/md";
import { MdOutlineFavorite } from "react-icons/md";
import Footer from '../footer';

const BookSelectPage = () => {
    console.log('BookSelectPage rendered');
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(location.state?.user || 'User');
    const [modeSet, setModeSet] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [title, setTitle] = useState(location.state?.title || 'Untitled');
    const [curSelected, setCurSelected] = useState(0);
    const [favorites, setFavorites] = useState([]);
    const [bookList, setBookList] = useState([]);
    const [finishedBooks, setFinishedBooks] = useState([]);

    useEffect(() => {
        setBookList(
            [
                // {'title': 'Amara and the Bats', 'time': '15min', 'progress': '0%'},
                {'title': 'Why Frogs are Wet', 'time': '15min', 'progress': '0%'},
            ]
        );
    }, []);

    useEffect(() => {
        if (user === null) {
            navigate('/');
        }
    }, [user]);

    const isFavorite = (bookTitle) => favorites.includes(bookTitle);

    const handleOpenBook = (bookTitle) => {
        navigate('/read', { state: {
            title: bookTitle,
            user: user
        } });
    };

    console.log(favorites);

    return (
        <Box className="background-container background-container-library">
            <Box className='main-content'>
                <Box className='instruction-box' id='instruction-box-library'>
                    <h2 id='page-title'><img src='./files/imgs/penguin.svg' alt='logo' style={{ width: '90px', marginRight: '10px' }} /> My Library</h2>
                    <div className='library-star'>
                        <img src='./files/imgs/star.svg' alt='star' style={{ position: 'absolute', top: '0', right: '0', width: '30px', marginRight: '10px' }} />
                    </div>
                    <h4 className='instruction'>
                        Reading Now
                    </h4>
                </Box>
                <Box spacing={3} className='library'>
                    {curSelected === 0 &&
                        <div className='book-list'>
                            {bookList.map((book, index) => (
                                <Card className="bookCardFrame" onClick={() =>handleOpenBook(book.title)} sx={{backgroundColor: '#fffffe', cursor: 'pointer', "--Card-radius": "30px" }}>
                                    <CardCover>
                                        <img className='bookCover' src={`./files/covers/${book.title}.jpg`} alt='book cover image' />
                                    </CardCover>
                                    <IconButton variant="soft" sx={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                                        {isFavorite(book.title) &&
                                            <MdOutlineFavorite
                                                style={{ color: '#E75C4F', fontSize: '25px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card click event
                                                    setFavorites(favorites.filter(title => title !== book.title));
                                                }}
                                            />
                                        }
                                        {!isFavorite(book.title) &&
                                            <MdFavoriteBorder
                                                style={{ color: '#272343', fontSize: '25px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card click event
                                                    setFavorites([...favorites, book.title]);
                                                }}
                                            />
                                        }
                                    </IconButton>
                                    <CardOverflow className='bookCardContent'>
                                        <h3 className='book-card-title' style={{
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>{book.title}</h3>
                                        <div className='book-card-info' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                            <p><IoTimeOutline /> <span className='book-card-info-value'>{book.time}</span></p>
                                            <p><MdTimelapse/><span className='book-card-info-value'>{book.progress}</span></p>
                                        </div>
                                    </CardOverflow>
                                </Card>
                            ))}
                        </div>
                    }
                    {curSelected === 1 &&
                        <div className='book-list'>
                            {/* If favorites is empty, show "No favorites yet" */}
                            {favorites.length === 0 &&
                                <h4>No favorites yet</h4>
                            }
                            {favorites.map((book, index) => (
                                <Card className="bookCardFrame" onClick={() =>handleOpenBook(book)} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                                    <CardCover sx={{ borderRadius: '20px !important' }}>
                                        <img className='bookCover' src={`./files/covers/${book}.jpg`} alt='Book Cover' />
                                    </CardCover>
                                    <IconButton variant="soft" sx={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                                        {isFavorite(book) &&
                                            <MdOutlineFavorite
                                                style={{ color: '#E75C4F', fontSize: '25px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card click event
                                                    setFavorites(favorites.filter(title => title !== book));
                                                }}
                                            />
                                        }
                                        {!isFavorite(book) &&
                                            <MdFavoriteBorder
                                                style={{ color: '#272343', fontSize: '25px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card click event
                                                    setFavorites([...favorites, book]);
                                                }}
                                            />
                                        }
                                    </IconButton>
                                    <CardOverflow className='bookCardContent'>
                                        <h3 className='book-card-title' style={{
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>{book}</h3>
                                        <div className='book-card-info' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                            <p><IoTimeOutline /> <span className='book-card-info-value'>15min</span></p>
                                            <p><MdTimelapse/><span className='book-card-info-value'>{}</span></p>
                                        </div>
                                    </CardOverflow>
                                </Card>
                            ))}
                        </div>
                    }
                    {curSelected === 2 &&
                        <div className='book-list'>
                            {finishedBooks.length === 0 &&
                                <h4>No finished books yet</h4>
                            }
                            {finishedBooks.map((book, index) => (
                                <Card className="bookCardFrame"  onClick={() =>handleOpenBook(book.title)} sx={{backgroundColor: '#fffffe', cursor: 'pointer' }}>
                                    <CardCover sx={{ borderRadius: '20px !important' }}>
                                        <img className='bookCover' src={`./files/covers/${book.title}.jpg`} alt='AmaraAndTheBats' />
                                    </CardCover>
                                    <IconButton variant="soft" sx={{ position: 'absolute', top: '10px', right: '10px', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
                                        {isFavorite(book.title) &&
                                            <MdOutlineFavorite
                                                style={{ color: '#E75C4F', fontSize: '25px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card click event
                                                    setFavorites(favorites.filter(title => title !== book.title));
                                                }}
                                            />
                                        }
                                        {!isFavorite(book.title) &&
                                            <MdFavoriteBorder
                                                style={{ color: '#272343', fontSize: '25px' }}
                                                onClick={(e) => {
                                                    e.stopPropagation(); // Prevent card click event
                                                    setFavorites([...favorites, book.title]);
                                                }}
                                            />
                                        }
                                    </IconButton>
                                    <CardOverflow className='bookCardContent'>
                                        <h3 className='book-card-title' style={{
                                            whiteSpace: 'nowrap', 
                                            overflow: 'hidden', 
                                            textOverflow: 'ellipsis' 
                                        }}>{book.title}</h3>
                                        <div className='book-card-info' style={{ display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
                                            <p><IoTimeOutline /> <span className='book-card-info-value'>{book.time}</span></p>
                                            <p><MdTimelapse/><span className='book-card-info-value'>{book.progress}</span></p>
                                        </div>
                                    </CardOverflow>
                                </Card>
                            ))}
                        </div>
                    }
                </Box>
            </Box>
            {/* <Modal open={isModalOpen} onClose={handleCloseModal}>
                <ModalDialog sx={{ padding: '36px' }}>
                    <ModalClose onClick={handleCloseModal} />
                    <h3>How do you want to read <i>{title}</i>?</h3>
                    <Box className='mode-select'>
                    <Button id='mode-btns' onClick={() => handleModeSelect(true)}><FcReading style={{ marginRight: "3vh" }} />  Read Only</Button>
                        
                    </Box>
                    <Box className='mode-select'>
                        <Button id='mode-btns' onClick={() => handleModeSelect(false)}><FcIdea style={{ marginRight: "3vh" }} />  Read and Chat</Button>
                    </Box>
                </ModalDialog>
            </Modal> */}
            {/* <div className='sun'>
                <img src = './files/imgs/sun.svg' alt='sun' />
            </div> */}
            <div className='moon-library'>
                <img src = './files/imgs/moon-library.svg' alt='moon' />
            </div>
            <Footer user={user} curSelected={curSelected} setCurSelected={setCurSelected}/>
        </Box>
    );
}

export default BookSelectPage;
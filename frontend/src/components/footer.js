import { useState } from "react";
import { FaBook } from "react-icons/fa";
import { FaRegHeart } from "react-icons/fa";
import { IoMdCheckmarkCircleOutline } from "react-icons/io";

export default function Footer({user, curSelected, setCurSelected}) {
    return (
        <div className='footer'>
            <div 
                className='footer-buttons' 
                style={{ 
                    position: 'relative', 
                    color: curSelected == 0 ? '#F4A011' : 'rgba(0, 0, 0, 0.6)',
                    fontFamily: 'Cherry Bomb',
                    flexDirection: 'column'
                }}
                onClick={() => setCurSelected(0)}
            >
                <img src='./files/imgs/bookIcon.svg' alt='book' style={{ color: curSelected == 0 ? '#F4A011' : 'inherit' }}/> Books
                {/* <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', height: '30%', borderRight: '3px solid rgba(30, 30, 30, 0.3)' }}></span> */}
            </div>
            <div 
                className='footer-buttons' 
                style={{ 
                    position: 'relative', 
                    color: curSelected == 1 ? '#F4A011' : 'rgba(0, 0, 0, 0.6)',
                    fontFamily: 'Cherry Bomb',
                    flexDirection: 'column'
                }}
                onClick={() => setCurSelected(1)}
            >
                <img src='./files/imgs/loveIcon.svg' alt='heart' style={{ color: curSelected == 1 ? '#F4A011' : 'inherit' }}/> My Collections
                {/* <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', height: '30%', borderRight: '3px solid rgba(30, 30, 30, 0.3)' }}></span> */}
            </div>
            <div 
                className='footer-buttons' 
                style={{ 
                    color: curSelected == 2 ? '#F4A011' : 'rgba(0, 0, 0, 0.6)',
                    fontFamily: 'Cherry Bomb',
                    flexDirection: 'column'
                }}
                onClick={() => setCurSelected(2)}
            >
                <img src='./files/imgs/finishIcon.svg' alt='check' style={{ color: curSelected == 2 ? '#F4A011' : 'inherit' }}/> Finished
            </div>
        </div>
    );
}
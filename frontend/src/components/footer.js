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
                    color: curSelected == 0 ? '#01A2A5' : 'inherit'
                }}
                onClick={() => setCurSelected(0)}
            >
                <FaBook style={{ marginRight: '12px', color: curSelected == 0 ? '#01A2A5' : 'inherit' }}/> Books
                <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', height: '30%', borderRight: '3px solid rgba(30, 30, 30, 0.3)' }}></span>
            </div>
            <div 
                className='footer-buttons' 
                style={{ 
                    position: 'relative', 
                    color: curSelected == 1 ? '#01A2A5' : 'inherit'
                }}
                onClick={() => setCurSelected(1)}
            >
                <FaRegHeart style={{ marginRight: '12px', color: curSelected == 1 ? '#01A2A5' : 'inherit' }}/> My Collections
                <span style={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', height: '30%', borderRight: '3px solid rgba(30, 30, 30, 0.3)' }}></span>
            </div>
            <div 
                className='footer-buttons' 
                style={{ 
                    color: curSelected == 2 ? '#01A2A5' : 'inherit'
                }}
                onClick={() => setCurSelected(2)}
            >
                <IoMdCheckmarkCircleOutline style={{ marginRight: '12px', color: curSelected == 2 ? '#01A2A5' : 'inherit' }}/> Finished
            </div>
        </div>
    );
}
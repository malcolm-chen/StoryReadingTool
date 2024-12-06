import { MdArrowBackIosNew } from "react-icons/md";
import { Link } from 'react-router-dom';
export default function Header(args) {
    const { user, title, hasTitle } = args;

    return (
        <div className='header' >
            <div className='back-button'>
                <Link to='/select'><MdArrowBackIosNew /></Link>
            </div>
            {hasTitle && <h3 className="header-title">{title}</h3>}
            {!hasTitle && <div className='space' />}
        </div>
    );
};
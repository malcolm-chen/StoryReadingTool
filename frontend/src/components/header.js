import { Avatar } from '@mui/joy';
import { GiSpellBook } from "react-icons/gi";

export default function Header(args) {
    const { user } = args;
    return (
        <div className='header' >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
            <GiSpellBook size={30} color='229799' />
            <h4 style={{ fontWeight: 'bold', textAlign: 'center', color: '#272343', fontStyle: 'italic', fontSize: '16px' }}>
            StoryMate
        </h4>
        </div>
        <div className='space' />
        <Avatar className='user-avatar' size='lg' sx={{ backgroundColor: '#ACD793'}}>{user.substring(0, 2)}</Avatar>
    </div>
    );
};
import './App.scss';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import LandingPage from './components/landing/LandingPage';
import BookSelectPage from './components/bookSelect/BookSelectPage';
import ModeSelectPage from './components/bookRead/ModeSelectPage';
import ReadOnlyPage from './components/bookRead/ReadOnlyPage';
import ReadChatPage from './components/bookRead/ReadChatPage';
import GreetPage from './components/greet/GreetPage';
import VoiceAgent from './components/voiceAgent';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/select" element={<BookSelectPage />} />
          <Route path="/mode" element={<ModeSelectPage />} />x
          <Route path="/read" element={<ReadOnlyPage />} />
          <Route path="/chat" element={<ReadChatPage />} />
          <Route path="/greet" element={<GreetPage />} />
          <Route path="/voice" element={<VoiceAgent />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

import './App.scss';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import LandingPage from './components/landing/LandingPage';
import BookSelectPage from './components/bookSelect/BookSelectPage';
import ReadPage from './components/bookRead/ReadPage';
import GreetPage from './components/greet/GreetPage';
import VoiceAgent from './components/voiceAgent';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/select" element={<BookSelectPage />} />
          <Route path="/read" element={<ReadPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

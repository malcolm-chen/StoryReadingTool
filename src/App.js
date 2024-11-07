import './App.css';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import LandingPage from './components/landing/LandingPage';
import BookSelectPage from './components/bookSelect/BookSelectPage';
import ModeSelectPage from './components/bookRead/ModeSelectPage';
import ReadOnlyPage from './components/bookRead/ReadOnlyPage';
import ReadChatPage from './components/bookRead/ReadChatPage';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/select" element={<BookSelectPage />} />
          <Route path="/mode" element={<ModeSelectPage />} />
          <Route path="/read" element={<ReadOnlyPage />} />
          <Route path="/chat" element={<ReadChatPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;

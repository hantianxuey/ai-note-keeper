import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/useAuthStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import NoteEditor from './pages/NoteEditor';
import Chat from './pages/Chat';
import Settings from './pages/Settings';
import './index.css';

function App() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  return (
    <Router>
      <div className="min-h-screen">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          {isAuthenticated && (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/notes/:id" element={<NoteEditor />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/chat/:id" element={<Chat />} />
              <Route path="/settings" element={<Settings />} />
            </>
          )}
        </Routes>
      </div>
    </Router>
  );
}

export default App;

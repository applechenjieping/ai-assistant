import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import AdminApp from './pages/AdminApp';
import UnifiedChatNew from './pages/UnifiedChatNew';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<UnifiedChatNew />} />
        <Route path="/chat" element={<UnifiedChatNew />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/login" element={<Login />} />
      </Routes>
    </BrowserRouter>
  );
}

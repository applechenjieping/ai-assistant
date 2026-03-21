import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminApp from './pages/AdminApp'
import ChatApp from './pages/ChatApp'
import UnifiedChat from './pages/UnifiedChat'
import Login from './pages/Login'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 管理后台 */}
        <Route path="/admin/*" element={<AdminRouter />} />
        
        {/* 旧的活动对话页（保留兼容） */}
        <Route path="/chat/:activityId" element={<ChatApp />} />
        
        {/* 新的统一AI助手入口 */}
        <Route path="/chat" element={<UnifiedChat />} />
        <Route path="/" element={<UnifiedChat />} />
        
        {/* 默认跳转 */}
        <Route path="/home" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

// 管理后台路由保护
function AdminRouter() {
  const token = localStorage.getItem('admin_token')
  
  if (!token) {
    return <Login />
  }
  
  return <AdminApp />
}

export default App

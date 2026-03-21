import { useState, useEffect } from 'react'
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom'
import { 
  LayoutDashboard, 
  FolderKanban, 
  BarChart3, 
  Settings, 
  LogOut,
  Menu,
  X
} from 'lucide-react'
import Dashboard from './Dashboard'
import ActivityList from './ActivityList'
import ActivityForm from './ActivityForm'
import Stats from './Stats'

function AdminApp() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const username = localStorage.getItem('admin_username')

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_username')
    navigate('/admin')
  }

  const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: '仪表盘' },
    { path: '/admin/activities', icon: FolderKanban, label: '活动管理' },
    { path: '/admin/stats', icon: BarChart3, label: '数据统计' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside className={`fixed top-0 left-0 z-30 h-full w-64 bg-white shadow-lg transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🤖</span>
            <span className="font-bold text-lg">AI 运营助手</span>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-500 hover:text-gray-700"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map(item => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                location.pathname === item.path
                  ? 'bg-indigo-50 text-indigo-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <item.icon size={20} />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <div className="text-gray-500">当前账户</div>
              <div className="font-medium">{username}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-gray-500 hover:text-red-500 transition-colors"
              title="退出登录"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区 */}
      <div className="lg:ml-64">
        {/* 顶栏 */}
        <header className="bg-white shadow-sm sticky top-0 z-10">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Menu size={24} />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">
              {navItems.find(item => item.path === location.pathname)?.label || '仪表盘'}
            </h1>
            <div className="w-8" />
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 lg:p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/activities" element={<ActivityList />} />
            <Route path="/activities/new" element={<ActivityForm />} />
            <Route path="/activities/edit/:id" element={<ActivityForm />} />
            <Route path="/stats" element={<Stats />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default AdminApp

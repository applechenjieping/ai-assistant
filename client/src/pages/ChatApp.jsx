import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { 
  MessageSquare, 
  Send, 
  Trash2,
  Clock,
  MapPin,
  Phone,
  Calendar,
  Sparkles
} from 'lucide-react'
import { chatApi } from '../api'

function ChatApp() {
  const { activityId } = useParams()
  const [activity, setActivity] = useState(null)
  const [session, setSession] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [visitorId, setVisitorId] = useState(null)

  // 初始化会话
  useEffect(() => {
    initSession()
  }, [activityId])

  // 加载历史消息
  useEffect(() => {
    if (session?.session_id) {
      loadHistory()
    }
  }, [session])

  const initSession = async () => {
    try {
      // 获取访客 ID（从 localStorage）
      let vid = localStorage.getItem(`visitor_${activityId}`)
      if (!vid) {
        vid = 'visitor_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem(`visitor_${activityId}`, vid)
      }
      setVisitorId(vid)

      // 创建或获取会话
      const sessionRes = await chatApi.createSession(activityId, vid)
      setSession(sessionRes)
      setActivity(sessionRes.activity)

      // 设置欢迎消息
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `您好！我是 ${sessionRes.activity.name} 的活动助手 🤖\n\n有什么关于活动的问题，都可以问我哦！`,
        created_at: new Date().toISOString()
      }])

    } catch (error) {
      console.error('初始化会话失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const history = await chatApi.getHistory(session.session_id)
      if (history.length > 0) {
        // 保留欢迎消息，添加历史记录
        setMessages(prev => [
          prev[0],
          ...history.filter(h => h.role !== 'system')
        ])
      }
    } catch (error) {
      console.error('加载历史消息失败:', error)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending) return

    const userMessage = input.trim()
    setInput('')
    setSending(true)

    // 添加用户消息
    const userMsg = {
      id: 'temp_' + Date.now(),
      role: 'user',
      content: userMessage,
      created_at: new Date().toISOString()
    }
    setMessages(prev => [...prev, userMsg])

    // 添加打字指示器
    setMessages(prev => [...prev, {
      id: 'typing',
      role: 'assistant',
      content: '...',
      isTyping: true
    }])

    try {
      const res = await chatApi.sendMessage(session.session_id, userMessage)
      
      // 移除打字指示器，添加回复
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: res.reply,
          created_at: new Date().toISOString()
        }]
      })
    } catch (error) {
      // 移除打字指示器，显示错误和重试按钮
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, {
          id: 'error_' + Date.now(),
          role: 'assistant',
          content: '抱歉，AI 服务响应较慢，请稍后再试或换个问题。',
          created_at: new Date().toISOString(),
          hasError: true,
          retryMessage: userMessage
        }]
      })
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleClearHistory = async () => {
    if (!confirm('确定要清空当前对话吗？')) return

    try {
      await chatApi.clearHistory(session.session_id)
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: `您好！我是 ${activity?.name || '活动'} 的智能助手 🤖\n\n有什么关于活动的问题，都可以问我哦！`,
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('清空历史失败:', error)
    }
  }

  const handleQuickQuestion = (question) => {
    setInput(question)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-5xl mb-4">🤖</div>
          <div className="text-gray-600">加载中...</div>
        </div>
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 shadow-xl">
          <div className="text-5xl mb-4">😢</div>
          <h2 className="text-xl font-semibold mb-2">活动不存在或已结束</h2>
          <p className="text-gray-500 mb-4">请联系活动主办方获取最新活动信息</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex flex-col">
      {/* 顶部区域 */}
      <header className="bg-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg">{activity.name}</h1>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> 24小时在线
                  </span>
                </div>
              </div>
            </div>
            {activity.hotline && (
              <a href={`tel:${activity.hotline}`} className="flex items-center gap-2 text-indigo-600">
                <Phone size={18} />
                <span className="hidden sm:inline">{activity.hotline}</span>
              </a>
            )}
          </div>

          {/* 活动信息 */}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-gray-600">
            {activity.start_time && activity.end_time && (
              <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                <Calendar size={14} />
                {activity.start_time} ~ {activity.end_time}
              </span>
            )}
            {activity.location && (
              <span className="flex items-center gap-1 bg-gray-100 px-3 py-1 rounded-full">
                <MapPin size={14} />
                {activity.location}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* 热门问题快捷入口 */}
      {activity.hot_questions?.length > 0 && messages.length === 1 && (
        <div className="max-w-3xl mx-auto px-4 py-4 w-full">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
              <Sparkles size={16} className="text-yellow-500" />
              热门问题
            </div>
            <div className="flex flex-wrap gap-2">
              {activity.hot_questions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleQuickQuestion(q)}
                  className="text-sm bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg hover:bg-indigo-100 transition-colors"
                >
                  {q.length > 20 ? q.substring(0, 20) + '...' : q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 聊天区域 */}
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-4 flex flex-col">
        <div className="flex-1 overflow-y-auto space-y-4 mb-4">
          {messages.map((msg) => (
            <div 
              key={msg.id} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center mr-2 flex-shrink-0">
                  <Sparkles className="text-white" size={16} />
                </div>
              )}
              
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}`}>
                {msg.isTyping ? (
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                ) : (
                  <div>
                    <div className="whitespace-pre-wrap">{msg.content}</div>
                    {msg.hasError && (
                      <button
                        onClick={() => {
                          setMessages(prev => prev.filter(m => m.id !== msg.id))
                          setInput(msg.retryMessage)
                          handleSend()
                        }}
                        className="mt-2 text-sm text-indigo-600 hover:text-indigo-800 underline"
                      >
                        重试
                      </button>
                    )}
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center ml-2 flex-shrink-0">
                  <span className="text-sm">👤</span>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 输入区域 */}
        <div className="bg-white rounded-2xl shadow-lg p-4">
          <div className="flex items-center gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="请输入您的问题..."
              className="flex-1 resize-none outline-none max-h-32 bg-gray-50 rounded-xl px-4 py-3"
              rows={1}
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="w-12 h-12 rounded-xl gradient-bg text-white flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
            >
              {sending ? (
                <div className="animate-spin">
                  <Clock size={20} />
                </div>
              ) : (
                <Send size={20} />
              )}
            </button>
            <button
              onClick={handleClearHistory}
              className="w-12 h-12 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
              title="清空对话"
            >
              <Trash2 size={20} />
            </button>
          </div>
          <div className="text-xs text-gray-400 mt-2 text-center">
            AI 助手基于活动 FAQ 内容回答，如有疑问请联系活动主办方
          </div>
        </div>
      </main>

      {/* 底部 */}
      <footer className="text-center text-xs text-gray-400 py-2">
        Powered by AI Assistant
      </footer>
    </div>
  )
}

export default ChatApp

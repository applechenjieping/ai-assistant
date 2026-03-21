import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Sparkles, 
  Send, 
  Trash2,
  Clock,
  MessageSquare,
  ArrowRight
} from 'lucide-react'
import { chatApi } from '../api'

function UnifiedChat() {
  const [activities, setActivities] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [session, setSession] = useState(null)
  const [visitorId, setVisitorId] = useState(null)

  // 初始化
  useEffect(() => {
    initChat()
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      const res = await fetch('/api/activities').then(r => r.json())
      setActivities(res.filter(a => a.status === 'active'))
    } catch (error) {
      console.error('加载活动失败:', error)
    }
  }

  const initChat = async () => {
    try {
      // 获取或创建访客ID
      let vid = localStorage.getItem('unified_visitor_id')
      if (!vid) {
        vid = 'v_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
        localStorage.setItem('unified_visitor_id', vid)
      }
      setVisitorId(vid)

      // 创建统一会话（不指定活动）
      const res = await fetch('/api/chat/unified-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: vid })
      }).then(r => r.json())

      if (res.session_id) {
        setSession(res)
        
        // 设置欢迎消息
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: `您好！我是 AI 活动助手 🤖\n\n我可以帮您解答所有活动的问题。\n\n目前有以下活动可以咨询：\n${res.activities?.map((a, i) => `${i+1}. ${a.name}`).join('\n') || '暂无活动'}\n\n请直接告诉我您想了解哪个活动的信息，或者选择一个活动进行咨询！`,
          created_at: new Date().toISOString()
        }])
      }
    } catch (error) {
      console.error('初始化失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!input.trim() || sending || !session) return

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
      const res = await fetch('/api/chat/unified-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          session_id: session.session_id, 
          message: userMessage 
        })
      }).then(r => r.json())
      
      // 移除打字指示器，添加回复
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, {
          id: 'ai_' + Date.now(),
          role: 'assistant',
          content: res.reply,
          detected_activity: res.detected_activity,
          created_at: new Date().toISOString()
        }]
      })
    } catch (error) {
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== 'typing')
        return [...filtered, {
          id: 'error_' + Date.now(),
          role: 'assistant',
          content: '抱歉，服务暂时不可用，请稍后再试。',
          created_at: new Date().toISOString()
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
      await fetch(`/api/chat/history/${session.session_id}`, { method: 'DELETE' })
      setMessages([{
        id: 'welcome',
        role: 'assistant',
        content: '对话已清空，让我们重新开始！请问有什么可以帮您？',
        created_at: new Date().toISOString()
      }])
    } catch (error) {
      console.error('清空失败:', error)
    }
  }

  const handleSelectActivity = (activityName) => {
    setInput(`我想了解 ${activityName} 活动的详细信息`)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 to-purple-100 flex flex-col">
      {/* 顶部 */}
      <header className="bg-white shadow-md">
        <div className="max-w-3xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full gradient-bg flex items-center justify-center">
                <Sparkles className="text-white" size={24} />
              </div>
              <div>
                <h1 className="font-bold text-lg">AI 活动助手</h1>
                <div className="text-sm text-gray-500 flex items-center gap-2">
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> 24小时在线
                  </span>
                  <span>•</span>
                  <span>{activities.length} 个活动</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 活动快捷入口 */}
      {activities.length > 0 && messages.length <= 1 && (
        <div className="max-w-3xl mx-auto px-4 py-4 w-full">
          <div className="bg-white rounded-xl p-4 shadow-md">
            <div className="text-sm text-gray-500 mb-3 flex items-center gap-2">
              <MessageSquare size={16} className="text-indigo-500" />
              选择活动直接提问
            </div>
            <div className="flex flex-wrap gap-2">
              {activities.map(activity => (
                <button
                  key={activity.id}
                  onClick={() => handleSelectActivity(activity.name)}
                  className="text-sm bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2"
                >
                  {activity.name}
                  <ArrowRight size={14} />
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
                    {msg.detected_activity && (
                      <div className="mt-2 pt-2 border-t text-xs text-gray-500">
                        📍 已识别活动: {msg.detected_activity}
                      </div>
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
              placeholder="请输入您的问题，如：歌王大赛怎么报名？"
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
            AI 助手会自动识别您想了解的活动，无需手动选择
          </div>
        </div>
      </main>

      <footer className="text-center text-xs text-gray-400 py-2">
        Powered by AI Assistant
      </footer>
    </div>
  )
}

export default UnifiedChat

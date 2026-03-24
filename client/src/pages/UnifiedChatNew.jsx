import { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';

const VERCEL_AI_URL = 'https://ai-assistant-one-gamma.vercel.app/api/chat';
const API_URL = 'https://ai-assistant-wz69.onrender.com/api';

export default function UnifiedChat() {
  const [sessionId, setSessionId] = useState(null);
  const [activities, setActivities] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [faqs, setFaqs] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    initSession();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initSession = async () => {
    try {
      const res = await fetch(`${API_URL}/chat/unified-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitor_id: 'user-' + Date.now() })
      });
      const data = await res.json();
      setSessionId(data.session_id);
      setActivities(data.activities || []);
      
      // 加载所有FAQ
      if (data.activities?.length > 0) {
        const allFaqs = [];
        for (const act of data.activities) {
          const faqRes = await fetch(`${API_URL}/activities/${act.id}/faqs`);
          const faqData = await faqRes.json();
          faqData.forEach(f => allFaqs.push({ ...f, activity_name: act.name }));
        }
        setFaqs(allFaqs);
      }
    } catch (e) {
      console.error('初始化失败:', e);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      // 构建系统提示词
      const faqContext = faqs.map(f => `【${f.activity_name}】\nQ: ${f.question}\nA: ${f.answer}`).join('\n\n');
      const activityNames = activities.map(a => a.name).join('、');
      
      const systemPrompt = `你是美林湖社区的AI活动助手，负责解答关于以下活动的问题：${activityNames}。

以下是活动的FAQ知识库：
${faqContext}

请根据FAQ知识库回答用户问题。如果问题不在知识库中，请礼貌地说明并建议拨打热线020-36728888咨询。
回答要简洁、友好、专业。`;

      // 直接调用Vercel AI
      const res = await fetch(VERCEL_AI_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          history: messages.slice(-10),
          systemPrompt
        })
      });
      
      const data = await res.json();
      const aiReply = data.reply || data.error || '抱歉，我暂时无法回答这个问题。';
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiReply }]);
    } catch (e) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: '抱歉，AI服务暂时不可用，请稍后再试或拨打热线020-36728888咨询。' 
      }]);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="max-w-4xl mx-auto p-4 h-screen flex flex-col">
        {/* 头部 */}
        <div className="bg-white rounded-t-2xl shadow-lg p-4">
          <h1 className="text-xl font-bold text-gray-800">🤖 AI活动助手</h1>
          <p className="text-sm text-gray-500 mt-1">
            {activities.length > 0 
              ? `当前活动：${activities.map(a => a.name).join('、')}`
              : '暂无活动'}
          </p>
        </div>
        
        {/* 消息区域 */}
        <div className="flex-1 overflow-y-auto bg-white p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 py-10">
              <Bot className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>你好！我是AI活动助手，有什么可以帮你的吗？</p>
            </div>
          )}
          
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div className={`max-w-[70%] p-3 rounded-2xl ${
                msg.role === 'user' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {msg.content}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-5 h-5 text-gray-600" />
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 p-3 rounded-2xl">
                <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* 输入区域 */}
        <div className="bg-white rounded-b-2xl shadow-lg p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="输入你的问题..."
              className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="px-6 py-3 bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

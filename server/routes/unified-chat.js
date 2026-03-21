const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { chatWithUnifiedAI } = require('../services/ai-service');

// 创建统一会话（不指定活动，获取所有活动）
router.post('/unified-session', (req, res) => {
  const { visitor_id } = req.body;
  
  // 获取所有进行中的活动
  const activities = db.all('SELECT id, name, description FROM activities WHERE status = ?', ['active']);
  
  if (activities.length === 0) {
    return res.status(404).json({ error: '暂无可用活动' });
  }
  
  // 如果有现有会话，更新活跃时间
  let session = null;
  if (visitor_id) {
    session = db.get(`
      SELECT * FROM chat_sessions 
      WHERE visitor_id = ? AND activity_id = 'unified'
      ORDER BY last_active_at DESC 
      LIMIT 1
    `, [visitor_id]);
  }
  
  if (session) {
    db.run('UPDATE chat_sessions SET last_active_at = ? WHERE id = ?', 
      [new Date().toISOString(), session.id]);
  } else {
    // 创建新会话
    const sessionId = uuidv4();
    const now = new Date().toISOString();
    db.run(`
      INSERT INTO chat_sessions (id, activity_id, visitor_id, ip, user_agent, last_active_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [sessionId, 'unified', visitor_id, req.ip, req.headers['user-agent'], now, now]);
    session = { id: sessionId, visitor_id };
  }
  
  // 记录访问
  recordVisit(req.ip);
  
  res.json({ 
    session_id: session.id,
    visitor_id: session.visitor_id,
    activities: activities
  });
});

// 统一消息处理（所有活动的 FAQ 都发送给 AI）
router.post('/unified-message', async (req, res) => {
  const { session_id, message } = req.body;
  
  if (!session_id || !message) {
    return res.status(400).json({ error: '会话 ID 和消息内容不能为空' });
  }
  
  // 获取会话信息
  const session = db.get('SELECT * FROM chat_sessions WHERE id = ?', [session_id]);
  
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  // 保存用户消息
  const userMsgId = uuidv4();
  db.run(`
    INSERT INTO chat_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [userMsgId, session_id, 'user', message, new Date().toISOString()]);
  
  // 更新活跃时间
  db.run('UPDATE chat_sessions SET last_active_at = ? WHERE id = ?', 
    [new Date().toISOString(), session_id]);
  
  // 更新对话统计
  const today = new Date().toISOString().split('T')[0];
  const existingStat = db.get('SELECT * FROM statistics WHERE activity_id = ? AND date = ?', 
    ['unified', today]);
  
  if (existingStat) {
    db.run('UPDATE statistics SET chat_count = chat_count + 1 WHERE activity_id = ? AND date = ?', 
      ['unified', today]);
  } else {
    db.run('INSERT INTO statistics (id, activity_id, date, chat_count, pv, uv) VALUES (?, ?, ?, 1, 0, 0)', 
      [uuidv4(), 'unified', today]);
  }
  
  // 获取所有活动的 FAQ
  const allFaqs = db.all(`
    SELECT a.name as activity_name, f.question, f.answer 
    FROM faqs f
    JOIN activities a ON f.activity_id = a.id
    WHERE a.status = 'active'
  `);
  
  // 获取历史消息（上下文）
  const history = db.all(`
    SELECT role, content FROM chat_messages 
    WHERE session_id = ? 
    ORDER BY created_at DESC 
    LIMIT 20
  `, [session_id]).reverse();
  
  // 获取活动列表
  const activities = db.all('SELECT name FROM activities WHERE status = ?', ['active']);
  const activityNames = activities.map(a => a.name).join('、');
  
  try {
    // 调用统一 AI 服务
    const aiReply = await chatWithUnifiedAI(message, history, allFaqs, activityNames);
    
    // 保存 AI 回复
    const aiMsgId = uuidv4();
    db.run(`
      INSERT INTO chat_messages (id, session_id, role, content, is_unanswered, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [aiMsgId, session_id, 'assistant', aiReply.content, aiReply.isUnanswered ? 1 : 0, new Date().toISOString()]);
    
    // 如果是未解答问题，记录下来
    if (aiReply.isUnanswered) {
      // 尝试识别用户可能想了解的活动
      const possibleActivity = detectActivityFromQuestion(message, activities);
      db.run(`
        INSERT INTO unanswered_questions (id, activity_id, session_id, question, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), possibleActivity || 'unified', session_id, message, new Date().toISOString()]);
    }
    
    res.json({ 
      success: true,
      reply: aiReply.content,
      detected_activity: aiReply.detectedActivity,
      is_unanswered: aiReply.isUnanswered
    });
  } catch (error) {
    console.error('AI 服务错误:', error);
    res.status(500).json({ error: 'AI 服务暂时不可用，请稍后再试' });
  }
});

// 从问题中识别可能想了解的活动
function detectActivityFromQuestion(question, activities) {
  const lowerQuestion = question.toLowerCase();
  
  for (const activity of activities) {
    if (lowerQuestion.includes(activity.name.toLowerCase())) {
      return activity.id;
    }
  }
  
  return null;
}

// 记录访问统计
function recordVisit(ip) {
  const today = new Date().toISOString().split('T')[0];
  
  const existingStat = db.get('SELECT * FROM statistics WHERE activity_id = ? AND date = ?', ['unified', today]);
  
  if (existingStat) {
    db.run('UPDATE statistics SET pv = pv + 1 WHERE activity_id = ? AND date = ?', ['unified', today]);
  } else {
    db.run('INSERT INTO statistics (id, activity_id, date, pv, uv, chat_count) VALUES (?, ?, ?, 1, 1, 0)', 
      [uuidv4(), 'unified', today]);
  }
}

module.exports = router;

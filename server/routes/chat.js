const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { chatWithAI } = require('../services/ai-service');

// 创建或获取会话
router.post('/session', (req, res) => {
  const { activity_id, visitor_id } = req.body;
  
  if (!activity_id) {
    return res.status(400).json({ error: '活动 ID 不能为空' });
  }
  
  // 检查活动是否存在
  const activity = db.get('SELECT * FROM activities WHERE id = ? AND status = ?', [activity_id, 'active']);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在或已结束' });
  }
  
  // 如果有 visitor_id，检查是否有现有会话
  if (visitor_id) {
    const existingSession = db.get(`
      SELECT * FROM chat_sessions 
      WHERE activity_id = ? AND visitor_id = ? 
      ORDER BY last_active_at DESC 
      LIMIT 1
    `, [activity_id, visitor_id]);
    
    if (existingSession) {
      // 更新活跃时间
      db.run('UPDATE chat_sessions SET last_active_at = ? WHERE id = ?', 
        [new Date().toISOString(), existingSession.id]);
      
      // 记录访问统计
      recordVisit(activity_id, req.ip);
      
      return res.json({ 
        session_id: existingSession.id,
        visitor_id: existingSession.visitor_id,
        activity
      });
    }
  }
  
  // 创建新会话
  const sessionId = uuidv4();
  const newVisitorId = visitor_id || 'v_' + uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO chat_sessions (id, activity_id, visitor_id, ip, user_agent, last_active_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [sessionId, activity_id, newVisitorId, req.ip, req.headers['user-agent'], now, now]);
  
  // 记录访问统计
  recordVisit(activity_id, req.ip, newVisitorId);
  
  res.json({ 
    session_id: sessionId,
    visitor_id: newVisitorId,
    activity
  });
});

// 发送消息并获取 AI 回复
router.post('/message', async (req, res) => {
  const { session_id, message } = req.body;
  
  if (!session_id || !message) {
    return res.status(400).json({ error: '会话 ID 和消息内容不能为空' });
  }
  
  // 获取会话信息
  const session = db.get(`
    SELECT cs.*, a.name as activity_name, a.id as activity_id
    FROM chat_sessions cs
    JOIN activities a ON cs.activity_id = a.id
    WHERE cs.id = ?
  `, [session_id]);
  
  if (!session) {
    return res.status(404).json({ error: '会话不存在' });
  }
  
  // 保存用户消息
  const userMsgId = uuidv4();
  db.run(`
    INSERT INTO chat_messages (id, session_id, role, content, created_at)
    VALUES (?, ?, ?, ?, ?)
  `, [userMsgId, session_id, 'user', message, new Date().toISOString()]);
  
  // 更新会话活跃时间
  db.run('UPDATE chat_sessions SET last_active_at = ? WHERE id = ?', 
    [new Date().toISOString(), session_id]);
  
  // 更新对话次数统计
  const today = new Date().toISOString().split('T')[0];
  const existingStat = db.get('SELECT * FROM statistics WHERE activity_id = ? AND date = ?', 
    [session.activity_id, today]);
  
  if (existingStat) {
    db.run('UPDATE statistics SET chat_count = chat_count + 1 WHERE activity_id = ? AND date = ?', 
      [session.activity_id, today]);
  } else {
    db.run('INSERT INTO statistics (id, activity_id, date, chat_count, pv, uv) VALUES (?, ?, ?, 1, 0, 0)', 
      [uuidv4(), session.activity_id, today]);
  }
  
  // 记录热门问题
  recordHotQuestion(session.activity_id, message);
  
  // 获取历史消息（上下文）
  const history = db.all(`
    SELECT role, content FROM chat_messages 
    WHERE session_id = ? 
    ORDER BY created_at DESC 
    LIMIT 20
  `, [session_id]).reverse();
  
  // 获取活动的 FAQ
  const faqs = db.all('SELECT question, answer FROM faqs WHERE activity_id = ?', [session.activity_id]);
  
  try {
    // 调用 AI 服务
    const aiReply = await chatWithAI(message, history, faqs, session.activity_name);
    
    // 保存 AI 回复
    const aiMsgId = uuidv4();
    db.run(`
      INSERT INTO chat_messages (id, session_id, role, content, is_unanswered, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [aiMsgId, session_id, 'assistant', aiReply.content, aiReply.isUnanswered ? 1 : 0, new Date().toISOString()]);
    
    // 如果是未解答问题，记录下来
    if (aiReply.isUnanswered) {
      db.run(`
        INSERT INTO unanswered_questions (id, activity_id, session_id, question, created_at)
        VALUES (?, ?, ?, ?, ?)
      `, [uuidv4(), session.activity_id, session_id, message, new Date().toISOString()]);
    }
    
    res.json({ 
      success: true,
      reply: aiReply.content,
      is_unanswered: aiReply.isUnanswered
    });
  } catch (error) {
    console.error('AI 服务错误:', error);
    res.status(500).json({ error: 'AI 服务暂时不可用，请稍后再试' });
  }
});

// 获取历史消息
router.get('/history/:session_id', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const messages = db.all(`
    SELECT id, role, content, created_at
    FROM chat_messages 
    WHERE session_id = ? 
    ORDER BY created_at DESC 
    LIMIT ? OFFSET ?
  `, [req.params.session_id, parseInt(limit), parseInt(offset)]);
  
  res.json(messages.reverse());
});

// 清空历史对话
router.delete('/history/:session_id', (req, res) => {
  db.run('DELETE FROM chat_messages WHERE session_id = ?', [req.params.session_id]);
  res.json({ success: true, message: '历史对话已清空' });
});

// 获取活动信息（公开）
router.get('/activity/:activity_id', (req, res) => {
  const activity = db.get(
    'SELECT id, name, description, start_time, end_time, location, hotline FROM activities WHERE id = ? AND status = ?', 
    [req.params.activity_id, 'active']
  );
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在或已结束' });
  }
  
  // 获取热门问题
  const hotQuestions = db.all(`
    SELECT question FROM faqs 
    WHERE activity_id = ? 
    ORDER BY sort_order 
    LIMIT 5
  `, [req.params.activity_id]);
  
  res.json({
    activity,
    hot_questions: hotQuestions.map(q => q.question)
  });
});

// 辅助函数：记录访问
function recordVisit(activityId, ip, visitorId = null) {
  const today = new Date().toISOString().split('T')[0];
  
  // 更新 PV
  const existingStat = db.get('SELECT * FROM statistics WHERE activity_id = ? AND date = ?', [activityId, today]);
  
  if (existingStat) {
    db.run('UPDATE statistics SET pv = pv + 1 WHERE activity_id = ? AND date = ?', [activityId, today]);
  } else {
    db.run('INSERT INTO statistics (id, activity_id, date, pv, uv, chat_count) VALUES (?, ?, ?, 1, 0, 0)', 
      [uuidv4(), activityId, today]);
  }
  
  // 更新 UV（如果有 visitor_id）
  if (visitorId) {
    db.run('UPDATE statistics SET uv = uv + 1 WHERE activity_id = ? AND date = ?', [activityId, today]);
  }
}

// 辅助函数：记录热门问题
function recordHotQuestion(activityId, question) {
  const today = new Date().toISOString().split('T')[0];
  
  // 简化问题
  const simplifiedQuestion = question.replace(/[？?！!。，,.]/g, '').trim().substring(0, 100);
  
  const existing = db.get('SELECT * FROM hot_questions WHERE activity_id = ? AND question = ? AND date = ?', 
    [activityId, simplifiedQuestion, today]);
  
  if (existing) {
    db.run('UPDATE hot_questions SET count = count + 1 WHERE id = ?', [existing.id]);
  } else {
    db.run('INSERT INTO hot_questions (id, activity_id, question, date, count) VALUES (?, ?, ?, ?, 1)', 
      [uuidv4(), activityId, simplifiedQuestion, today]);
  }
}

module.exports = router;

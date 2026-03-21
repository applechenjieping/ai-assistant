const express = require('express');
const router = express.Router();
const { db } = require('../database');

// 获取活动统计数据
router.get('/activity/:activity_id', (req, res) => {
  const { start_date, end_date } = req.query;
  
  // 基础统计
  const totalStats = db.get(`
    SELECT 
      COALESCE(SUM(pv), 0) as total_pv,
      COALESCE(SUM(uv), 0) as total_uv,
      COALESCE(SUM(chat_count), 0) as total_chats
    FROM statistics 
    WHERE activity_id = ?
  `, [req.params.activity_id]);
  
  // 今日统计
  const today = new Date().toISOString().split('T')[0];
  const todayStats = db.get(`
    SELECT * FROM statistics WHERE activity_id = ? AND date = ?
  `, [req.params.activity_id, today]);
  
  // 热门问题 Top 10
  const hotQuestions = db.all(`
    SELECT question, SUM(count) as total_count
    FROM hot_questions
    WHERE activity_id = ?
    GROUP BY question
    ORDER BY total_count DESC
    LIMIT 10
  `, [req.params.activity_id]);
  
  // 未解答问题数量
  const unansweredCount = db.get(`
    SELECT COUNT(*) as count FROM unanswered_questions 
    WHERE activity_id = ? AND resolved = 0
  `, [req.params.activity_id]);
  
  // 访问趋势（最近7天）
  const trend = db.all(`
    SELECT date, pv, uv, chat_count
    FROM statistics
    WHERE activity_id = ?
    ORDER BY date DESC
    LIMIT 7
  `, [req.params.activity_id]);
  
  res.json({
    total: totalStats || { total_pv: 0, total_uv: 0, total_chats: 0 },
    today: todayStats || { pv: 0, uv: 0, chat_count: 0 },
    hot_questions: hotQuestions,
    unanswered_count: unansweredCount?.count || 0,
    trend
  });
});

// 获取未解答问题列表
router.get('/unanswered/:activity_id', (req, res) => {
  const { limit = 50, offset = 0 } = req.query;
  
  const questions = db.all(`
    SELECT uq.*, cs.ip
    FROM unanswered_questions uq
    LEFT JOIN chat_sessions cs ON uq.session_id = cs.id
    WHERE uq.activity_id = ?
    ORDER BY uq.created_at DESC
    LIMIT ? OFFSET ?
  `, [req.params.activity_id, parseInt(limit), parseInt(offset)]);
  
  res.json(questions);
});

// 标记未解答问题为已解决
router.put('/unanswered/:id/resolve', (req, res) => {
  db.run('UPDATE unanswered_questions SET resolved = 1 WHERE id = ?', [req.params.id]);
  res.json({ success: true, message: '已标记为已解决' });
});

// 获取所有活动汇总统计
router.get('/overview', (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  
  const overview = db.all(`
    SELECT 
      a.id, a.name, a.status,
      COALESCE(SUM(s.pv), 0) as total_pv,
      COALESCE(SUM(s.uv), 0) as total_uv,
      COALESCE(SUM(s.chat_count), 0) as total_chats,
      (SELECT COUNT(*) FROM unanswered_questions WHERE activity_id = a.id AND resolved = 0) as unanswered_count
    FROM activities a
    LEFT JOIN statistics s ON a.id = s.activity_id
    GROUP BY a.id
    ORDER BY a.created_at DESC
  `);
  
  const todayOverview = db.get(`
    SELECT 
      COALESCE(SUM(pv), 0) as pv,
      COALESCE(SUM(uv), 0) as uv,
      COALESCE(SUM(chat_count), 0) as chat_count
    FROM statistics
    WHERE date = ?
  `, [today]);
  
  res.json({
    activities: overview,
    today: todayOverview || { pv: 0, uv: 0, chat_count: 0 }
  });
});

// 获取每日汇总报告数据
router.get('/daily-report', (req, res) => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  
  // 所有活动汇总
  const dailyStats = db.all(`
    SELECT 
      a.id, a.name,
      COALESCE(s.pv, 0) as pv,
      COALESCE(s.uv, 0) as uv,
      COALESCE(s.chat_count, 0) as chat_count
    FROM activities a
    LEFT JOIN statistics s ON a.id = s.activity_id AND s.date = ?
    WHERE a.status = 'active'
  `, [dateStr]);
  
  // 热门问题
  const hotQuestions = db.all(`
    SELECT a.name as activity_name, hq.question, hq.count
    FROM hot_questions hq
    JOIN activities a ON hq.activity_id = a.id
    WHERE hq.date = ? AND a.status = 'active'
    ORDER BY hq.count DESC
    LIMIT 10
  `, [dateStr]);
  
  // 未解答问题
  const unansweredQuestions = db.all(`
    SELECT a.name as activity_name, uq.question, uq.created_at
    FROM unanswered_questions uq
    JOIN activities a ON uq.activity_id = a.id
    WHERE DATE(uq.created_at) = ? AND a.status = 'active' AND uq.resolved = 0
    ORDER BY uq.created_at DESC
  `, [dateStr]);
  
  res.json({
    date: dateStr,
    stats: dailyStats,
    hot_questions: hotQuestions,
    unanswered_questions: unansweredQuestions
  });
});

module.exports = router;

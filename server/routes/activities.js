const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { v4: uuidv4 } = require('uuid');
const { parseFAQ } = require('../utils/faq-parser');

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (['.docx', '.doc', '.pdf', '.txt'].includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 .docx, .doc, .pdf, .txt 格式'));
    }
  }
});

// 获取所有活动
router.get('/', (req, res) => {
  const activities = db.all(`
    SELECT a.*, 
      (SELECT COUNT(*) FROM faqs WHERE activity_id = a.id) as faq_count,
      (SELECT COUNT(*) FROM chat_sessions WHERE activity_id = a.id) as session_count,
      (SELECT COUNT(*) FROM unanswered_questions WHERE activity_id = a.id AND resolved = 0) as unanswered_count
    FROM activities a
    ORDER BY a.created_at DESC
  `);
  
  res.json(activities);
});

// 获取单个活动
router.get('/:id', (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }
  
  res.json(activity);
});

// 创建活动
router.post('/', upload.single('faq_file'), async (req, res) => {
  const { name, description, start_time, end_time, location, hotline } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '活动名称不能为空' });
  }
  
  const id = uuidv4();
  const now = new Date().toISOString();
  
  db.run(`
    INSERT INTO activities (id, name, description, start_time, end_time, location, hotline, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, name, description, start_time, end_time, location, hotline, now, now]);
  
  // 如果上传了 FAQ 文件，解析并导入
  if (req.file) {
    try {
      const faqs = await parseFAQ(req.file.path);
      faqs.forEach((faq, index) => {
        db.run(`
          INSERT INTO faqs (id, activity_id, question, answer, category, keywords, sort_order, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [uuidv4(), id, faq.question, faq.answer, faq.category, JSON.stringify(faq.keywords || []), index, now]);
      });
      
      fs.unlinkSync(req.file.path);
    } catch (error) {
      console.error('FAQ 解析失败:', error);
    }
  }
  
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [id]);
  res.status(201).json(activity);
});

// 更新活动
router.put('/:id', (req, res) => {
  const { name, description, start_time, end_time, location, hotline, status } = req.body;
  
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }
  
  const now = new Date().toISOString();
  
  db.run(`
    UPDATE activities 
    SET name = ?, description = ?, start_time = ?, end_time = ?, location = ?, hotline = ?, status = ?, updated_at = ?
    WHERE id = ?
  `, [
    name || activity.name,
    description !== undefined ? description : activity.description,
    start_time || activity.start_time,
    end_time || activity.end_time,
    location || activity.location,
    hotline || activity.hotline,
    status || activity.status,
    now,
    req.params.id
  ]);
  
  const updated = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  res.json(updated);
});

// 删除活动
router.delete('/:id', (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }
  
  // 删除关联数据
  db.run('DELETE FROM faqs WHERE activity_id = ?', [req.params.id]);
  db.run('DELETE FROM chat_messages WHERE session_id IN (SELECT id FROM chat_sessions WHERE activity_id = ?)', [req.params.id]);
  db.run('DELETE FROM chat_sessions WHERE activity_id = ?', [req.params.id]);
  db.run('DELETE FROM statistics WHERE activity_id = ?', [req.params.id]);
  db.run('DELETE FROM hot_questions WHERE activity_id = ?', [req.params.id]);
  db.run('DELETE FROM unanswered_questions WHERE activity_id = ?', [req.params.id]);
  db.run('DELETE FROM activities WHERE id = ?', [req.params.id]);
  
  res.json({ success: true, message: '活动已删除' });
});

// 上传 FAQ 文件
router.post('/:id/faq/upload', upload.single('faq_file'), async (req, res) => {
  const activity = db.get('SELECT * FROM activities WHERE id = ?', [req.params.id]);
  
  if (!activity) {
    return res.status(404).json({ error: '活动不存在' });
  }
  
  if (!req.file) {
    return res.status(400).json({ error: '请上传 FAQ 文件' });
  }
  
  try {
    const faqs = await parseFAQ(req.file.path);
    const now = new Date().toISOString();
    
    faqs.forEach((faq, index) => {
      db.run(`
        INSERT INTO faqs (id, activity_id, question, answer, category, keywords, sort_order, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [uuidv4(), req.params.id, faq.question, faq.answer, faq.category, JSON.stringify(faq.keywords || []), index, now]);
    });
    
    fs.unlinkSync(req.file.path);
    
    res.json({ 
      success: true, 
      message: `成功导入 ${faqs.length} 条问答`,
      count: faqs.length
    });
  } catch (error) {
    console.error('FAQ 解析失败:', error);
    res.status(500).json({ error: 'FAQ 文件解析失败', message: error.message });
  }
});

// 获取活动的 FAQ 列表
router.get('/:id/faqs', (req, res) => {
  const faqs = db.all('SELECT * FROM faqs WHERE activity_id = ? ORDER BY sort_order', [req.params.id]);
  res.json(faqs);
});

// 添加单条 FAQ
router.post('/:id/faqs', (req, res) => {
  const { question, answer, category, keywords } = req.body;
  
  if (!question || !answer) {
    return res.status(400).json({ error: '问题和答案不能为空' });
  }
  
  const id = uuidv4();
  const now = new Date().toISOString();
  const maxOrder = db.get('SELECT MAX(sort_order) as max FROM faqs WHERE activity_id = ?', [req.params.id]);
  
  db.run(`
    INSERT INTO faqs (id, activity_id, question, answer, category, keywords, sort_order, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, req.params.id, question, answer, category, JSON.stringify(keywords || []), (maxOrder?.max || 0) + 1, now]);
  
  const faq = db.get('SELECT * FROM faqs WHERE id = ?', [id]);
  res.status(201).json(faq);
});

// 更新 FAQ
router.put('/faqs/:faqId', (req, res) => {
  const { question, answer, category, keywords, sort_order } = req.body;
  
  const faq = db.get('SELECT * FROM faqs WHERE id = ?', [req.params.faqId]);
  
  if (!faq) {
    return res.status(404).json({ error: 'FAQ 不存在' });
  }
  
  db.run(`
    UPDATE faqs 
    SET question = ?, answer = ?, category = ?, keywords = ?, sort_order = ?
    WHERE id = ?
  `, [
    question || faq.question,
    answer || faq.answer,
    category !== undefined ? category : faq.category,
    keywords ? JSON.stringify(keywords) : faq.keywords,
    sort_order !== undefined ? sort_order : faq.sort_order,
    req.params.faqId
  ]);
  
  const updated = db.get('SELECT * FROM faqs WHERE id = ?', [req.params.faqId]);
  res.json(updated);
});

// 删除 FAQ
router.delete('/faqs/:faqId', (req, res) => {
  db.run('DELETE FROM faqs WHERE id = ?', [req.params.faqId]);
  res.json({ success: true, message: 'FAQ 已删除' });
});

// 删除活动所有 FAQ
router.delete('/:id/faqs', (req, res) => {
  db.run('DELETE FROM faqs WHERE activity_id = ?', [req.params.id]);
  res.json({ success: true, message: '所有 FAQ 已删除' });
});

module.exports = router;

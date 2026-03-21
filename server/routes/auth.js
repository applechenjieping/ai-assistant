const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-assistant-jwt-secret';

// 登录
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: '用户名和密码不能为空' });
  }

  const admin = db.get('SELECT * FROM admins WHERE username = ?', [username]);

  if (!admin) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const isValid = bcrypt.compareSync(password, admin.password);

  if (!isValid) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  const token = jwt.sign(
    { id: admin.id, username: admin.username },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    token,
    admin: {
      id: admin.id,
      username: admin.username
    }
  });
});

// 修改密码
router.post('/change-password', (req, res) => {
  const { username, oldPassword, newPassword } = req.body;

  if (!username || !oldPassword || !newPassword) {
    return res.status(400).json({ error: '参数不完整' });
  }

  const admin = db.get('SELECT * FROM admins WHERE username = ?', [username]);

  if (!admin) {
    return res.status(404).json({ error: '用户不存在' });
  }

  const isValid = bcrypt.compareSync(oldPassword, admin.password);

  if (!isValid) {
    return res.status(401).json({ error: '原密码错误' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);
  db.run('UPDATE admins SET password = ? WHERE username = ?', [hashedPassword, username]);

  res.json({ success: true, message: '密码修改成功' });
});

// 验证 token
router.get('/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, admin: decoded });
  } catch (error) {
    res.status(401).json({ error: '令牌无效或已过期' });
  }
});

module.exports = router;

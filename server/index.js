require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { initDatabase } = require('./database');

// 路由
const authRoutes = require('./routes/auth');
const activityRoutes = require('./routes/activities');
const chatRoutes = require('./routes/chat');
const statsRoutes = require('./routes/stats');
const unifiedChatRoutes = require('./routes/unified-chat');

const app = express();
const PORT = process.env.PORT || 3001;

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use(express.static(path.join(__dirname, 'public')));

// API 限流
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: '请求过于频繁，请稍后再试' }
});

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/activities', activityRoutes);
app.use('/api/chat', apiLimiter, chatRoutes);
app.use('/api/chat', apiLimiter, unifiedChatRoutes);
app.use('/api/stats', statsRoutes);

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 生产环境静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
// SPA 路由支持
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: '服务器内部错误', message: err.message });
});

// 启动服务器
async function startServer() {
  try {
    // 初始化数据库
    await initDatabase();
    
    // 启动服务器
    app.listen(PORT, () => {
      console.log(`\n🚀 AI运营助手服务已启动`);
      console.log(`📡 API 地址: http://localhost:${PORT}`);
      console.log(`🔧 管理后台: http://localhost:${PORT}/admin`);
      console.log(`💬 对话页面: http://localhost:${PORT}/chat/:activityId\n`);
    });
    
    // 启动定时任务（延迟加载，避免数据库未就绪）
    setTimeout(() => {
      try {
        require('./services/scheduler');
      } catch (err) {
        console.log('⚠️ 定时任务启动失败:', err.message);
      }
    }, 2000);
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

startServer();

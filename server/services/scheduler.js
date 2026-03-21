require('dotenv').config();
const cron = require('node-cron');
const { Resend } = require('resend');
const { db, initDatabase } = require('../database');
const { generateDailySummary } = require('./ai-service');
const { v4: uuidv4 } = require('uuid');

// Resend 配置
const resend = new Resend(process.env.RESEND_API_KEY);

const REPORT_EMAIL = process.env.DAILY_REPORT_EMAIL || 'apple.chenjieping@gmail.com';
const FROM_EMAIL = 'AI运营助手 <onboarding@resend.dev>';

// 初始化数据库
let dbInitialized = false;
async function ensureDB() {
  if (!dbInitialized) {
    await initDatabase();
    dbInitialized = true;
  }
}

/**
 * 获取昨日数据
 */
async function getYesterdayData() {
  await ensureDB();
  
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];

  const stats = db.all(`
    SELECT 
      a.id, a.name,
      COALESCE(s.pv, 0) as pv,
      COALESCE(s.uv, 0) as uv,
      COALESCE(s.chat_count, 0) as chat_count
    FROM activities a
    LEFT JOIN statistics s ON a.id = s.activity_id AND s.date = ?
    WHERE a.status = 'active'
  `, [dateStr]);

  const hotQuestions = db.all(`
    SELECT a.name as activity_name, hq.question, hq.count
    FROM hot_questions hq
    JOIN activities a ON hq.activity_id = a.id
    WHERE hq.date = ? AND a.status = 'active'
    ORDER BY hq.count DESC
    LIMIT 10
  `, [dateStr]);

  const unansweredQuestions = db.all(`
    SELECT a.name as activity_name, uq.question, uq.created_at
    FROM unanswered_questions uq
    JOIN activities a ON uq.activity_id = a.id
    WHERE DATE(uq.created_at) = ? AND a.status = 'active' AND uq.resolved = 0
    ORDER BY uq.created_at DESC
  `, [dateStr]);

  return { date: dateStr, stats, hotQuestions, unansweredQuestions };
}

/**
 * 生成邮件 HTML 内容
 */
async function generateEmailHTML(data) {
  const date = data?.date || new Date().toISOString().split('T')[0];
  const stats = data?.stats || [];
  const hotQuestions = data?.hotQuestions || [];
  const unansweredQuestions = data?.unansweredQuestions || [];
  
  const totalPv = stats.reduce((sum, s) => sum + s.pv, 0);
  const totalUv = stats.reduce((sum, s) => sum + s.uv, 0);
  const totalChats = stats.reduce((sum, s) => sum + s.chat_count, 0);

  let aiSummary = '';
  try {
    aiSummary = await generateDailySummary(stats, hotQuestions, unansweredQuestions);
  } catch (error) {
    aiSummary = '昨日运营数据如报告所示，请查阅详情。';
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    .container { background: white; border-radius: 12px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
    h1 { color: #2563eb; border-bottom: 3px solid #2563eb; padding-bottom: 15px; margin-bottom: 20px; }
    h2 { color: #1e40af; margin-top: 30px; }
    .summary { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; margin: 20px 0; }
    .summary h3 { margin-top: 0; }
    .stats { display: flex; gap: 15px; margin: 25px 0; flex-wrap: wrap; }
    .stat-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 10px; flex: 1; min-width: 150px; text-align: center; }
    .stat-card h3 { margin: 0; font-size: 14px; opacity: 0.9; }
    .stat-card .value { font-size: 32px; font-weight: bold; margin: 10px 0 0 0; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; background: white; }
    th, td { padding: 12px; text-left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; }
    .rank-badge { display: inline-block; width: 24px; height: 24px; border-radius: 50%; text-align: center; line-height: 24px; font-size: 12px; font-weight: bold; }
    .rank-1 { background: #fbbf24; color: white; }
    .rank-2 { background: #9ca3af; color: white; }
    .rank-3 { background: #cd7f32; color: white; }
    .rank-default { background: #e5e7eb; color: #6b7280; }
    .unanswered { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 0 8px 8px 0; margin: 10px 0; }
    .unanswered strong { color: #dc2626; }
    .success { background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 0 8px 8px 0; color: #065f46; }
    .tag { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 20px; font-size: 12px; margin-left: 8px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 AI运营助手 - 每日报告</h1>
    <p><strong>📅 报告日期：</strong>${date}</p>
    
    <div class="summary">
      <h3>🤖 AI 摘要</h3>
      <p style="margin-bottom: 0;">${aiSummary}</p>
    </div>
    
    <h2>📈 数据概览</h2>
    <div class="stats">
      <div class="stat-card">
        <h3>页面访问量</h3>
        <p class="value">${totalPv.toLocaleString()}</p>
      </div>
      <div class="stat-card">
        <h3>独立访客</h3>
        <p class="value">${totalUv.toLocaleString()}</p>
      </div>
      <div class="stat-card">
        <h3>对话次数</h3>
        <p class="value">${totalChats.toLocaleString()}</p>
      </div>
    </div>
    
    <h2>📊 各活动明细</h2>
    ${stats.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>活动名称</th>
          <th>访问量</th>
          <th>访客数</th>
          <th>对话次数</th>
        </tr>
      </thead>
      <tbody>
        ${stats.map(s => `
          <tr>
            <td><strong>${s.name}</strong></td>
            <td><span style="color: #2563eb; font-weight: bold;">${s.pv.toLocaleString()}</span></td>
            <td>${s.uv.toLocaleString()}</td>
            <td>${s.chat_count.toLocaleString()}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p class="success">🎉 昨日暂无活动数据</p>'}
    
    <h2>🔥 热门问题 Top 10 <span class="tag">用户最关心</span></h2>
    ${hotQuestions.length > 0 ? `
    <table>
      <thead>
        <tr>
          <th>排名</th>
          <th>问题内容</th>
          <th>所属活动</th>
          <th>咨询次数</th>
        </tr>
      </thead>
      <tbody>
        ${hotQuestions.map((q, i) => `
          <tr>
            <td><span class="rank-badge ${i < 3 ? 'rank-' + (i + 1) : 'rank-default'}">${i + 1}</span></td>
            <td>${q.question}</td>
            <td><span style="font-size: 12px; color: #6b7280;">${q.activity_name}</span></td>
            <td><strong style="color: #2563eb;">${q.count}</strong> 次</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : '<p class="success">🎉 暂无热门问题</p>'}
    
        <h2>❓ 未解答问题 <span class="tag" style="background: #fee2e2; color: #dc2626;">${unansweredQuestions.length} 条待处理</span></h2>
    ${unansweredQuestions.length > 0 ? `
    <p style="color: #6b7280; font-size: 14px;">以下问题无法从FAQ知识库中找到答案，建议尽快补充相关内容到FAQ中：</p>
    ${unansweredQuestions.slice(0, 20).map(q => `
      <div class="unanswered">
        <p><strong>📍 活动：</strong>${q.activity_name || '通用'}</p>
        <p><strong>❓ 用户问题：</strong>${q.question}</p>
        <p style="background: #fffbeb; padding: 10px; border-radius: 6px; margin-top: 8px;">
          <strong style="color: #b45309;">💡 建议方案：</strong>
          <span style="color: #92400e; font-size: 13px;">
            可在FAQ中添加类似问题："${q.question.substring(0, 30)}..."的问答，或在活动描述中补充说明
          </span>
        </p>
        <p style="font-size: 12px; color: #6b7280; margin-bottom: 0;">🕐 ${q.created_at}</p>
      </div>
    `).join('')}
    <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 15px; margin-top: 15px;">
      <h4 style="margin: 0 0 10px 0; color: #166534;">📋 批量处理建议</h4>
      <ul style="margin: 0; padding-left: 20px; color: #166534; font-size: 14px;">
        <li>统计昨日共 <strong>${unansweredQuestions.length}</strong> 个问题无法回答</li>
        <li>建议优先补充高频未解答问题的FAQ</li>
        <li>可在管理后台的"数据统计"页面查看所有未解答问题</li>
        <li>补充FAQ后AI将自动学习并正确回答</li>
      </ul>
    </div>
    ` : '<div class="success">🎉 太棒了！昨日无未解答问题</div>'}
    
    <div class="footer">
      <p>🤖 AI运营助手 自动生成 | 如有疑问请联系技术支持</p>
      <p>📧 本报告发送至：${REPORT_EMAIL}</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * 发送每日报告邮件
 */
async function sendDailyReport() {
  console.log('📊 开始生成每日报告...');
  
  try {
    const data = await getYesterdayData();
    const html = await generateEmailHTML(data);

    const { data: emailData, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: REPORT_EMAIL,
      subject: `📊 AI运营助手每日报告 - ${data.date}`,
      html: html
    });

    if (error) {
      console.error('❌ 邮件发送失败:', error);
      return { success: false, error: error.message };
    }

    console.log('✅ 邮件发送成功!');
    console.log('📧 收件人:', REPORT_EMAIL);
    console.log('📬 邮件ID:', emailData?.id);
    
    return { success: true, messageId: emailData?.id };
  } catch (error) {
    console.error('❌ 报告生成失败:', error);
    return { success: false, error: error.message };
  }
}

/**
 * 测试发送邮件
 */
async function testSendEmail() {
  console.log('🧪 测试发送邮件...');
  const result = await sendDailyReport();
  console.log('结果:', result);
  return result;
}

// 定时任务：每天早上 9:00 发送报告
cron.schedule('0 9 * * *', () => {
  console.log('⏰ 执行定时任务：发送每日报送');
  sendDailyReport();
}, {
  timezone: 'Asia/Shanghai'
});

console.log('✅ 定时任务已启动：每天 09:00 发送每日报送');

// 导出
module.exports = { sendDailyReport, testSendEmail, getYesterdayData };

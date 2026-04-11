const cron = require('node-cron');
const { Resend } = require('resend');

// 导入服务
const { sendDailyReport } = require('./scheduler');
const { sendDailyAICases } = require('./ai-cases-scheduler');

// 定时任务：每天早上9点
cron.schedule('0 9 * * *', async () => {
  console.log('📊 [' + new Date().toISOString() + '] 开始执行每日任务...');
  
  try {
    // 发送运营日报
    await sendDailyReport();
    console.log('✅ 运营日报发送完成');
  } catch (e) {
    console.error('❌ 日报发送失败:', e.message);
  }
  
  try {
    // 发送AI案例精选
    await sendDailyAICases();
    console.log('✅ AI案例精选发送完成');
  } catch (e) {
    console.error('❌ AI案例推送失败:', e.message);
  }
  
  console.log('📋 每日任务执行完毕');
});

console.log('✅ 定时任务已启动：每天 09:00');
console.log('   - 📊 发送运营日报');
console.log('   - 📰 发送AI案例精选');

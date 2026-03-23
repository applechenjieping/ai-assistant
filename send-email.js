const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

async function sendEmail() {
  // 创建163邮箱 transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.163.com',
    port: 465,
    secure: true, // 使用 SSL
    auth: {
      user: 'apple_chenjieping@163.com',
      pass: '这里需要授权码' // 需要替换
    }
  });

  const docPath = path.join(__dirname, '需求文档.docx');
  
  const info = await transporter.sendMail({
    from: '"AI助手" <apple_chenjieping@163.com>',
    to: 'chenjp@mingyuanyun.com',
    subject: 'AI运营助手 - 需求规格说明书',
    html: `
      <h2>AI运营助手 - 需求规格说明书</h2>
      <p>您好！</p>
      <p>附件是项目需求文档，包含以下内容：</p>
      <ul>
        <li>项目概述</li>
        <li>功能需求</li>
        <li>技术架构</li>
        <li>当前数据</li>
        <li>页面功能</li>
        <li>未来优化建议</li>
      </ul>
      <p><strong>项目地址：</strong>https://ai-assistant-wz69.onrender.com</p>
      <p><strong>管理后台：</strong>https://ai-assistant-wz69.onrender.com/admin</p>
      <p>---<br>AI运营助手</p>
    `,
    attachments: [
      {
        filename: 'AI运营助手-需求文档.docx',
        path: docPath
      }
    ]
  });

  console.log('发送成功:', info.messageId);
}

sendEmail().catch(console.error);

const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = require('docx');
const fs = require('fs');

const doc = new Document({
  sections: [{
    properties: {},
    children: [
      new Paragraph({
        text: "AI运营助手 - 需求规格说明书",
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 400 }
      }),
      
      new Paragraph({
        text: "1. 项目概述",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "1.1 项目背景", bold: true }),
          new TextRun({ text: "\n美林湖社区活动智能问答系统，为社区活动提供FAQ智能问答服务。" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "1.2 项目目标", bold: true }),
          new TextRun({ text: "\n• 提供统一的AI问答入口\n• 支持多活动并行管理\n• 自动识别用户问题所属活动\n• 收集用户问题统计数据\n• 每日自动发送报告邮件" })
        ],
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "2. 功能需求",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "2.1 活动管理", bold: true }),
          new TextRun({ text: "\n• 创建/编辑/删除活动\n• 活动包含：名称、描述、时间、地点、热线\n• 每个活动独立链接分享" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "2.2 FAQ知识库", bold: true }),
          new TextRun({ text: "\n• 支持Word(.docx)/PDF/TXT格式导入\n• 手动逐条添加FAQ\n• FAQ包含：问题、答案、分类、关键词" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "2.3 AI智能问答", bold: true }),
          new TextRun({ text: "\n• 统一入口：一个页面支持所有活动\n• 自动识别：AI自动判断问题属于哪个活动\n• 上下文记忆：支持多轮对话\n• 未解答收集：收集FAQ无法回答的问题" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "2.4 数据统计", bold: true }),
          new TextRun({ text: "\n• 访问量统计\n• 热门问题排行\n• 未解答问题收集" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "2.5 每日报送", bold: true }),
          new TextRun({ text: "\n• 每天09:00自动发送邮件\n• 包含：访问量、热门问题、未解答问题\n• 未解答问题提供FAQ补充建议" })
        ],
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "3. 技术架构",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "3.1 技术栈", bold: true }),
          new TextRun({ text: "\n• 后端: Node.js + Express\n• 数据库: SQLite (sql.js)\n• 前端: React + Tailwind CSS + Vite\n• AI服务: 硅基流动 (Qwen/Qwen2.5-72B-Instruct)\n• 邮件服务: Resend" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "3.2 部署平台", bold: true }),
          new TextRun({ text: "\n• Render: https://ai-assistant-wz69.onrender.com" })
        ],
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "4. 当前数据",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "4.1 活动列表", bold: true }),
          new TextRun({ text: "\n• 美林湖手作活动 (26条FAQ)\n• 美林湖第三届万人春晚——歌王大赛 (30条FAQ)" })
        ],
        spacing: { after: 150 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "4.2 用户账户", bold: true }),
          new TextRun({ text: "\n• 管理员: admin / admin123" })
        ],
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "5. 页面功能",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• AI对话页 (/)", bold: true }),
          new TextRun({ text: "\n统一AI助手入口，显示活动列表，自动识别活动回答问题" })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• 管理后台 (/admin)", bold: true }),
          new TextRun({ text: "\n登录认证、仪表盘、活动管理、数据统计" })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• 登录页 (/login)", bold: true }),
          new TextRun({ text: "\n管理员登录，JWT令牌认证" })
        ],
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "6. 未来优化建议",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 300, after: 200 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• AI模型优化", bold: true }),
          new TextRun({ text: "\n考虑付费API或更换服务商" })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• 数据库持久化", bold: true }),
          new TextRun({ text: "\n当前为文件存储，可考虑云数据库" })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• 用户系统", bold: true }),
          new TextRun({ text: "\n增加普通用户登录" })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• 活动报名", bold: true }),
          new TextRun({ text: "\n增加在线报名功能" })
        ],
        spacing: { after: 100 }
      }),
      new Paragraph({
        children: [
          new TextRun({ text: "• 消息推送", bold: true }),
          new TextRun({ text: "\n微信模板消息通知" })
        ],
        spacing: { after: 300 }
      }),

      new Paragraph({
        text: "文档生成时间：2026-03-23",
        alignment: AlignmentType.CENTER,
        spacing: { before: 400 }
      }),
    ],
  }],
});

Packer.toBuffer(doc).then((buffer) => {
  fs.writeFileSync("需求文档.docx", buffer);
  console.log("Word文档已生成: 需求文档.docx");
});

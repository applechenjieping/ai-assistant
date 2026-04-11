const { Resend } = require('resend');

const RESEND_API_KEY = 're_BJrhRwTM_79ZwRmA5SBzQuGMWnH2vmBLE';
const EMAIL_TO = 'apple.chenjieping@gmail.com';

// 预设精选AI案例库（会随机选取）
const AI_CASES = [
  {
    title: '麦当劳 AI 驱动的得来速语音点餐系统',
    category: '餐饮零售',
    description: 'IBM Watson AI技术实现智能语音点餐，平均节省30秒/单，提升服务效率',
    url: 'https://www.qsrweb.com/operations/mcdonalds-automates-drive-thru-with-ibm-watson/',
    source: 'QSR Magazine'
  },
  {
    title: '阿里巴巴 AI 设计工具 Lucion 赋能电商',
    category: '电商零售',
    description: 'AI自动生成商品主图和详情页，设计师效率提升10倍',
    url: 'https://www.alibabacloud.com/blog/alibaba-lucion-ai-design-platform_599489',
    source: '阿里云'
  },
  {
    title: '字节跳动 AI 推荐算法变现揭秘',
    category: '内容平台',
    description: '今日头条/抖音千人千面推荐系统背后的AI推荐算法实践',
    url: 'https://algorithm.engineering/',
    source: 'Algorithm Engineering'
  },
  {
    title: '京东物流 AI 智能仓储与无人配送',
    category: '物流仓储',
    description: '亚洲一号智能仓库实现全流程自动化，无人机配送覆盖偏远地区',
    url: 'https://www.jd.com/newslist/5-2.html',
    source: '京东物流'
  },
  {
    title: '平安保险 AI 智能理赔定损',
    category: '金融保险',
    description: '图片识别+AI算法实现车险秒级理赔，从3天缩短到3分钟',
    url: 'https://www.pingan.com/about/technology.html',
    source: '平安科技'
  },
  {
    title: '美团 AI 智能调度系统',
    category: '本地生活',
    description: '骑手配送路径AI优化，日均订单调度超5000万单',
    url: 'https://tech.meituan.com/2019/12/08/meituan-ai-dispatch.html',
    source: '美团技术'
  },
  {
    title: '腾讯 AI 辅助肺癌早筛系统',
    category: '医疗健康',
    description: 'AI读片筛查肺结节，准确率达96%，已落地100+三甲医院',
    url: 'https://ai.qq.com/',
    source: '腾讯AI Lab'
  },
  {
    title: '科大讯飞 AI 在线教育平台',
    category: '教育',
    description: 'AI口语评测+智能批改，服务超2亿学生用户',
    url: 'https://www.iflytek.com/education/',
    source: '科大讯飞'
  },
  {
    title: '特斯拉 Autopilot 自动驾驶',
    category: '汽车出行',
    description: '视觉AI+深度学习实现自动辅助驾驶，数据驱动迭代优化',
    url: 'https://www.tesla.com/autopilot',
    source: 'Tesla'
  },
  {
    title: 'OpenAI ChatGPT 企业级应用',
    category: '企业服务',
    description: '各行业接入ChatGPT API实现客服、写作、分析等场景落地',
    url: 'https://openai.com/enterprise',
    source: 'OpenAI'
  },
  {
    title: 'Netflix AI 推荐系统',
    category: '流媒体',
    description: '个性化推荐每年为Netflix节省10亿美元推荐成本',
    url: 'https://research.netflix.com/research-area/recommendations',
    source: 'Netflix Research'
  },
  {
    title: '拼多多 AI 智能拼团与定价',
    category: '电商',
    description: 'AI动态定价+社交裂变推荐，GMV同比增长37%',
    url: 'https://www.pinduoduo.com/',
    source: '拼多多'
  },
  {
    title: '顺丰 AI 智慧物流网络',
    category: '物流',
    description: 'AI预测件量+智能仓储调配，配送时效提升25%',
    url: 'https://www.sf-express.com/sf-service-owf-web/scenario/AI',
    source: '顺丰科技'
  },
  {
    title: '建设银行 AI 智慧金融',
    category: '银行',
    description: 'AI反欺诈系统月均拦截可疑交易10万+笔，准确率99.9%',
    url: 'https://www.ccb.com/technology/5g.html',
    source: '建设银行'
  },
  {
    title: '滴滴 AI 智能出行调度',
    category: '出行',
    description: 'AI预测出行需求+动态定价，日均处理路径规划超百亿次',
    url: 'https://www.didiglobal.com/',
    source: '滴滴出行'
  }
];

function getRandomCases(count = 5) {
  const shuffled = [...AI_CASES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function generateEmailHTML(cases) {
  const date = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
  
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 650px; margin: 0 auto; padding: 20px; background: #fff;">
      <div style="text-align: center; padding: 20px 0; border-bottom: 3px solid #0066cc;">
        <h1 style="color: #1a1a1a; margin: 0; font-size: 24px;">🤖 每日AI应用案例精选</h1>
        <p style="color: #666; margin: 8px 0 0 0; font-size: 14px;">📅 ${date}</p>
      </div>
      
      <p style="color: #555; font-size: 14px; padding: 15px; background: #f0f7ff; border-radius: 8px; margin: 20px 0;">
        💡 精选各行业AI落地成功案例，涵盖零售、金融、医疗、教育等领域，助你洞察AI赋能之道
      </p>
      
      ${cases.map((c, i) => `
        <div style="background: #f8f9fa; border-radius: 12px; padding: 20px; margin: 16px 0; border: 1px solid #e9ecef;">
          <span style="background: #0066cc; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${c.category}</span>
          <h3 style="margin: 12px 0 8px 0; color: #333; font-size: 16px;">
            <a href="${c.url}" target="_blank" style="color: #0066cc; text-decoration: none;">${i + 1}. ${c.title}</a>
          </h3>
          <p style="color: #555; font-size: 14px; margin: 0 0 12px 0; line-height: 1.5;">${c.description}</p>
          <div style="border-top: 1px solid #e9ecef; padding-top: 10px;">
            <a href="${c.url}" target="_blank" style="color: #0066cc; font-size: 13px; text-decoration: none;">🔗 阅读原文</a>
            <span style="color: #999; font-size: 12px; float: right;">📰 ${c.source}</span>
          </div>
        </div>
      `).join('')}
      
      <div style="margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; text-align: center;">
        <p style="color: #666; font-size: 13px; margin: 0;">
          💡 由 AI 运营助手自动整理 | 每周更新精选案例库
        </p>
      </div>
    </div>
  `;
}

async function sendDailyAICases() {
  console.log('📰 开始生成AI应用案例精选...');
  
  try {
    const cases = getRandomCases(5);
    const html = generateEmailHTML(cases);
    
    const resend = new Resend(RESEND_API_KEY);
    await resend.emails.send({
      from: 'AI案例精选 <noreply@resend.dev>',
      to: EMAIL_TO,
      subject: `🤖 每日AI应用案例精选 (${new Date().toLocaleDateString('zh-CN')})`,
      html: html
    });
    
    console.log('✅ AI案例日报已发送，共', cases.length, '条');
    return { success: true, count: cases.length };
  } catch (e) {
    console.error('❌ 发送失败:', e.message);
    return { success: false, error: e.message };
  }
}

if (require.main === module) {
  sendDailyAICases();
}

module.exports = { sendDailyAICases };

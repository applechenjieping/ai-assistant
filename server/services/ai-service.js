require('dotenv').config();
const https = require('https');

const SILICONFLOW_API_KEY = process.env.SILICONFLOW_API_KEY;
const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-72B-Instruct';

/**
 * 调用硅基流动 API
 */
function callAPI(requestBody, retries = 3, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    
    const options = {
      hostname: 'api.siliconflow.cn',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SILICONFLOW_API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            console.error('API 错误响应:', data);
            reject(new Error(`API 返回错误: ${res.statusCode}`));
            return;
          }
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      if (retries > 0) {
        console.log(`API 超时，剩余重试次数: ${retries - 1}`);
        setTimeout(() => {
          callAPI(requestBody, retries - 1, timeout).then(resolve).catch(reject);
        }, 1000);
      } else {
        reject(new Error('API 请求超时'));
      }
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 统一 AI 对话 - 支持多活动 FAQ + 自动识别活动
 */
async function chatWithUnifiedAI(userMessage, history = [], allFaqs = [], activityNames = '活动') {
  // 按活动分组 FAQ
  const faqByActivity = {};
  allFaqs.forEach(faq => {
    if (!faqByActivity[faq.activity_name]) {
      faqByActivity[faq.activity_name] = [];
    }
    faqByActivity[faq.activity_name].push(faq);
  });
  
  // 构建 FAQ 上下文
  let faqContext = '';
  for (const [activityName, faqs] of Object.entries(faqByActivity)) {
    faqContext += `\n【${activityName}】\n`;
    faqs.forEach((f, i) => {
      faqContext += `Q${i+1}: ${f.question}\n`;
      faqContext += `A${i+1}: ${f.answer}\n`;
    });
  }
  
  const systemPrompt = `你是一个专业的 AI 活动助手，负责为用户解答多个活动的相关问题。

你的职责是：
1. 仔细阅读用户的问题，理解用户想了解哪个活动
2. 在提供的 FAQ 知识库中查找相关信息
3. 如果用户问题涉及具体活动名称，直接使用该活动的 FAQ 回答
4. 如果用户没有明确指定活动，但问题与某个活动相关，根据问题内容推断最可能是哪个活动
5. 保持友好、专业的语气
6. 如果所有活动的 FAQ 都没有相关信息，诚实地告知用户

## 活动列表
${activityNames}

## FAQ 知识库
${faqContext}

## 回答格式要求
- 开头可以简短确认用户想了解的活动（如："关于歌王大赛..."、"根据您的问题，我理解为您在咨询xxx活动..."）
- 然后给出具体答案
- 如果不确定用户想问哪个活动，可以询问用户具体想了解哪个活动
- 如果确实无法从 FAQ 中找到答案，回复格式："抱歉，我在知识库中没有找到相关信息。建议您拨打活动热线咨询。"

记住：你代表活动主办方，请保持专业和友好的形象。`;

  // 构建消息数组
  const messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  // 添加历史对话（最近10条）
  const recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });
  
  // 添加当前用户消息
  messages.push({
    role: 'user',
    content: userMessage
  });

  const requestBody = {
    model: SILICONFLOW_MODEL,
    messages: messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: false
  };

  try {
    const response = await callAPI(requestBody);
    const aiContent = response.choices[0].message.content;
    
    // 检测是否未解答
    const isUnanswered = aiContent.includes('没有找到相关信息') || 
                         aiContent.includes('无法回答这个问题') ||
                         aiContent.includes('知识库中没有找到');
    
    // 尝试识别 AI 回复中提到的活动
    let detectedActivity = null;
    for (const activityName of Object.keys(faqByActivity)) {
      if (aiContent.includes(activityName) || aiContent.includes(activityName.replace(/歌王大赛/, '歌王大赛'))) {
        detectedActivity = activityName;
        break;
      }
    }
    
    return {
      content: aiContent,
      isUnanswered,
      detectedActivity
    };
  } catch (error) {
    console.error('AI API 调用失败:', error);
    throw error;
  }
}

/**
 * 单活动对话（保留兼容）
 */
async function chatWithAI(userMessage, history = [], faqs = [], activityName = '活动') {
  const faqContext = faqs.map(f => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n');
  
  const systemPrompt = `你是一个专业的活动助手，正在为"${activityName}"活动提供咨询服务。

你的职责是：
1. 基于以下 FAQ 内容回答用户问题
2. 保持友好、专业的语气
3. 如果用户的问题不在 FAQ 范围内，尝试根据已知信息给出有帮助的回答
4. 如果完全无法回答，诚实地告知用户

以下是活动的 FAQ 内容：

${faqContext}

回答要求：
- 回答要简洁明了，直接回答用户问题
- 如果 FAQ 中有相关信息，优先使用 FAQ 内容
- 如果需要补充说明，可以适当展开
- 不要编造不存在的信息
- 如果问题超出范围，回复格式："抱歉，我暂时无法回答这个问题。建议您拨打活动热线咨询，或联系活动主办方获取更多信息。"`;  messages = [
    { role: 'system', content: systemPrompt }
  ];
  
  recentHistory = history.slice(-10);
  recentHistory.forEach(msg => {
    messages.push({
      role: msg.role,
      content: msg.content
    });
  });
  
  messages.push({
    role: 'user',
    content: userMessage
  });

  const requestBody = {
    model: SILICONFLOW_MODEL,
    messages: messages,
    temperature: 0.7,
    max_tokens: 1024,
    stream: false
  };

  try {
    const response = await callAPI(requestBody);
    const aiContent = response.choices[0].message.content;
    
    const isUnanswered = aiContent.includes('暂时无法回答') || 
                         aiContent.includes('无法回答这个问题') ||
                         aiContent.includes('建议您拨打活动热线');
    
    return {
      content: aiContent,
      isUnanswered
    };
  } catch (error) {
    console.error('AI API 调用失败:', error);
    throw error;
  }
}

/**
 * 生成每日报告摘要
 */
async function generateDailySummary(stats, hotQuestions, unansweredQuestions) {
  const systemPrompt = `你是一个数据分析助手，需要根据活动运营数据生成简洁的日报摘要。

请用专业但易懂的语言总结今天的运营情况，包括：
1. 整体访问和对话情况
2. 用户最关心的问题
3. 需要关注的问题（未解答问题）
4. 简短的运营建议

保持简洁，总字数控制在200字以内。`;

  const userPrompt = `以下是昨天的运营数据：

访问统计：
- 总访问量(PV): ${stats.reduce((sum, s) => sum + s.pv, 0)}
- 独立访客(UV): ${stats.reduce((sum, s) => sum + s.uv, 0)}
- 对话次数: ${stats.reduce((sum, s) => sum + s.chat_count, 0)}

热门问题 Top 5：
${hotQuestions.slice(0, 5).map((q, i) => `${i + 1}. ${q.question} (${q.count}次)`).join('\n')}

未解答问题: ${unansweredQuestions.length} 条

请生成日报摘要。`;

  try {
    const response = await callAPI({
      model: SILICONFLOW_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('生成日报摘要失败:', error);
    return '由于数据量不足或服务暂时不可用，无法生成摘要。';
  }
}

module.exports = { chatWithAI, chatWithUnifiedAI, generateDailySummary };

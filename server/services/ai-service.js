require('dotenv').config();
const https = require('https');

const API_KEY = process.env.SILICONFLOW_API_KEY;
const MODEL = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
const VERCEL_AI_URL = process.env.VERCEL_AI_URL;

/**
 * 调用硅基流动 API（直接）
 */
function callSiliconFlow(requestBody, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(requestBody);
    
    const options = {
      hostname: 'api.siliconflow.cn',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`API错误: ${res.statusCode}`));
            return;
          }
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('API超时'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 调用Vercel AI代理
 */
function callVercelAI(message, history, systemPrompt, timeout = 120000) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ message, history, systemPrompt });
    
    const url = new URL(VERCEL_AI_URL);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: timeout
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          if (res.statusCode !== 200) {
            reject(new Error(`Vercel API错误: ${res.statusCode}`));
            return;
          }
          const json = JSON.parse(data);
          resolve(json.reply);
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Vercel API超时'));
    });
    req.write(postData);
    req.end();
  });
}

/**
 * 发送消息到AI
 */
async function sendToAI(messages, systemPrompt) {
  // 如果配置了Vercel AI URL，使用Vercel代理
  if (VERCEL_AI_URL) {
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    const lastMessage = history.pop();
    return await callVercelAI(lastMessage.content, history, systemPrompt);
  }
  
  // 否则直接调用硅基流动
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await callSiliconFlow({
        model: MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2048
      });

      if (response.choices && response.choices[0]) {
        return response.choices[0].message.content;
      }
      throw new Error('API返回格式异常');
    } catch (error) {
      console.log(`API调用失败 (${i + 1}/${maxRetries}):`, error.message);
      lastError = error;
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  throw lastError || new Error('AI服务暂时不可用');
}

/**
 * 统一AI对话
 */
async function chatWithUnifiedAI(userMessage, history, faqs, activityNames) {
  const faqContext = faqs.map(f => `活动：${f.activity_name}\nQ: ${f.question}\nA: ${f.answer}`).join('\n\n');
  const activitiesStr = activityNames.join('、');

  const systemPrompt = `你是美林湖社区的AI活动助手，负责解答关于以下活动的问题：${activitiesStr}。

以下是活动的FAQ知识库：
${faqContext}

请根据FAQ知识库回答用户问题。如果问题不在知识库中，请礼貌地说明并建议拨打热线020-36728888咨询。
回答要简洁、友好、专业。`;

  const messages = [
    ...history.map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: userMessage }
  ];

  return await sendToAI(messages, systemPrompt);
}

module.exports = { sendToAI, chatWithUnifiedAI };

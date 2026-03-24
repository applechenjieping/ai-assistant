require('dotenv').config();
const https = require('https');

// 使用单个API Key
const API_KEY = process.env.SILICONFLOW_API_KEY;

const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-72B-Instruct';

/**
 * 调用硅基流动 API
 */
function callAPI(requestBody, timeout = 120000) {
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
      reject(new Error('API 请求超时'));
    });

    req.write(postData);
    req.end();
  });
}

/**
 * 发送消息到AI
 */
async function sendToAI(messages, systemPrompt) {
  const maxRetries = 3;
  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await callAPI({
        model: SILICONFLOW_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        max_tokens: 2048
      }, 60000);

      if (response.choices && response.choices[0]) {
        return response.choices[0].message.content;
      }
      throw new Error('API返回格式异常');
    } catch (error) {
      console.log(`API 调用失败 (${i + 1}/${maxRetries}):`, error.message);
      lastError = error;
      
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
  }

  throw lastError || new Error('AI服务暂时不可用');
}

module.exports = { sendToAI };

/**
 * 统一AI对话（供unified-chat路由使用）
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

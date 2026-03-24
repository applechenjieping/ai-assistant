require('dotenv').config();
const https = require('https');

// 支持多个API Key
const API_KEYS = [
  process.env.SILICONFLOW_API_KEY,
  process.env.SILICONFLOW_API_KEY_2
].filter(key => key); // 过滤空值

let currentKeyIndex = 0;

function getNextKey() {
  if (API_KEYS.length === 0) {
    throw new Error('未配置API Key');
  }
  const key = API_KEYS[currentKeyIndex % API_KEYS.length];
  currentKeyIndex++;
  return key;
}

const MODEL = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

async function callSiliconFlow(messages, systemPrompt, retryCount = 0) {
  const maxRetries = API_KEYS.length * 2; // 每个Key最多重试2次
  
  return new Promise((resolve, reject) => {
    const apiKey = getNextKey();
    
    const fullMessages = systemPrompt 
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;
    
    const postData = JSON.stringify({
      model: MODEL,
      messages: fullMessages,
      temperature: 0.7,
      max_tokens: 2048
    });
    
    const options = {
      hostname: 'api.siliconflow.cn',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 60000
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            // 如果是这个Key的配额问题，尝试下一个Key
            if (retryCount < maxRetries && (data.includes('quota') || data.includes('insufficient'))) {
              console.log(`Key配额不足，切换下一个Key (${retryCount + 1}/${maxRetries})`);
              callSiliconFlow(messages, systemPrompt, retryCount + 1).then(resolve).catch(reject);
              return;
            }
            reject(new Error(`API错误: ${res.statusCode}`));
            return;
          }
          resolve(json.choices?.[0]?.message?.content || '无法生成回答');
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', (e) => {
      // 网络错误，尝试下一个Key
      if (retryCount < maxRetries) {
        console.log(`网络错误，切换Key重试 (${retryCount + 1}/${maxRetries})`);
        callSiliconFlow(messages, systemPrompt, retryCount + 1).then(resolve).catch(reject);
      } else {
        reject(e);
      }
    });
    
    req.on('timeout', () => { 
      req.destroy();
      if (retryCount < maxRetries) {
        console.log(`超时，切换Key重试 (${retryCount + 1}/${maxRetries})`);
        callSiliconFlow(messages, systemPrompt, retryCount + 1).then(resolve).catch(reject);
      } else {
        reject(new Error('API请求超时')); 
      }
    });
    
    req.write(postData);
    req.end();
  });
}

async function sendToAI(messages, systemPrompt) {
  return await callSiliconFlow(messages, systemPrompt);
}

async function chatWithUnifiedAI(userMessage, history, faqs, activityNames) {
  const namesStr = Array.isArray(activityNames) ? activityNames.join('、') : String(activityNames || '');
  const faqList = Array.isArray(faqs) ? faqs : [];
  
  const faqContext = faqList.map(f => 
    `【${f.activity_name || '通用'}】\nQ: ${f.question}\nA: ${f.answer}`
  ).join('\n\n');

  const systemPrompt = `你是美林湖社区的AI活动助手，负责解答关于以下活动的问题：${namesStr}。

以下是活动的FAQ知识库：
${faqContext}

请根据FAQ知识库回答用户问题。如果问题不在知识库中，请礼貌地说明并建议拨打热线020-36728888咨询。
回答要简洁、友好，专业。`;

  const messages = [
    ...(history || []).map(h => ({ role: h.role || 'user', content: h.content })),
    { role: 'user', content: userMessage }
  ];

  return await callSiliconFlow(messages, systemPrompt);
}

module.exports = { sendToAI, chatWithUnifiedAI };

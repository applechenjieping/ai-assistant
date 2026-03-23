require('dotenv').config();
const https = require('https');

// 支持多个API Key
const API_KEYS = [
  process.env.SILICONFLOW_API_KEY,
  process.env.SILICONFLOW_API_KEY_2,
  process.env.SILICONFLOW_API_KEY_3
].filter(key => key); // 过滤掉空的

let currentKeyIndex = 0;

function getNextKey() {
  const key = API_KEYS[currentKeyIndex % API_KEYS.length];
  currentKeyIndex++;
  return key;
}

const SILICONFLOW_MODEL = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-72B-Instruct';

/**
 * 调用硅基流动 API
 */
function callAPI(requestBody, retries = 3, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const apiKey = getNextKey();
    const postData = JSON.stringify(requestBody);
    
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
  const maxRetries = API_KEYS.length * 2; // 每个key重试2次
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
      }, 1, 45000); // 单次重试，超时45秒

      if (response.choices && response.choices[0]) {
        return response.choices[0].message.content;
      }
      throw new Error('API返回格式异常');
    } catch (error) {
      console.log(`API 调用失败 (${i + 1}/${maxRetries}):`, error.message);
      lastError = error;
      
      // 如果是超时或连接错误，稍等后重试
      if (error.message.includes('timeout') || error.message.includes('ECONNRESET')) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw lastError || new Error('AI服务暂时不可用');
}

module.exports = { sendToAI };

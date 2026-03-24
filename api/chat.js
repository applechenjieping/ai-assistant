const https = require('https');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, history, systemPrompt } = req.body;
  
  const apiKey = process.env.SILICONFLOW_API_KEY;
  const model = process.env.SILICONFLOW_MODEL || 'Qwen/Qwen2.5-7B-Instruct';

  const messages = [
    ...(history || []).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message }
  ];

  if (systemPrompt) {
    messages.unshift({ role: 'system', content: systemPrompt });
  }

  const postData = JSON.stringify({
    model,
    messages,
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
    timeout: 120000
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => { data += chunk; });
      
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) {
            console.error('API错误:', data);
            res.status(500).json({ error: 'AI服务暂时不可用' });
            return;
          }
          const json = JSON.parse(data);
          const reply = json.choices?.[0]?.message?.content;
          res.status(200).json({ reply: reply || '无法生成回答' });
        } catch (e) {
          console.error('解析错误:', e);
          res.status(500).json({ error: '响应解析失败' });
        }
      });
    });

    req.on('error', (e) => {
      console.error('请求错误:', e);
      res.status(500).json({ error: 'AI服务暂时不可用' });
    });

    req.on('timeout', () => {
      req.destroy();
      res.status(500).json({ error: 'AI服务超时' });
    });

    req.write(postData);
    req.end();
  });
}

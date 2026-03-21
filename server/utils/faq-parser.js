const fs = require('fs');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

/**
 * 解析 FAQ 文件
 * 支持 .docx, .doc, .pdf, .txt 格式
 */
async function parseFAQ(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  let text = '';

  switch (ext) {
    case '.docx':
    case '.doc':
      text = await parseDocx(filePath);
      break;
    case '.pdf':
      text = await parsePDF(filePath);
      break;
    case '.txt':
      text = await parseTxt(filePath);
      break;
    default:
      throw new Error(`不支持的文件格式: ${ext}`);
  }

  // 解析问答对
  return extractQAPairs(text);
}

/**
 * 解析 Word 文档
 */
async function parseDocx(filePath) {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value;
}

/**
 * 解析 PDF 文档
 */
async function parsePDF(filePath) {
  const dataBuffer = fs.readFileSync(filePath);
  const data = await pdfParse(dataBuffer);
  return data.text;
}

/**
 * 解析文本文件
 */
async function parseTxt(filePath) {
  return fs.readFileSync(filePath, 'utf-8');
}

/**
 * 从文本中提取问答对
 */
function extractQAPairs(text) {
  const faqs = [];
  
  // 多种匹配模式
  const patterns = [
    // Q1: xxx A1: xxx 格式
    /Q(\d+)[:：]\s*(.+?)\s*A\1[:：]\s*(.+?)(?=Q\d+[:：]|$)/gs,
    // Q：xxx A：xxx 格式
    /Q[:：]\s*(.+?)\s*A[:：]\s*(.+?)(?=Q[:：]|$)/gs,
    // **Q1：** xxx **A1：** xxx 格式
    /\*\*Q(\d+)[:：]\*\*\s*(.+?)\s*\*\*A\1[:：]\*\*\s*(.+?)(?=\*\*Q\d+[:：]\*\*|$)/gs,
    // 问题：xxx 答案：xxx 格式
    /问题[:：]\s*(.+?)\s*答案[:：]\s*(.+?)(?=问题[:：]|$)/gs,
  ];

  let matched = false;

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    
    if (matches.length > 0) {
      matched = true;
      matches.forEach(match => {
        const question = (match[2] || match[1] || '').trim();
        const answer = (match[3] || match[2] || '').trim();
        
        if (question && answer) {
          faqs.push({
            question: cleanText(question),
            answer: cleanText(answer),
            category: '',
            keywords: extractKeywords(question)
          });
        }
      });
      break;
    }
  }

  // 如果没有匹配到标准格式，尝试按行解析
  if (!matched) {
    const lines = text.split('\n').filter(line => line.trim());
    let currentQuestion = null;
    let currentAnswer = '';
    let inAnswer = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      // 检测问题行
      if (/^(Q\d*|问题|提问)[:：]?/i.test(trimmed) || trimmed.endsWith('？') || trimmed.endsWith('?')) {
        // 保存上一组问答
        if (currentQuestion && currentAnswer) {
          faqs.push({
            question: cleanText(currentQuestion),
            answer: cleanText(currentAnswer),
            category: '',
            keywords: extractKeywords(currentQuestion)
          });
        }
        
        currentQuestion = trimmed.replace(/^(Q\d*|问题|提问)[:：]?\s*/i, '');
        currentAnswer = '';
        inAnswer = true;
      }
      // 检测答案行
      else if (/^(A\d*|答案|回答)[:：]?/i.test(trimmed)) {
        currentAnswer = trimmed.replace(/^(A\d*|答案|回答)[:：]?\s*/i, '');
      }
      // 继续答案内容
      else if (inAnswer && currentQuestion) {
        if (trimmed) {
          currentAnswer += (currentAnswer ? '\n' : '') + trimmed;
        }
      }
    }

    // 保存最后一组问答
    if (currentQuestion && currentAnswer) {
      faqs.push({
        question: cleanText(currentQuestion),
        answer: cleanText(currentAnswer),
        category: '',
        keywords: extractKeywords(currentQuestion)
      });
    }
  }

  // 去重
  const uniqueFaqs = [];
  const seen = new Set();
  
  for (const faq of faqs) {
    const key = faq.question.toLowerCase();
    if (!seen.has(key) && faq.question.length > 3 && faq.answer.length > 3) {
      seen.add(key);
      uniqueFaqs.push(faq);
    }
  }

  return uniqueFaqs;
}

/**
 * 清理文本
 */
function cleanText(text) {
  if (!text) return '';
  return text
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^\*+|\*+$/g, '')
    .trim();
}

/**
 * 提取关键词
 */
function extractKeywords(text) {
  if (!text) return [];
  
  // 停用词
  const stopWords = new Set(['的', '是', '在', '有', '和', '了', '不', '这', '我', '你', '他', '她', '它', '们', '什么', '怎么', '如何', '吗', '呢', '啊']);
  
  // 分词（简单按空格和标点分割）
  const words = text
    .replace(/[？?！!。，,、；;：:""''【】（）\(\)\[\]]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1 && !stopWords.has(word));
  
  return [...new Set(words)].slice(0, 10);
}

module.exports = { parseFAQ, extractQAPairs };

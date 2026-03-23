const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'data', 'db.json');

function loadDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.log('创建新数据库');
  }
  return {
    activities: [],
    faqs: [],
    chats: [],
    messages: [],
    sessions: []
  };
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = { loadDB, saveDB, getDB: loadDB };

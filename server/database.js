const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/assistant.db');

let db = null;

// 初始化数据库
async function initDatabase() {
  const SQL = await initSqlJs();
  
  // 尝试加载现有数据库
  if (fs.existsSync(dbPath)) {
    const buffer = fs.readFileSync(dbPath);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // 创建表
  db.run(`
    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      start_time TEXT,
      end_time TEXT,
      location TEXT,
      hotline TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS faqs (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      question TEXT NOT NULL,
      answer TEXT NOT NULL,
      category TEXT,
      keywords TEXT,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      visitor_id TEXT,
      ip TEXT,
      user_agent TEXT,
      last_active_at TEXT DEFAULT CURRENT_TIMESTAMP,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_unanswered INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS statistics (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      date TEXT NOT NULL,
      pv INTEGER DEFAULT 0,
      uv INTEGER DEFAULT 0,
      chat_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS hot_questions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      question TEXT NOT NULL,
      count INTEGER DEFAULT 1,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(activity_id, question, date)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS unanswered_questions (
      id TEXT PRIMARY KEY,
      activity_id TEXT NOT NULL,
      session_id TEXT,
      question TEXT NOT NULL,
      resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  saveDatabase();
  console.log('✅ 数据库初始化完成');
}

// 保存数据库到文件
function saveDatabase() {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(dbPath, buffer);
  }
}

// 数据库查询方法
const database = {
  // 辅助函数：处理参数
  _processParams: (params) => params.map(p => p === undefined ? null : p),
  // 执行 SQL（无返回值）
  run: (sql, params = []) => {
    const processedParams = database._processParams(params);
    db.run(sql, processedParams);
    saveDatabase();
  },
  
  // 获取单条记录
  get: (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const result = stmt.getAsObject();
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  },
  
  // 获取所有记录
  all: (sql, params = []) => {
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const results = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();
    return results;
  },
  
  // 执行原始 SQL
  exec: (sql) => {
    db.exec(sql);
    saveDatabase();
  }
};

// SQL 辅助函数
const helpers = {
  // ON CONFLICT 实现
  upsert: (table, conflictColumns, data) => {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map(col => `${col} = excluded.${col}`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    
    const sql = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT(${conflictColumns.join(', ')}) DO UPDATE SET ${setClause}
    `;
    
    database.run(sql, values);
  }
};

module.exports = { 
  db: database, 
  initDatabase, 
  saveDatabase,
  helpers 
};

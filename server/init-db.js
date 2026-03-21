require('dotenv').config();
const { initDatabase, db } = require('./database');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function main() {
  // 初始化数据库
  await initDatabase();

  // 创建默认管理员账户
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';

  const existingAdmin = db.get('SELECT * FROM admins WHERE username = ?', [adminUsername]);

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);
    db.run('INSERT INTO admins (id, username, password) VALUES (?, ?, ?)', 
      [uuidv4(), adminUsername, hashedPassword]);
    console.log(`✅ 管理员账户创建成功: ${adminUsername}`);
  } else {
    console.log(`ℹ️ 管理员账户已存在: ${adminUsername}`);
  }

  console.log('\n🎉 数据库初始化完成！');
  console.log(`📝 管理员账户: ${adminUsername}`);
  console.log(`🔑 管理员密码: ${adminPassword}`);
  console.log('\n请登录管理后台修改默认密码');
}

main().catch(console.error);

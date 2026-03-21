# AI 运营助手

一个基于 FAQ 的智能活动问答系统，支持多活动管理、AI 对话、数据统计和每日报送。

## 功能特性

### 🤖 AI 对话
- 基于硅基流动 API 的智能问答
- 支持上下文记忆，对话连贯
- 自动识别未解答问题

### 📊 多活动管理
- 创建/编辑/删除活动
- 支持 Word/PDF/TXT 格式 FAQ 上传
- 自动解析 FAQ 生成问答库

### 📈 数据统计
- 访问量/对话次数统计
- 热门问题排行
- 未解答问题收集

### 📧 每日报送
- 每日自动生成运营报告
- 发送至指定邮箱
- 包含 AI 生成的摘要分析

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
cd ai-assistant
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 2. 配置环境变量

编辑 `.env` 文件，填入你的配置：

```env
# 硅基流动 API（必填）
SILICONFLOW_API_KEY=your_api_key

# JWT 密钥
JWT_SECRET=your_jwt_secret

# 管理员账户
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# 邮件配置（可选，用于每日报送）
EMAIL_USER=your_email@qq.com
EMAIL_PASS=your授权码

# 每日报送邮箱
DAILY_REPORT_EMAIL=chenjp@mingyuanyun.com

# 服务端口
PORT=3001
```

### 3. 初始化数据库

```bash
npm run init-db
```

### 4. 启动服务

**开发模式（前后端同时启动）：**
```bash
npm run dev
```

**单独启动后端：**
```bash
npm run start
```

**单独启动前端：**
```bash
cd client
npm run dev
```

### 5. 访问应用

- **管理后台：** http://localhost:3000/admin
- **默认账号：** admin / admin123

## 部署到 Zeabur

### 1. 准备 Zeabur 项目

1. 注册 [Zeabur](https://zeabur.com)
2. 创建新项目

### 2. 部署步骤

```bash
# 1. 构建前端
cd client
npm install
npm run build
cd ..

# 2. 打包后端（可选，使用 npm start 模式）
# Zeabur 会自动识别 Node.js 项目
```

### 3. 配置环境变量

在 Zeabur 后台配置以下环境变量：

- `SILICONFLOW_API_KEY`
- `SILICONFLOW_BASE_URL` = `https://api.siliconflow.cn/v1`
- `SILICONFLOW_MODEL` = `Qwen/Qwen2.5-72B-Instruct`
- `JWT_SECRET`
- `EMAIL_USER`（可选）
- `EMAIL_PASS`（可选）
- `DAILY_REPORT_EMAIL`

### 4. 部署数据库

Zeabur 提供免费的 PostgreSQL 数据库，创建数据库后更新连接配置。

## 目录结构

```
ai-assistant/
├── client/                 # 前端 React 项目
│   ├── src/
│   │   ├── api/           # API 请求
│   │   ├── pages/         # 页面组件
│   │   ├── styles/        # 样式文件
│   │   └── App.jsx        # 主应用
│   └── package.json
├── server/                 # 后端 Node.js 项目
│   ├── routes/            # API 路由
│   │   ├── auth.js        # 认证接口
│   │   ├── activities.js  # 活动管理接口
│   │   ├── chat.js        # 对话接口
│   │   └── stats.js       # 统计接口
│   ├── services/          # 业务服务
│   │   ├── ai-service.js # AI 服务
│   │   └── scheduler.js   # 定时任务
│   ├── utils/            # 工具函数
│   │   └── faq-parser.js  # FAQ 解析
│   ├── database.js       # 数据库配置
│   └── index.js          # 服务入口
├── data/                  # 数据库存储
├── uploads/              # 上传文件
├── .env                  # 环境变量
└── package.json
```

## API 接口

### 认证接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/auth/login | 登录 |
| POST | /api/auth/change-password | 修改密码 |
| GET | /api/auth/verify | 验证 token |

### 活动接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/activities | 获取所有活动 |
| GET | /api/activities/:id | 获取活动详情 |
| POST | /api/activities | 创建活动 |
| PUT | /api/activities/:id | 更新活动 |
| DELETE | /api/activities/:id | 删除活动 |

### 对话接口

| 方法 | 路径 | 描述 |
|------|------|------|
| POST | /api/chat/session | 创建/获取会话 |
| POST | /api/chat/message | 发送消息 |
| GET | /api/chat/history/:session_id | 获取历史消息 |

### 统计接口

| 方法 | 路径 | 描述 |
|------|------|------|
| GET | /api/stats/overview | 数据概览 |
| GET | /api/stats/activity/:id | 活动统计 |
| GET | /api/stats/unanswered/:id | 未解答问题 |

## 使用说明

### 1. 创建活动

1. 登录管理后台
2. 点击「新建活动」
3. 填写活动信息
4. 上传 FAQ 文件或手动添加问答
5. 保存并获取活动链接

### 2. 分享活动链接

每个活动有独立的对话链接，格式：`https://your-domain.com/chat/{activity_id}`

### 3. 查看统计数据

- 访问量、对话次数统计
- 热门问题排行
- 未解答问题列表

### 4. 每日报送

每天早上 9:00 自动发送昨日统计报告到指定邮箱。

## 技术栈

### 前端
- React 18
- React Router
- Tailwind CSS
- Axios
- Lucide Icons

### 后端
- Node.js
- Express
- SQLite (better-sqlite3)
- 硅基流动 API

### 部署
- Zeabur / Vercel
- PostgreSQL

## 常见问题

### Q: 如何修改管理员密码？
A: 登录后在管理后台修改，或调用 `/api/auth/change-password` 接口。

### Q: 支持哪些 FAQ 文件格式？
A: 支持 .docx, .doc, .pdf, .txt 格式。

### Q: 如何查看未解答的问题？
A: 在管理后台的「数据统计」页面可以看到未解答问题列表。

### Q: 每日报送如何配置？
A: 配置 `.env` 中的邮件相关环境变量即可启用。

## License

MIT

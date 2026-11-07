-- ============================================================
-- Zag Blog · 初始数据库结构
-- 本地：npm run db:migrate:local
-- 线上：npm run db:migrate:remote
-- ============================================================

CREATE TABLE IF NOT EXISTS posts (
  id          TEXT PRIMARY KEY,
  slug        TEXT NOT NULL UNIQUE,
  title       TEXT NOT NULL,
  excerpt     TEXT NOT NULL DEFAULT '',
  content     TEXT NOT NULL DEFAULT '',
  cover_url   TEXT,
  tags        TEXT NOT NULL DEFAULT '',
  status      TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'draft')),
  featured    INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_posts_status_created ON posts(status, created_at DESC);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  repo_url    TEXT,
  icon        TEXT NOT NULL DEFAULT 'spark',
  tags        TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category    TEXT NOT NULL DEFAULT '收藏',
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_bookmarks_category ON bookmarks(category);

CREATE TABLE IF NOT EXISTS photos (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  r2_key      TEXT NOT NULL,
  width       INTEGER,
  height      INTEGER,
  taken_at    INTEGER,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS tracks (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  artist      TEXT NOT NULL DEFAULT '',
  album       TEXT NOT NULL DEFAULT '',
  r2_key      TEXT NOT NULL,
  cover_key   TEXT,
  duration    INTEGER,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  token_hash TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  ip         TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip ON login_attempts(ip, created_at);

-- ============================================================
-- 初始内容（可用 INSERT OR IGNORE 安全重复执行）
-- ============================================================

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('hero_title',    '在玻璃与光之间，记录所有热爱'),
  ('hero_subtitle', '一个关于代码、设计与日常的数字花园。写文章、收灵感、放照片，也收藏偶尔循环一整晚的歌。'),
  ('about_content', '## 你好，我是 Zag

这里是我的个人数字花园。白天写代码，晚上整理想法，偶尔拍点照片、做点设计。

### 这个博客有什么

- **文章**：技术笔记、设计观察、生活碎片
- **项目**：正在做和做过的东西
- **收藏夹**：值得反复打开的好网站
- **照片**：随手拍下的光
- **音乐**：写作时的背景音

### 联系我

如果你也对 Web、设计和 Cloudflare 感兴趣，欢迎通过页脚的邮箱找我聊天。'),
  ('footer_tagline', 'Built with Next.js · D1 · R2 · 玻璃与一点耐心'),
  ('github_url',     'https://github.com/'),
  ('email',          'hello@example.com');

INSERT OR IGNORE INTO posts (id, slug, title, excerpt, content, tags, status, featured, created_at, updated_at) VALUES
  ('seed-post-welcome', 'welcome-to-zag', '欢迎来到 Zag：在玻璃与光之间',
   '这是这个数字花园的第一篇文章。聊聊我为什么重新做一个博客，以及这里会放些什么。',
   '## 为什么又做一个博客

社交平台很快，但太快了。一条想法发出去，几分钟就被下一条淹没。我想要一个慢一点的地方：可以反复修改一篇文章，可以给照片写一段说明，也可以把喜欢的网站认真收好。

所以有了 **Zag**。

## 这里会有什么

- 关于 Web 开发的技术笔记，尤其是 Next.js 与 Cloudflare
- 设计相关的小观察，比如玻璃拟态、排版与动效
- 一些没有主题的照片
- 偶尔的音乐推荐

## 关于「玻璃」

这个博客的视觉关键词是 **玻璃**：半透明的面板、模糊的背景、边缘的一线高光。它让内容像浮在光里，而不是被塞进一个个白盒子。

> 好的界面不应该抢走内容的注意力，它只需要提供恰到好处的氛围。

接下来会慢慢更新。谢谢你路过这里。',
   '随笔,开始', 'published', 1, unixepoch() - 86400 * 2, unixepoch() - 86400 * 2),

  ('seed-post-stack', 'd1-r2-blog', '用 D1 + R2 搭一个真正属于你的博客',
   '把文章存进 SQLite，把照片和音乐放进对象存储。一套免费额度就够用的个人博客方案。',
   '## 为什么选 Cloudflare

个人博客最怕两件事：**维护成本** 和 **账单惊喜**。Cloudflare 的 D1（SQLite）和 R2（对象存储）刚好把这两件事都压得很低：

- D1 负责结构化数据：文章、项目、收藏、照片元信息
- R2 负责大文件：图片、音频、封面
- Workers 负责运行 Next.js 应用

## 数据怎么分

| 内容 | 存放位置 |
| --- | --- |
| 文章正文 | D1 `posts.content` |
| 图片文件 | R2 `photos/...` |
| 音频文件 | R2 `music/...` |
| 图片说明 | D1 `photos` 表 |

## 一个容易踩的坑

后台和 API 一定要配置 `run_worker_first`，否则同名静态资源可能绕过鉴权。这个项目的 `wrangler.jsonc` 里已经写好了：

```jsonc
"run_worker_first": ["/admin", "/admin/*", "/api/*"]
```

## 本地开发

```bash
npm install
npm run db:migrate:local
npm run dev
```

然后打开 `http://localhost:3000`，后台在 `/admin`。',
   'Cloudflare,Next.js,教程', 'published', 0, unixepoch() - 86400 * 5, unixepoch() - 86400 * 4),

  ('seed-post-glass', 'glassmorphism-notes', '玻璃拟态：让界面像一块会呼吸的玻璃',
   '模糊、透明、高光、层次。记录我在这个博客里做玻璃拟态时反复调整的几个细节。',
   '## 玻璃不是「加个 blur」

很多人对玻璃拟态的第一反应是 `backdrop-filter: blur(20px)`。但真正让一块玻璃好看的，是它和背景的关系。

### 1. 背景必须有层次

如果背景是一片纯色，玻璃就只是灰色的半透明块。所以我用了几个缓慢移动的渐变光斑（aurora），再加上一层很淡的网格。玻璃才有东西可以「透」和「模糊」。

### 2. 边缘比填充更重要

```css
.glass {
  background: color-mix(in srgb, var(--surface) 72%, transparent);
  backdrop-filter: blur(22px) saturate(160%);
  border: 1px solid var(--glass-border);
  box-shadow: 0 20px 60px -30px rgba(0, 0, 0, .45);
}
```

一条 1px 的亮边，比很重的阴影更能表达「玻璃」。

### 3. 暗色模式不是反色

暗色模式下我把玻璃做得更「深」、光斑更饱和，而不是简单把白色换成黑色。这样夜里的层次感还在。

### 4. 动效要克制

光斑移动 30 秒一圈，卡片入场 600ms，足够了。`prefers-reduced-motion` 下全部关掉。

> 玻璃拟态的核心不是效果，而是让内容看起来悬浮在一个有深度的空间里。',
   '设计,CSS,玻璃拟态', 'published', 0, unixepoch() - 86400 * 9, unixepoch() - 86400 * 8);

INSERT OR IGNORE INTO projects (id, name, description, url, repo_url, icon, tags, sort_order, created_at) VALUES
  ('seed-project-zag', 'Zag Blog', '你正在看的这个博客。Next.js + Cloudflare D1 + R2，玻璃拟态视觉，带完整内容后台。', '/', 'https://github.com/', 'spark', 'Next.js,Cloudflare,D1,R2', 1, unixepoch() - 86400 * 2),
  ('seed-project-d1', 'D1 数据层', '用 SQLite 管理文章、项目、收藏、照片与音乐元信息，迁移文件即代码。', 'https://developers.cloudflare.com/d1/', NULL, 'database', 'Cloudflare,SQLite', 2, unixepoch() - 86400 * 6),
  ('seed-project-r2', 'R2 媒体库', '图片与音频直传对象存储，通过带 Range 支持的流式接口输出。', 'https://developers.cloudflare.com/r2/', NULL, 'cloud', 'Cloudflare,Storage', 3, unixepoch() - 86400 * 8);

INSERT OR IGNORE INTO bookmarks (id, title, url, description, category, created_at) VALUES
  ('seed-bm-next', 'Next.js 文档', 'https://nextjs.org/docs', 'App Router、Server Components 与部署指南。', '开发', unixepoch() - 86400 * 3),
  ('seed-bm-d1', 'Cloudflare D1', 'https://developers.cloudflare.com/d1/', '边缘 SQLite 的官方文档与限制说明。', '开发', unixepoch() - 86400 * 4),
  ('seed-bm-r2', 'Cloudflare R2', 'https://developers.cloudflare.com/r2/', '对象存储、S3 兼容 API 与公开访问配置。', '开发', unixepoch() - 86400 * 5),
  ('seed-bm-tailwind', 'Tailwind CSS', 'https://tailwindcss.com/', '原子化 CSS 与设计系统参考。', '设计', unixepoch() - 86400 * 6),
  ('seed-bm-mdn', 'MDN Web Docs', 'https://developer.mozilla.org/', '查 CSS 与 Web API 最可靠的地方。', '开发', unixepoch() - 86400 * 7),
  ('seed-bm-type', 'Typewolf', 'https://www.typewolf.com/', '字体搭配与网页排版灵感。', '设计', unixepoch() - 86400 * 8);
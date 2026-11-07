# Zag · 玻璃与光

一个跑在 Cloudflare Workers 上的多功能个人博客：Next.js 16 + D1（SQLite）+ R2（对象存储），玻璃拟态视觉，自带专属内容后台。

- 前台：首页 / 文章 / 收藏夹 / 项目 / 照片 / 音乐 / 关于
- 视觉：玻璃朦胧风格、动态极光背景、深浅色切换、移动端适配
- 外观：可切换 R2 背景图、调整背景朦胧度、切换/自定义配色（本地实验功能）
- 搜索：`Ctrl / ⌘ + K` 或 `/` 打开快捷搜索，按标题检索全部内容
- 照片：按相册分类；点开后沉浸查看，顶部/底部栏淡出，支持滚轮缩放、拖动平移、右上角退出
- 音乐：按专辑分组为不同音乐包；全局播放器跨页面不中断，右下角黑胶可播放/暂停；自动读取 MP3 内嵌封面与 ID3 标签
- 后台：`/admin`，专属指令代码登录；文章、项目、收藏、照片、音乐、站点文案与登录指令全部可管理
- 存储：内容在 D1，图片 / 音频在 R2，媒体通过带 Range 支持的接口输出

## 线上地址

| 项目 | 地址 |
| --- | --- |
| 博客 | <https://zag.zeroa.space> |
| 后台 | <https://zag.zeroa.space/admin> |
| 初始指令 | 见本地 `.dev.vars`（登录后请到「设置 → 安全」修改） |

> `workers.dev` 在部分网络会被 DNS 污染，所以本项目绑定了自定义域名
> `zag.zeroa.space`（见 `wrangler.jsonc` 的 `routes`）。

---

## 1. 快速开始（本地）

要求：Node.js 22+、npm 10+。

```bash
npm install
npm run db:migrate:local   # 初始化本地 D1（含示例文章 / 项目 / 收藏）
npm run dev                # http://localhost:3000
```

后台地址：<http://localhost:3000/admin>

### 初始进入指令

当前写在 `.dev.vars`：

```bash
ADMIN_ACCESS_CODE=replace-with-your-own-secret
```

> 真实指令只保存在本地 `.dev.vars` 或 Cloudflare Worker secret 中，不要提交到仓库。

> 第一次登录后，请到后台「设置 → 安全」里改成你自己的指令。
> 改完后会以「加盐 SHA-256」形式存进 D1，不再依赖环境变量。
> `.dev.vars` 已被 `.gitignore` 忽略。

另外，连续点击站点左上角 Logo 5 次也会跳到后台登录页（一个小小的隐藏入口）。

---

## 2. 已创建的 Cloudflare 资源

`wrangler.jsonc` 里已经填好：

| 资源 | 名称 | 绑定 | ID |
| --- | --- | --- | --- |
| D1 | `zag-blog-db` | `DB` | `59aa0964-d005-4702-a946-e114851fe789` |
| R2 | `zag-blog-r2` | `BUCKET` | — |
| Worker | `zag-blog` | — | 部署后生成 |

首次部署前，先应用线上迁移并设置生产指令：

```bash
npm run db:migrate:remote
npx wrangler secret put ADMIN_ACCESS_CODE
npm run deploy
```

> 当前仓库的 `0001_init.sql`、`0002_photo_albums.sql` 已经应用到本地与远程 D1；重复执行会跳过已完成的迁移。
> 部署完成后，建议先在后台「设置 → 安全」把初始指令换成自己的。

`npm run deploy` 会执行 `opennextjs-cloudflare build && opennextjs-cloudflare deploy`。
构建产物在 `.open-next/`，Worker 入口 `.open-next/worker.js`。

本地预览生产构建：

```bash
npm run preview
```

---

## 3. 后台功能

| 页面 | 能力 |
| --- | --- |
| `/admin` | 内容统计、最近文章、最近照片 / 音乐、存储状态 |
| `/admin/posts` | 新建 / 编辑 / 删除文章；Markdown 编辑与预览、封面上传、标签、草稿、精选 |
| `/admin/projects` | 项目名称、链接、源码、图标、标签、排序 |
| `/admin/bookmarks` | 收藏标题、链接、分类、描述 |
| `/admin/photos` | 多选上传到 R2、选择相册、自动读取尺寸、编辑标题 / 说明 / 相册 / 拍摄日期、删除（同时删 R2 文件） |
| `/admin/backgrounds` | 上传背景图到 R2 `backgrounds/`、重命名、复制 URL、删除（同时删 R2 文件） |
| `/admin/music` | 上传音频与封面、自动读取时长 / 内嵌封面 / ID3 标签、从音频补封面、编辑专辑与排序、删除（同时删 R2 文件） |
| `/admin/settings` | 首页主副标题、关于页 Markdown、页脚、GitHub / 邮箱、修改进入指令 |

上传限制：

- 图片：JPG / PNG / WebP / GIF / AVIF，最大 25MB
- 音频：MP3 / WAV / M4A / AAC / OGG / FLAC / Opus，最大 60MB
- 图片上传前会在浏览器内自动压缩为 WebP（长边 ≤ 2400，质量 0.82），再写入 R2
- MP3 会自动解析 ID3v2 的标题 / 艺术家 / 专辑与 APIC 内嵌封面；没有内嵌封面时再手动上传
- 静态资源使用系统字体，不请求外部字体，减少首屏阻塞
- 上传键名由服务端生成（`photos/年/月/uuid.ext`、`music/…`、`covers/…`），不信任原始文件名

---

## 4. 技术结构

```
app/
├─ page.tsx                  首页
├─ posts/                    文章列表 + 详情
├─ bookmarks/ projects/      收藏夹 / 项目
├─ photos/ music/ about/     照片 / 音乐 / 关于
├─ admin/
│  ├─ login/                 登录页（指令代码）
│  └─ (panel)/               受保护后台（layout 里校验会话）
└─ api/
   ├─ search/                标题快捷搜索
   ├─ tracks/                全局播放器曲目列表
   ├─ media/[...key]/        R2 流式输出（缓存 + Range）
   └─ admin/
      ├─ login/ logout/      会话
      ├─ upload/             直传 R2
      ├─ settings/           站点文案
      ├─ access-code/        修改进入指令
      └─ [resource]/[id]/    文章 / 项目 / 收藏 / 照片 / 音乐 CRUD
components/
├─ site-header / footer      公共导航
├─ search-dialog             全局快捷搜索
├─ photo-gallery             照片瀑布流 + 沉浸灯箱（缩放 / 拖动）
├─ music-provider            全局音频状态与跨页面播放
├─ music-library             专辑分组音乐库 / 进度 / 音量
├─ vinyl-player              右下角黑胶播放器
└─ admin/                    后台界面与内容管理器
lib/
├─ db.ts                     D1 查询
├─ auth.ts                   会话、HMAC 校验、登录限流
├─ markdown.ts               安全 Markdown 渲染
├─ audio-metadata.ts         ID3v2 标签与内嵌封面解析
├─ admin-api.ts              后台鉴权与通用校验
└─ admin-client.ts           前端请求 / 上传（带进度、图片压缩）
migrations/
├─ 0001_init.sql             数据库结构与初始内容
├─ 0002_photo_albums.sql     照片相册字段
└─ 0003_backgrounds.sql      R2 背景图索引
```

### 数据库表

`posts`、`projects`、`bookmarks`、`photos`、`tracks`、`backgrounds`、`settings`、`admin_sessions`、`login_attempts`。

- 文章正文存 `posts.content`（Markdown）
- 照片通过 `photos.album` 分类；音乐通过 `tracks.album` 分成音乐包
- 图片 / 音频 / 背景文件存 R2，表里只存 `r2_key` / `cover_key`；背景图独立放在 `backgrounds/`
- 后台会话存 D1 的 `admin_sessions`，Cookie 里只有随机 token（数据库存 SHA-256）
- 登录失败按 IP 限流：15 分钟最多 10 次

### 媒体接口

`GET /api/media/<key>`：

- `Cache-Control: public, max-age=31536000, immutable`
- 支持 `Range`（音频可拖动进度）
- 支持 `ETag` / `If-None-Match` → 304
- 拒绝 `..`、反斜杠等路径穿越

---

## 5. 常用命令

```bash
npm run dev                 # 本地开发（next dev + 本地 D1/R2 绑定）
npm run build               # Next.js 构建
npm run preview             # OpenNext 构建 + 本地 Worker 预览
npm run deploy              # 构建并部署到 Cloudflare
npm run lint                # TypeScript 类型检查

npm run db:migrate:local    # 本地 D1 迁移
npm run db:migrate:remote   # 线上 D1 迁移
npm run db:studio           # 查看本地表名

npx wrangler d1 execute zag-blog-db --remote --command "SELECT * FROM posts"
npx wrangler r2 object list zag-blog-r2
npx wrangler secret list
```

本地 D1 / R2 模拟数据在 `.wrangler/state`，删掉即可重置。

---

## 6. 安全说明

- `/admin`、`/admin/*`、`/api/*` 配置了 `run_worker_first`，不会被静态资源绕过
- 后台每个页面在服务端校验会话；每个写接口再次校验会话 + 同源
- Cookie：`HttpOnly`、`SameSite=Lax`、生产 `Secure`、7 天过期
- 进入指令：优先使用 D1 里的加盐哈希；没改过时回退到 `ADMIN_ACCESS_CODE`
- Markdown 渲染前先转义所有 HTML，并限制链接协议，避免 XSS
- 上传校验 MIME / 扩展名 / 大小，服务端生成键名
- 删除照片 / 音乐时同步删除 R2 对象

---

## 7. 自定义

- **站点名 / 描述**：`lib/site.ts`
- **导航项**：`lib/site.ts` 的 `NAV_ITEMS`
- **配色 / 玻璃强度 / 动效**：`app/globals.css` 顶部的 CSS 变量（`:root` 与 `.dark`）
- **首页文案 / 关于页**：后台「设置」
- **默认内容 / 数据结构**：`migrations/0001_init.sql`、`migrations/0002_photo_albums.sql`
- **字体**：`app/globals.css` 的 `--font-sans`（默认系统字体，无外部字体请求）

### 绑定自己的域名

在 `wrangler.jsonc` 里写 `routes`，然后重新 deploy 即可（Cloudflare 会自动创建代理 DNS 记录）：

```jsonc
"routes": [
  { "pattern": "zag.zeroa.space", "custom_domain": true }
]
```

也可以在 Cloudflare 控制台给 Worker `zag-blog` 添加 Custom Domain。
当前项目已绑定 `zag.zeroa.space`；`workers.dev` 默认关闭（可选 `"workers_dev": true` 打开）。

---

## 8. 排错

| 现象 | 处理 |
| --- | --- |
| 本地页面报 D1 错误 | 先跑 `npm run db:migrate:local`，确认 `.wrangler/state` 存在 |
| 登录一直提示指令错误 | 检查 `.dev.vars` 是否被读取；或确认是否已在后台改过指令 |
| 忘记进入指令 | 删除 D1 `settings` 表里的 `admin_code_salt` / `admin_code_hash`，回退到环境变量或 Worker secret |
| 上传 401 | 会话过期，重新登录 `/admin` |
| 上传 413 | 文件超过限制（图片 25MB / 音频 60MB） |
| 构建提示缺少 `WORKER_SELF_REFERENCE` | 确认 `wrangler.jsonc` 里的 service binding 名称与 Worker 名称一致 |
| 线上内容不更新 | 页面是动态渲染，检查 D1 remote 是否已迁移、数据是否写到了远程库 |
| 构建提示 `@next/swc-... is not a valid Win32 application` | 当前 Windows 上原生 SWC 绑定不可用；脚本已使用 `--webpack` + WASM 回退，可以正常构建，无需处理 |

---

Made with Next.js, Cloudflare D1/R2, and a little patience.
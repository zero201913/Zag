export const SITE = {
  name: "Zag",
  fullName: "Zag · 玻璃与光",
  description:
    "一个关于代码、设计与日常的数字花园。文章、说说、收藏、项目、照片与音乐。",
  url: "https://zag.blog",
} as const;

export const NAV_ITEMS = [
  { href: "/", label: "首页", en: "Home" },
  { href: "/posts", label: "文章", en: "Posts" },
  { href: "/notes", label: "说说", en: "Notes" },
  { href: "/bookmarks", label: "收藏夹", en: "Bookmarks" },
  { href: "/projects", label: "项目", en: "Projects" },
  { href: "/photos", label: "照片", en: "Photos" },
  { href: "/music", label: "音乐", en: "Music" },
  { href: "/about", label: "关于", en: "About" },
] as const;

export const DEFAULT_SETTINGS = {
  hero_title: "在玻璃与光之间，记录所有热爱",
  hero_subtitle:
    "一个关于代码、设计与日常的数字花园。写文章、收灵感、放照片，也收藏偶尔循环一整晚的歌。",
  about_content:
    "## 你好，我是 Zag\n\n这里是我的个人数字花园。\n\n- **文章**：技术笔记、设计观察、生活碎片\n- **项目**：正在做和做过的东西\n- **收藏夹**：值得反复打开的好网站\n- **照片**：随手拍下的光\n- **音乐**：写作时的背景音",
  footer_tagline: "Built with Next.js · D1 · R2 · 玻璃与一点耐心",
  github_url: "https://github.com/",
  email: "hello@example.com",
} as const;

export type SettingKey = keyof typeof DEFAULT_SETTINGS;
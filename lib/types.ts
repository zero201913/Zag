export type PostStatus = "published" | "draft";

export interface Post {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  cover_url: string | null;
  tags: string;
  status: PostStatus;
  featured: number;
  created_at: number;
  updated_at: number;
}

export type PostSummary = Omit<Post, "content">;

export interface Project {
  id: string;
  name: string;
  description: string;
  url: string;
  repo_url: string | null;
  icon: string;
  tags: string;
  sort_order: number;
  created_at: number;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  created_at: number;
}

export interface Photo {
  id: string;
  title: string;
  description: string;
  r2_key: string;
  width: number | null;
  height: number | null;
  taken_at: number | null;
  created_at: number;
}

export interface Track {
  id: string;
  title: string;
  artist: string;
  album: string;
  r2_key: string;
  cover_key: string | null;
  duration: number | null;
  sort_order: number;
  created_at: number;
}

export interface SiteSettings {
  hero_title: string;
  hero_subtitle: string;
  about_content: string;
  footer_tagline: string;
  github_url: string;
  email: string;
  [key: string]: string;
}

export interface SearchHit {
  type: "post" | "project" | "bookmark" | "photo" | "track";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface BlogStats {
  posts: number;
  projects: number;
  bookmarks: number;
  photos: number;
  tracks: number;
}
-- 说说：没有标题和摘要的短文字
CREATE TABLE IF NOT EXISTS notes (
  id          TEXT PRIMARY KEY,
  content     TEXT NOT NULL,
  created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at  INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_notes_created ON notes(created_at DESC);

INSERT OR IGNORE INTO notes (id, content, created_at, updated_at) VALUES
  ('seed-note-1',
   '把博客的背景换成了 R2 里的花海。玻璃后面终于有了真正的光，而不是代码里画出来的渐变。',
   unixepoch() - 3600, unixepoch() - 3600),
  ('seed-note-2',
   '今天没有写长文，只记一句：界面里的留白和纸上的留白一样，都是给呼吸用的。留白不是空，是让内容有地方停下来。',
   unixepoch() - 86400, unixepoch() - 86400),
  ('seed-note-3',
   '深夜调了一下时间线，把每一条碎念放进一张横着的纸页里。展开和收起，像是在翻一本只有自己看的笔记；写的时候不必想标题，也不必想结构，只要把此刻留下来就好。',
   unixepoch() - 86400 * 3, unixepoch() - 86400 * 3);
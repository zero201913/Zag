import { getCloudflareContext } from "@opennextjs/cloudflare";
import { guardAdmin, parseJsonObject, text } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

const OLLAMA_ENDPOINT = "https://ollama.com/v1/chat/completions";
const OLLAMA_MODEL = "gpt-oss:120b";

interface OllamaResponse {
  choices?: Array<{ message?: { content?: string } }>;
  error?: { message?: string };
}

const EXCERPT_SYSTEM = `你是中文博客的资深编辑。你擅长把技术或生活类文章压缩成准确、自然、克制的一句话摘要。
必须遵守：
- 只输出摘要正文，不要标题、不要引号、不要列表、不要 Markdown 符号
- 使用中文，长度控制在 60-120 个汉字
- 保留文章最有价值的信息，不编造正文没有的内容`;

const TAGS_SYSTEM = `你是中文博客的资深编辑。你擅长为文章提炼精准、可检索的标签。
必须遵守：
- 输出 5-8 个标签，用英文逗号分隔
- 每个标签 2-8 个字或词，中文优先，专有名词可以保留英文
- 只输出标签本身，不要编号、不要 # 号、不要解释、不要换行`;
function cleanExcerpt(raw: string) {
  return raw
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/^(摘要|总结|一句话摘要)\s*[:：]\s*/i, "")
    .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 600);
}

function cleanTags(raw: string) {
  const seen = new Set<string>();
  const tags: string[] = [];
  for (const part of raw.split(/[,，、\n\r]+/)) {
    const tag = part
      .replace(/^[#\s]+/, "")
      .replace(/^["'“”‘’]+|["'“”‘’]+$/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40);
    if (!tag) continue;
    const key = tag.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
    if (tags.length >= 12) break;
  }
  return tags;
}

export async function POST(request: Request) {
  const denied = await guardAdmin(request);
  if (denied) return denied;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json({ error: "请求格式不正确" }, { status: 400 });
  }

  const body = parseJsonObject(raw);
  const task = body.task === "tags" ? "tags" : "excerpt";
  const content = text(body.content, 400000).trim();
  const title = text(body.title, 200).trim();

  if (!content) {
    return Response.json(
      { error: task === "tags" ? "请先输入正文，再生成标签" : "请先输入正文，再生成摘要" },
      { status: 400 },
    );
  }

  const { env } = await getCloudflareContext({ async: true });
  if (!env.OLLAMA_API_KEY) {
    return Response.json(
      { error: "服务端未配置 OLLAMA_API_KEY，请在 .dev.vars 或 Worker secret 中设置。" },
      { status: 500 },
    );
  }

  const instructions =
    task === "tags"
      ? TAGS_SYSTEM
      : EXCERPT_SYSTEM;
  const requestText =
    task === "tags"
      ? `请为下面的文章生成标签。\n\n文章标题：${title || "未命名文章"}\n\n文章正文：\n${content.slice(0, 16000)}`
      : `请为下面的文章生成摘要。\n\n文章标题：${title || "未命名文章"}\n\n文章正文：\n${content.slice(0, 16000)}`;

  try {
    const response = await fetch(OLLAMA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OLLAMA_API_KEY}`,
      },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        temperature: task === "tags" ? 0.2 : 0.4,
        messages: [
          { role: "system", content: instructions },
          { role: "user", content: requestText },
        ],
      }),
      signal: AbortSignal.timeout(60_000),
    });

    if (!response.ok) {
      let detail = "";
      try {
        const data = (await response.json()) as OllamaResponse;
        detail = data?.error?.message ?? "";
      } catch {
        /* ignore non-JSON error bodies */
      }
      console.error("ollama request failed", response.status, detail);
      return Response.json(
        { error: `AI 服务暂时不可用（${response.status}）${detail ? `：${detail}` : ""}` },
        { status: 502 },
      );
    }

    const data = (await response.json()) as OllamaResponse;
    const output = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (!output) {
      return Response.json({ error: "AI 没有返回内容，请稍后再试。" }, { status: 502 });
    }

    if (task === "tags") {
      const tags = cleanTags(output);
      if (!tags.length) {
        return Response.json({ error: "AI 没有生成可用的标签，请稍后再试。" }, { status: 502 });
      }
      return Response.json({ tags });
    }

    const excerpt = cleanExcerpt(output);
    if (!excerpt) {
      return Response.json({ error: "AI 没有生成可用的摘要，请稍后再试。" }, { status: 502 });
    }
    return Response.json({ excerpt });
  } catch (error) {
    console.error("ollama request error", error);
    const message =
      error instanceof Error && error.name === "TimeoutError"
        ? "AI 响应超时，请稍后再试。"
        : "无法连接 AI 服务，请稍后再试。";
    return Response.json({ error: message }, { status: 502 });
  }
}
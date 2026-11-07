import { getCloudflareContext } from "@opennextjs/cloudflare";

export const dynamic = "force-dynamic";

interface RangeInfo {
  offset: number;
  length: number;
  contentRange: string;
}

function parseRange(header: string, total: number): RangeInfo | "invalid" | null {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(header.trim());
  if (!match) return null;
  const [, rawStart, rawEnd] = match;
  if (!rawStart && !rawEnd) return "invalid";

  let start: number;
  let end: number;

  if (!rawStart) {
    const suffix = Number(rawEnd);
    if (!Number.isFinite(suffix) || suffix <= 0) return "invalid";
    start = Math.max(0, total - suffix);
    end = total - 1;
  } else {
    start = Number(rawStart);
    end = rawEnd ? Number(rawEnd) : total - 1;
  }

  if (!Number.isFinite(start) || !Number.isFinite(end)) return "invalid";
  if (start < 0 || start >= total || end < start) return "invalid";
  end = Math.min(end, total - 1);

  return {
    offset: start,
    length: end - start + 1,
    contentRange: `bytes ${start}-${end}/${total}`,
  };
}

async function serve(request: Request, params: Promise<{ key: string[] }>) {
  const { key } = await params;
  let path: string;
  try {
    path = key.map((part) => decodeURIComponent(part)).join("/");
  } catch {
    return new Response("Bad request", { status: 400 });
  }

  if (!path || path.includes("..") || path.includes("\\") || path.startsWith("/")) {
    return new Response("Not found", { status: 404 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const head = await env.BUCKET.head(path);
  if (!head) return new Response("Not found", { status: 404 });

  const etag = head.httpEtag;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { etag } });
  }

  const headers = new Headers();
  head.writeHttpMetadata(headers);
  headers.set("etag", etag);
  headers.set("accept-ranges", "bytes");
  headers.set("cache-control", "public, max-age=31536000, immutable");
  headers.set("vary", "range");
  headers.set("x-content-type-options", "nosniff");

  const rangeHeader = request.headers.get("range");
  if (rangeHeader) {
    const range = parseRange(rangeHeader, head.size);
    if (range === "invalid") {
      return new Response("Range not satisfiable", {
        status: 416,
        headers: { "content-range": `bytes */${head.size}` },
      });
    }
    if (range) {
      const object = await env.BUCKET.get(path, {
        range: { offset: range.offset, length: range.length },
      });
      if (!object) return new Response("Not found", { status: 404 });
      headers.set("content-range", range.contentRange);
      headers.set("content-length", String(range.length));
      if (request.method === "HEAD") {
        return new Response(null, { status: 206, headers });
      }
      return new Response(object.body, { status: 206, headers });
    }
  }

  headers.set("content-length", String(head.size));
  if (request.method === "HEAD") {
    return new Response(null, { status: 200, headers });
  }
  const object = await env.BUCKET.get(path);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { status: 200, headers });
}

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  return serve(request, context.params);
}

export async function HEAD(request: Request, context: { params: Promise<{ key: string[] }> }) {
  return serve(request, context.params);
}
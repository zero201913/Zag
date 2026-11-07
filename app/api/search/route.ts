import { searchAll } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") || "").trim();

  try {
    const results = await searchAll(query);
    return Response.json(
      { results },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("search failed", error);
    return Response.json({ results: [] }, { status: 500 });
  }
}
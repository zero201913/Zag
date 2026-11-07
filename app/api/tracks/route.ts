import { listTracks } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tracks = await listTracks();
    return Response.json(
      { tracks },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("tracks api failed", error);
    return Response.json({ tracks: [] }, { status: 500 });
  }
}
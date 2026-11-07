import { listBackgrounds } from "@/lib/db";
import { mediaUrl } from "@/lib/utils";
import type { BackgroundOption } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backgrounds = await listBackgrounds();
    const result: BackgroundOption[] = backgrounds.map((item) => ({
      id: item.id,
      name: item.name,
      url: mediaUrl(item.r2_key),
    }));
    return Response.json(
      { backgrounds: result },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("backgrounds api failed", error);
    return Response.json({ backgrounds: [] }, { status: 500 });
  }
}
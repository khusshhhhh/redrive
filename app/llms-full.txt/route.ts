import getLandingMarket from "@/app/actions/getLandingMarket";
import { buildLlmsFullTxt } from "@/app/libs/llms";

// Includes the live price bands from the landing pages, so refresh hourly like them.
export const revalidate = 3600;

export async function GET() {
  const market = await getLandingMarket();
  return new Response(buildLlmsFullTxt(market), {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}

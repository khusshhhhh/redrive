import type { Metadata } from "next";
import HelpCentreClient from "./HelpCentreClient";
import { buildSeoMetadata } from "@/app/libs/seo";
import InformationNav from "@/app/components/content/InformationNav";

// Static help content — render as a CDN asset, not a per-request server render.
export const dynamic = "force-static";

export const metadata: Metadata = buildSeoMetadata({
  title: "Redrive Help Centre",
  description: "Get help with Redrive vehicle search, booking requests, licence verification, hosting, handovers, messages and account security.",
  path: "/help-centre",
  keywords: ["Redrive help", "vehicle booking help", "host help", "licence verification help"],
  category: "Customer support",
});

export default function HelpCentrePage() {
  return <main className="information-page min-h-[70vh] bg-white"><InformationNav activeHref="/help-centre" /><HelpCentreClient /></main>;
}

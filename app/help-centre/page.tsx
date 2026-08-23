import type { Metadata } from "next";
import HelpCentreClient from "./HelpCentreClient";
import { buildSeoMetadata } from "@/app/libs/seo";

export const metadata: Metadata = buildSeoMetadata({
  title: "Redrive Help Centre",
  description: "Get help with Redrive vehicle search, booking requests, licence verification, hosting, handovers, messages and account security.",
  path: "/help-centre",
  keywords: ["Redrive help", "vehicle booking help", "host help", "licence verification help"],
  category: "Customer support",
});

export default function HelpCentrePage() {
  return <main className="min-h-[70vh] bg-white"><HelpCentreClient /></main>;
}

import type { Metadata } from "next";
import HelpCentreClient from "./HelpCentreClient";

export const metadata: Metadata = {
  title: "Help Centre",
  description: "Get help with Redrive vehicle search, booking requests, licence verification, hosting, handovers, messages and account security.",
};

export default function HelpCentrePage() {
  return <main className="min-h-[70vh] bg-white"><HelpCentreClient /></main>;
}

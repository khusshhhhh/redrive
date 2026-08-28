import { buildSeoMetadata } from "../libs/seo";
import HostFlow from "./HostFlow";

export const metadata = buildSeoMetadata({
  title: "List your vehicle on Redrive",
  description: "Turn your car, ute, van or campervan into income. Redrive's guided hosting flow walks you through photos, pricing and protection in a few minutes.",
  path: "/host",
  keywords: ["become a host", "list your car Australia", "share your vehicle", "car hosting", "earn with your car"],
  imageAlt: "Start hosting your vehicle on Redrive",
});

export default function HostPage() {
  return <HostFlow />;
}

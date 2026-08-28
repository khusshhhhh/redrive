import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ProfileClient from "./ProfileClient";

// Per-user profile — always rendered per request.
export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");
  return <ProfileClient initialUser={currentUser} />;
}

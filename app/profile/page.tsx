import { redirect } from "next/navigation";
import getCurrentUser from "@/app/actions/getCurrentUser";
import ProfileClient from "./ProfileClient";

export default async function ProfilePage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/");
  return <ProfileClient initialUser={currentUser} />;
}

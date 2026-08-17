import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";

import AdminShell from "@/app/admin/components/AdminShell";
import { getAdminUser } from "@/app/libs/adminAuth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export const metadata: Metadata = { title: "Admin dashboard", robots: { index: false, follow: false, noarchive: true } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) {
    const session = await getServerSession(authOptions);
    redirect(session?.user?.email ? "/admin/login?error=forbidden" : "/admin/login");
  }
  return <AdminShell adminName={admin.name} adminEmail={admin.email}>{children}</AdminShell>;
}

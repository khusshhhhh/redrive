import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import AdminLoginForm from "./AdminLoginForm";
import { getAdminUser } from "@/app/libs/adminAuth";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await getAdminUser()) redirect("/admin");
  return <main className="flex min-h-[calc(100vh-80px)] items-center justify-center bg-surface-soft/55 px-4 py-12"><div className="w-full max-w-md"><p className="mb-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-primary">Redrive operations</p><Suspense><AdminLoginForm /></Suspense></div></main>;
}

import { getServerSession } from "next-auth";

import { authOptions } from "@/pages/api/auth/[...nextauth]";
import prisma from "@/app/libs/prismadb";

function configuredAdminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export async function getAdminUser() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email?.toLowerCase();
  if (!email) return null;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, image: true, role: true },
  });

  if (!user) return null;
  const allowedByEnvironment = configuredAdminEmails().includes(email);
  return user.role === "ADMIN" || allowedByEnvironment ? user : null;
}

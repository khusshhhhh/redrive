import type { Prisma } from "@prisma/client";

import prisma from "@/app/libs/prismadb";

export const mobileUserSelect = {
  id: true,
  email: true,
  name: true,
  emailVerified: true,
  image: true,
  number: true,
  dateOfBirth: true,
  suburb: true,
  state: true,
  postcode: true,
  hobbies: true,
  dreamDestinations: true,
  profileVerified: true,
  licenseStatus: true,
  licenseExpiresAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export type MobileUserRecord = Prisma.UserGetPayload<{ select: typeof mobileUserSelect }>;

export function toMobileUser(user: MobileUserRecord) {
  if (!user.email) throw new Error("A mobile user must have an email address");
  return {
    id: user.id,
    email: user.email,
    name: user.name || "",
    emailVerified: user.emailVerified?.toISOString() || null,
    image: user.image || null,
    number: user.number || null,
    dateOfBirth: user.dateOfBirth || null,
    suburb: user.suburb || null,
    state: user.state || null,
    postcode: user.postcode || null,
    hobbies: user.hobbies,
    dreamDestinations: user.dreamDestinations,
    profileVerified: user.profileVerified || null,
    licenseStatus: user.licenseStatus,
    licenseExpiresAt: user.licenseExpiresAt?.toISOString() || null,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };
}

export async function getMobileUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: mobileUserSelect });
  return user ? toMobileUser(user) : null;
}

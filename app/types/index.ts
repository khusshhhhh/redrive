import { Listing, Reservation, User } from "@prisma/client";

export type SafeListing = Omit<Listing, "createdAt" | "regoImage"> & {
  createdAt: string;
  regoImage: string; // ✅ Ensure regoImage is always a string
  badgeValue?: string;
};

export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  user: SafeUser; // ✅ Ensure user is required
  listing: SafeListing;
};

export type SafeUser = Omit<
  User,
  "createdAt" | "updatedAt" | "emailVerified"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
};

export type SafeMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  createdAt: string;
  sender: SafeUser;
};

export type SafeChat = {
  id: string;
  participantIds: string[];
  createdAt: string;
  messages: SafeMessage[];
  otherUser: SafeUser | null;
};

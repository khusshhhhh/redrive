import { Listing, Reservation, User, Notification, NotificationType } from "@prisma/client";

export type SafeListing = Omit<Listing, "createdAt" | "regoImage" | "instantBook" | "minimumNoticeHours" | "minimumTripDays" | "maximumTripDays" | "preparationBufferHours" | "exactLocationReleaseRule"> & {
  createdAt: string;
  regoImage: string; // ✅ Ensure regoImage is always a string
  badgeValue?: string;
  cleaningFeeOption?: string | null;
  cleaningFeeAmount?: number | null;
  returnCleaningFeeAmount?: number | null;
  instantBook?: boolean;
  minimumNoticeHours?: number;
  minimumTripDays?: number;
  maximumTripDays?: number;
  preparationBufferHours?: number;
  exactLocationReleaseRule?: string;
};

export type SafeReservation = Omit<
  Reservation,
  "createdAt" | "startDate" | "endDate" | "updatedAt" | "quoteSnapshot" | "pricingPolicyVersion" | "paymentStatus" | "cancelledAt" | "cancelledById" | "cancellationReason" | "refundAmount" | "pickupAddressReleasedAt"
> & {
  createdAt: string;
  startDate: string;
  endDate: string;
  user: SafeUser; // ✅ Ensure user is required
  listing: SafeListing;
  status: string;
  updatedAt?: string;
  quoteSnapshot?: unknown;
  pricingPolicyVersion?: string;
  paymentStatus?: string;
  cancelledAt?: string | null;
  cancelledById?: string | null;
  cancellationReason?: string | null;
  refundAmount?: number | null;
  pickupAddressReleasedAt?: string | null;
};

export type SafeUser = Pick<
  User,
  | "id" | "name" | "email" | "number" | "dateOfBirth" | "image" | "favoriteIds"
  | "streetAddress" | "suburb" | "state" | "postcode" | "hobbies"
  | "dreamDestinations" | "licenseImage" | "licenseType"
  | "profileVerified" | "loginOtpEnabled"
> & {
  createdAt: string;
  updatedAt: string;
  emailVerified: string | null;
  lastActiveAt: string | null;
  hasPassword?: boolean;
};

export type PublicHost = Pick<User, "id" | "name" | "image" | "profileVerified" | "suburb" | "state"> & {
  createdAt: string;
  listings?: { createdAt: string }[];
};

// Minimal presence-bearing user info attached to a chat (avatar/name/online
// status) — not the full SafeUser, since chat summaries only need this much.
export type SafeChatUser = {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  lastActiveAt: string | null;
};

export type SafeMessage = {
  id: string;
  chatId: string;
  senderId: string;
  text: string | null;
  imageUrl: string | null;
  readByIds: string[];
  createdAt: string;
};

// Inbox row: one per chat, last message + unread count only. Full message
// history is fetched paginated per-chat (GET /api/chats/[chatId]/messages).
export type SafeChat = {
  id: string;
  createdAt: string;
  updatedAt: string;
  unreadCount: number;
  otherUser: SafeChatUser | null;
  lastMessage: SafeMessage | null;
};

export type SafeNotification = Omit<Notification, "createdAt" | "expiresAt"> & {
  createdAt: string;
  expiresAt?: string | null;
  user?: SafeUser;
};

export { NotificationType };

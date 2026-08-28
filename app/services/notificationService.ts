import prisma from "@/app/libs/prismadb";
import { NotificationType } from "@/app/types";
import { Prisma } from "@prisma/client";

interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Prisma.InputJsonValue;
  actionUrl?: string;
  expiresAt?: Date;
}

class NotificationService {
  async createNotification(params: CreateNotificationParams) {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data || {},
          actionUrl: params.actionUrl ?? null,
          expiresAt: params.expiresAt ?? null,
        },
      });

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
      throw error;
    }
  }

  async createMultipleNotifications(notifications: CreateNotificationParams[]) {
    try {
      const result = await prisma.notification.createMany({
        data: notifications.map(n => ({
          userId: n.userId,
          type: n.type,
          title: n.title,
          message: n.message,
          data: n.data || {},
          actionUrl: n.actionUrl ?? null,
          expiresAt: n.expiresAt ?? null,
        })),
      });

      return result;
    } catch (error) {
      console.error("Error creating multiple notifications:", error);
      throw error;
    }
  }

  async notifyBookingRequest(
    listingOwnerId: string,
    bookerName: string,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.BOOKING_REQUEST,
      title: "New Booking Request",
      message: `${bookerName} has requested to book your ${listingTitle}`,
      data: { reservationId, bookerName, listingTitle },
      actionUrl: `/reservations`,
    });
  }

  async notifyBookingApproved(
    bookerId: string,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_APPROVED,
      title: "Booking Approved! 🎉",
      message: `Your booking for ${listingTitle} has been approved`,
      data: { reservationId, listingTitle },
      actionUrl: `/trips`,
    });
  }

  async notifyBookingDeclined(
    bookerId: string,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_DECLINED,
      title: "Booking Declined",
      message: `Your booking request for ${listingTitle} has been declined`,
      data: { reservationId, listingTitle },
      actionUrl: `/trips`,
    });
  }

  async notifyBookingCancelled(
    userId: string,
    listingTitle: string,
    reservationId: string,
    cancelledBy: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.BOOKING_CANCELLED,
      title: "Booking Cancelled",
      message: `Your booking for ${listingTitle} has been cancelled by ${cancelledBy}`,
      data: { reservationId, listingTitle, cancelledBy },
      actionUrl: `/trips`,
    });
  }

  async notifyBookingReminder(
    bookerId: string,
    listingTitle: string,
    reservationId: string,
    startDate: Date
  ) {
    const daysUntil = Math.ceil((startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_REMINDER,
      title: "Upcoming Trip Reminder",
      message: `Your trip with ${listingTitle} starts in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
      data: { reservationId, listingTitle, startDate, daysUntil },
      actionUrl: `/trips`,
    });
  }

  async notifyBookingCompleted(
    bookerId: string,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.BOOKING_COMPLETED,
      title: "Trip Completed! 🏁",
      message: `Your trip with ${listingTitle} is complete. How was your experience?`,
      data: { reservationId, listingTitle },
      actionUrl: `/review/${reservationId}`,
    });
  }

  async notifyReviewReceived(
    listingOwnerId: string,
    reviewerName: string,
    listingTitle: string,
    rating: number,
    listingId: string
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.REVIEW_RECEIVED,
      title: "New Review Received! ⭐",
      message: `${reviewerName} left a ${rating}-star review for ${listingTitle}`,
      data: { reviewerName, listingTitle, rating, listingId },
      actionUrl: `/listings/${listingId}`,
    });
  }

  async notifyReviewReminder(
    bookerId: string,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId: bookerId,
      type: NotificationType.REVIEW_REMINDER,
      title: "Leave a Review",
      message: `How was your experience with ${listingTitle}? Share your feedback!`,
      data: { listingTitle, reservationId },
      actionUrl: `/review/${reservationId}`,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Expires in 30 days
    });
  }

  async notifyMessageReceived(
    userId: string,
    senderName: string,
    chatId: string,
    messagePreview: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.MESSAGE_RECEIVED,
      title: "New Message",
      message: `${senderName}: ${messagePreview.substring(0, 50)}${messagePreview.length > 50 ? '...' : ''}`,
      data: { senderName, chatId, messagePreview },
      actionUrl: `/messages/${chatId}`,
    });
  }

  async notifyListingFavorited(
    listingOwnerId: string,
    userName: string,
    listingTitle: string,
    listingId: string
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.LISTING_FAVORITED,
      title: "Someone Liked Your Listing! ❤️",
      message: `${userName} added ${listingTitle} to their favorites`,
      data: { userName, listingTitle, listingId },
      actionUrl: `/listings/${listingId}`,
    });
  }

  async notifyListingUpdated(
    listingOwnerId: string,
    listingTitle: string,
    listingId: string
  ) {
    return this.createNotification({
      userId: listingOwnerId,
      type: NotificationType.LISTING_UPDATED,
      title: "Listing Updated",
      message: `Your listing ${listingTitle} has been successfully updated`,
      data: { listingTitle, listingId },
      actionUrl: `/listings/${listingId}`,
    });
  }

  async notifyProfileVerified(
    userId: string,
    verificationStatus: string
  ) {
    const isVerified = verificationStatus === "Y";
    
    return this.createNotification({
      userId,
      type: NotificationType.PROFILE_VERIFIED,
      title: isVerified ? "Profile Verified! ✅" : "Profile Verification Required",
      message: isVerified 
        ? "Your profile has been successfully verified"
        : "Additional information is required to verify your profile",
      data: { verificationStatus },
      actionUrl: `/profile`,
    });
  }

  async notifyPaymentReceived(
    userId: string,
    amount: number,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT_RECEIVED,
      title: "Payment Received! 💰",
      message: `You received $${amount} for ${listingTitle}`,
      data: { amount, listingTitle, reservationId },
      actionUrl: `/properties`,
    });
  }

  async notifyPaymentRequired(
    userId: string,
    amount: number,
    listingTitle: string,
    reservationId: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.PAYMENT_REQUIRED,
      title: "Payment Required",
      message: `Payment of $${amount} is required for ${listingTitle}`,
      data: { amount, listingTitle, reservationId },
      actionUrl: `/trips`,
    });
  }

  async notifySystemUpdate(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.SYSTEM_UPDATE,
      title,
      message,
      actionUrl,
    });
  }

  async notifySecurityAlert(
    userId: string,
    title: string,
    message: string,
    actionUrl?: string
  ) {
    return this.createNotification({
      userId,
      type: NotificationType.SECURITY_ALERT,
      title,
      message,
      actionUrl,
    });
  }

  async cleanupExpiredNotifications() {
    try {
      const result = await prisma.notification.deleteMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
        },
      });

      console.log(`Cleaned up ${result.count} expired notifications`);
      return result;
    } catch (error) {
      console.error("Error cleaning up expired notifications:", error);
      throw error;
    }
  }
}

export const notificationService = new NotificationService();

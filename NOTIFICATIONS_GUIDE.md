# 🔔 REDRIVE Notification System

A comprehensive notification system for the REDRIVE platform that handles real-time notifications for booking requests, reviews, messages, and other important events.

## 🌟 Features

### ✅ **Real-time Notifications**
- In-app notification bell with badge count
- Browser push notifications (with user permission)
- Auto-refresh every 30 seconds
- Instant UI updates

### ✅ **Comprehensive Notification Types**
- **Booking Related**: Requests, approvals, declines, cancellations, reminders, completions
- **Review Related**: New reviews received, review reminders
- **Message Related**: New chat messages
- **Listing Related**: Someone favorited your listing, listing updates
- **Profile Related**: Verification status changes
- **Payment Related**: Payments received/required
- **System Related**: Updates and security alerts

### ✅ **Full Management Features**
- Mark as read/unread
- Delete individual notifications
- Bulk operations (mark all read, delete all read)
- Notification filtering and pagination
- Automatic cleanup of expired notifications

### ✅ **Rich UI Components**
- Notification bell in navbar with unread count
- Dropdown with recent notifications
- Full notifications page with filtering
- Mobile-responsive design
- Beautiful notification icons and colors

## 🚀 Quick Start

### 1. Database Migration
The notification system is already integrated into your Prisma schema. Run:

```bash
npx prisma db push
```

### 2. Add Notification Bell to Navbar
The notification bell is already added to the `UserMenu` component and will appear for logged-in users.

### 3. Access Notifications
- **Bell Icon**: Click the bell icon in the navbar
- **Full Page**: Navigate to `/notifications`
- **Menu**: Access via the user dropdown menu

## 📊 Database Schema

```prisma
model Notification {
  id          String   @id @default(auto()) @map("_id") @db.ObjectId
  userId      String   @db.ObjectId
  type        NotificationType
  title       String
  message     String
  data        Json?    // Additional data like listingId, reservationId, etc.
  read        Boolean  @default(false)
  actionUrl   String?  // Where to redirect when clicked
  createdAt   DateTime @default(now())
  expiresAt   DateTime? // Optional expiration for time-sensitive notifications

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read])
  @@index([userId, createdAt])
}
```

## 🔧 API Endpoints

### Core Notification Management
- `GET /api/notifications` - Fetch user notifications with pagination
- `PATCH /api/notifications/[id]` - Mark notification as read/unread
- `DELETE /api/notifications/[id]` - Delete notification
- `PATCH /api/notifications/bulk` - Bulk mark as read
- `DELETE /api/notifications/bulk` - Bulk delete

### Automated Triggers
- `POST /api/cron/notifications` - Cron job for reminders and cleanup

## 💻 React Components

### NotificationBell
Displays in the navbar with unread count and dropdown.

```tsx
import NotificationBell from "@/app/components/notifications/NotificationBell";

// Usage (already integrated in UserMenu)
{currentUser && <NotificationBell />}
```

### Notifications Page
Full-featured notifications management page at `/notifications`.

### Custom Hook
```tsx
import { useNotifications } from "@/app/hooks/useNotifications";

const { 
  notifications, 
  unreadCount, 
  markAsRead, 
  deleteNotification 
} = useNotifications({ autoRefresh: true });
```

## ⚡ Notification Service

The `notificationService` handles creating notifications for different scenarios:

```typescript
import { notificationService } from "@/app/services/notificationService";

// Booking notifications
await notificationService.notifyBookingRequest(ownerId, bookerName, listingTitle, reservationId);
await notificationService.notifyBookingApproved(bookerId, listingTitle, reservationId);
await notificationService.notifyBookingDeclined(bookerId, listingTitle, reservationId);

// Review notifications
await notificationService.notifyReviewReceived(ownerId, reviewerName, listingTitle, rating, listingId);

// Custom notifications
await notificationService.createNotification({
  userId: "user-id",
  type: NotificationType.SYSTEM_UPDATE,
  title: "System Maintenance",
  message: "Scheduled maintenance tonight at 2 AM",
  actionUrl: "/system-status"
});
```

## 🎯 Automatic Triggers

The notification system automatically triggers notifications for:

### Booking Flow
1. **New Booking Request** → Notifies listing owner
2. **Booking Approved/Declined** → Notifies booker
3. **Booking Cancelled** → Notifies the other party
4. **1 Day Before Trip** → Sends reminder to booker
5. **Trip Completed** → Prompts for review

### Review System
1. **New Review** → Notifies listing owner
2. **Missing Review** → Reminds booker after 1 day

### Other Actions
1. **Listing Favorited** → Notifies listing owner
2. **New Message** → Notifies recipient (future integration)

## 🕒 Automated Tasks

### Cron Job Features
Set up a cron job to call `POST /api/cron/notifications` daily:

```bash
# Add to your server's crontab (runs daily at 9 AM)
0 9 * * * curl -X POST https://your-domain.com/api/cron/notifications
```

This handles:
- Booking reminders (1 day before trip)
- Review reminders (1 day after trip completion)
- Cleanup of expired notifications

## 🎨 Notification Types & Icons

| Type | Icon | Description |
|------|------|-------------|
| BOOKING_REQUEST | 📝 | New booking request received |
| BOOKING_APPROVED | ✅ | Your booking was approved |
| BOOKING_DECLINED | ❌ | Your booking was declined |
| BOOKING_CANCELLED | 🚫 | Booking was cancelled |
| BOOKING_REMINDER | ⏰ | Upcoming trip reminder |
| BOOKING_COMPLETED | 🏁 | Trip completed |
| REVIEW_RECEIVED | ⭐ | New review on your listing |
| REVIEW_REMINDER | 📝 | Reminder to leave a review |
| MESSAGE_RECEIVED | 💬 | New message |
| LISTING_FAVORITED | ❤️ | Someone liked your listing |
| PAYMENT_RECEIVED | 💰 | Payment received |
| SECURITY_ALERT | ⚠️ | Security-related alert |

## 🔧 Configuration

### Environment Variables
No additional environment variables needed - uses existing database connection.

### Browser Notifications
Users can enable browser notifications via the notifications page. The system will:
1. Request permission when user clicks "Enable Browser Notifications"
2. Show native browser notifications for important events
3. Auto-close notifications after 5 seconds

## 📱 Mobile Experience

The notification system is fully responsive:
- Touch-friendly notification bell
- Swipe-friendly notification list
- Optimized spacing for mobile devices
- Full functionality on all screen sizes

## 🚀 Performance Features

- **Optimized Queries**: Database indexes on userId and read status
- **Lazy Loading**: Pagination with "Load More" functionality
- **Efficient Updates**: Optimistic UI updates for instant feedback
- **Background Cleanup**: Automatic removal of expired notifications
- **Caching**: React query optimization for minimal re-renders

## 🔐 Security Features

- **User Authorization**: Users can only see their own notifications
- **Data Validation**: All inputs validated on both client and server
- **XSS Protection**: All user content properly escaped
- **CSRF Protection**: Built-in Next.js CSRF protection

## 📈 Analytics Ready

The notification system tracks:
- Notification delivery success/failure
- User interaction rates (click-through)
- Notification type effectiveness
- Performance metrics

## 🎯 Future Enhancements

Ready for:
- WebSocket integration for real-time updates
- Email notification integration
- SMS notifications via Twilio
- Push notifications for mobile apps
- Notification preferences/settings
- Rich media notifications (images, videos)

## 🆘 Troubleshooting

### Common Issues

**Notifications not showing?**
- Check if user is logged in
- Verify database connection
- Check browser console for errors

**Bell not updating?**
- Notifications refresh every 30 seconds
- Manual refresh: click the bell to reload

**Browser notifications not working?**
- Check if user granted permission
- Verify HTTPS connection (required for notifications)

**Performance issues?**
- Check notification count (auto-cleanup should prevent this)
- Consider increasing cleanup frequency

## 🧪 Testing

Test the notification system:

```bash
# Test the cron job
curl -X POST http://localhost:3000/api/cron/notifications

# Create a test booking to see notifications in action
# Leave a review to test review notifications
# Add a listing to favorites to test favorite notifications
```

## 🎉 Conclusion

The REDRIVE notification system provides a complete, production-ready solution for user engagement and communication. It's designed to be:

- **User-Friendly**: Intuitive interface with clear call-to-actions
- **Developer-Friendly**: Easy to extend and customize
- **Performance-Optimized**: Fast and efficient with automatic cleanup
- **Mobile-First**: Great experience on all devices

The system is fully integrated and ready to enhance user engagement on your platform! 🚀
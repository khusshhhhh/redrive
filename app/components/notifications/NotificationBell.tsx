"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2 } from "lucide-react";
import { useNotifications } from "@/app/hooks/useNotifications";
import { useRouter } from "next/navigation";
import { SafeNotification, NotificationType } from "@/app/types";
import { formatDistanceToNow } from "date-fns";

const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ autoRefresh: true, refreshInterval: 30000 });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get notification icon based on type
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOKING_REQUEST:
        return "📝";
      case NotificationType.BOOKING_APPROVED:
        return "✅";
      case NotificationType.BOOKING_DECLINED:
        return "❌";
      case NotificationType.BOOKING_CANCELLED:
        return "🚫";
      case NotificationType.BOOKING_REMINDER:
        return "⏰";
      case NotificationType.BOOKING_COMPLETED:
        return "🏁";
      case NotificationType.REVIEW_RECEIVED:
        return "⭐";
      case NotificationType.REVIEW_REMINDER:
        return "📝";
      case NotificationType.MESSAGE_RECEIVED:
        return "💬";
      case NotificationType.LISTING_FAVORITED:
        return "❤️";
      case NotificationType.LISTING_UPDATED:
        return "📝";
      case NotificationType.PROFILE_VERIFIED:
        return "✅";
      case NotificationType.PAYMENT_RECEIVED:
        return "💰";
      case NotificationType.PAYMENT_REQUIRED:
        return "💳";
      case NotificationType.SYSTEM_UPDATE:
        return "🔔";
      case NotificationType.SECURITY_ALERT:
        return "⚠️";
      default:
        return "🔔";
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case NotificationType.BOOKING_APPROVED:
      case NotificationType.PAYMENT_RECEIVED:
      case NotificationType.PROFILE_VERIFIED:
        return "text-green-600";
      case NotificationType.BOOKING_DECLINED:
      case NotificationType.BOOKING_CANCELLED:
      case NotificationType.SECURITY_ALERT:
        return "text-red-600";
      case NotificationType.BOOKING_REMINDER:
      case NotificationType.PAYMENT_REQUIRED:
        return "text-yellow-600";
      case NotificationType.REVIEW_RECEIVED:
      case NotificationType.LISTING_FAVORITED:
        return "text-ink";
      default:
        return "text-muted";
    }
  };

  const handleNotificationClick = async (notification: SafeNotification) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate to action URL if provided
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      setIsOpen(false);
    }
  };

  const handleMarkAsRead = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await markAsRead(notificationId);
  };

  const handleDelete = async (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation();
    await deleteNotification(notificationId);
  };

  const recentNotifications = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon with Badge */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-ink hover:text-muted transition-colors duration-200"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-card border border-hairline-soft z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-hairline-soft">
            <h3 className="font-semibold text-ink">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-ink hover:underline flex items-center gap-1"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-muted">
                Loading notifications...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-muted">
                <Bell size={48} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm">We&apos;ll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-hairline-soft">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-surface-soft cursor-pointer transition-colors duration-200 ${
                      !notification.read ? "bg-surface-soft" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`flex-shrink-0 text-lg ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? "text-ink" : "text-body"
                            }`}>
                              {notification.title}
                            </p>
                            <p className={`text-sm mt-1 ${
                              !notification.read ? "text-body" : "text-muted"
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-muted-soft mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => handleMarkAsRead(e, notification.id)}
                                className="p-1 text-muted hover:text-ink rounded"
                                title="Mark as read"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, notification.id)}
                              className="p-1 text-muted hover:text-error rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Read indicator */}
                        {!notification.read && (
                          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>


        </div>
      )}
    </div>
  );
};

export default NotificationBell;
"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Trash2 } from "lucide-react";
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
        return "text-blue-600";
      default:
        return "text-gray-600";
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
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors duration-200"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <CheckCheck size={16} />
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">
                Loading notifications...
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell size={48} className="mx-auto mb-2 opacity-50" />
                <p>No notifications yet</p>
                <p className="text-sm">We'll notify you when something happens</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors duration-200 ${
                      !notification.read ? "bg-blue-50" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 text-lg">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${
                              !notification.read ? "text-gray-900" : "text-gray-700"
                            }`}>
                              {notification.title}
                            </p>
                            <p className={`text-sm mt-1 ${
                              !notification.read ? "text-gray-700" : "text-gray-500"
                            }`}>
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-400 mt-2">
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </p>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 ml-2">
                            {!notification.read && (
                              <button
                                onClick={(e) => handleMarkAsRead(e, notification.id)}
                                className="p-1 text-gray-400 hover:text-blue-600 rounded"
                                title="Mark as read"
                              >
                                <Check size={14} />
                              </button>
                            )}
                            <button
                              onClick={(e) => handleDelete(e, notification.id)}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>

                        {/* Read indicator */}
                        {!notification.read && (
                          <div className="absolute left-2 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 5 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  router.push("/notifications");
                  setIsOpen(false);
                }}
                className="w-full text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
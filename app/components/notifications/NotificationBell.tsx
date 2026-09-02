"use client";

import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  FileText,
  CircleCheck,
  CircleX,
  Ban,
  AlarmClock,
  Flag,
  Star,
  MessageSquare,
  Heart,
  PencilLine,
  ShieldCheck,
  Wallet,
  CreditCard,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
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
    error,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  } = useNotifications({ autoRefresh: true, detailedRefresh: isOpen });

  const toggleNotifications = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) void refresh();
  };

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

  // Monochrome line icon per notification type.
  const getNotificationIcon = (type: NotificationType): LucideIcon => {
    switch (type) {
      case NotificationType.BOOKING_REQUEST:
        return FileText;
      case NotificationType.BOOKING_APPROVED:
      case NotificationType.PROFILE_VERIFIED:
        return CircleCheck;
      case NotificationType.BOOKING_DECLINED:
        return CircleX;
      case NotificationType.BOOKING_CANCELLED:
        return Ban;
      case NotificationType.BOOKING_REMINDER:
        return AlarmClock;
      case NotificationType.BOOKING_COMPLETED:
        return Flag;
      case NotificationType.REVIEW_RECEIVED:
        return Star;
      case NotificationType.REVIEW_REMINDER:
      case NotificationType.LISTING_UPDATED:
        return PencilLine;
      case NotificationType.MESSAGE_RECEIVED:
        return MessageSquare;
      case NotificationType.LISTING_FAVORITED:
        return Heart;
      case NotificationType.PAYMENT_RECEIVED:
        return Wallet;
      case NotificationType.PAYMENT_REQUIRED:
        return CreditCard;
      case NotificationType.SECURITY_ALERT:
        return TriangleAlert;
      case NotificationType.SYSTEM_UPDATE:
        return ShieldCheck;
      default:
        return Bell;
    }
  };

  const handleNotificationClick = async (notification: SafeNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

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
        onClick={toggleNotifications}
        aria-label={unreadCount ? `Notifications, ${unreadCount} unread` : "Notifications"}
        aria-expanded={isOpen}
        className="relative rounded-full p-2 text-ink transition hover:bg-surface-soft hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <Bell size={24} />
        {unreadCount > 0 && (
          <span className="notification-badge absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-white ring-2 ring-white" aria-live="polite">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="notification-panel fixed inset-x-4 top-[64px] z-[70] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-md border border-hairline-soft bg-white shadow-card md:absolute md:inset-x-auto md:right-0 md:top-auto md:mt-2 md:w-[min(22rem,calc(100vw-2rem))] md:max-h-[32rem]">
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
            ) : error ? (
              <div className="p-6 text-center">
                <Bell size={34} className="mx-auto text-muted" />
                <p className="mt-3 text-sm font-semibold text-ink">Notifications could not load</p>
                <p className="mt-1 text-xs leading-5 text-muted">Check your connection, then try again.</p>
                <button type="button" onClick={() => void refresh()} className="mt-4 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white transition hover:bg-primary-active">Try again</button>
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
                    className={`relative cursor-pointer p-4 pl-5 transition-colors duration-200 hover:bg-surface-soft ${
                      !notification.read ? "bg-surface-soft" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      {(() => {
                        const Icon = getNotificationIcon(notification.type);
                        return (
                          <span
                            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border bg-white ${
                              notification.read
                                ? "border-hairline text-muted"
                                : "border-border-strong text-ink"
                            }`}
                          >
                            <Icon size={17} aria-hidden="true" />
                          </span>
                        );
                      })()}

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

"use client";

import { useState } from "react";
import { Bell, Filter, Check, CheckCheck, Trash2, Settings } from "lucide-react";
import { useNotifications } from "@/app/hooks/useNotifications";
import { SafeNotification, NotificationType } from "@/app/types";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import Container from "@/app/components/Container";
import Heading from "@/app/components/Heading";

const NotificationsPage = () => {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [selectedType, setSelectedType] = useState<NotificationType | "all">("all");
  const [selectedNotifications, setSelectedNotifications] = useState<string[]>([]);
  
  const router = useRouter();

  const {
    notifications,
    unreadCount,
    totalCount,
    loading,
    hasMore,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    loadMore,
    requestNotificationPermission,
  } = useNotifications({ autoRefresh: true });

  // Filter notifications based on current filters
  const filteredNotifications = notifications.filter(notification => {
    if (filter === "unread" && notification.read) return false;
    if (filter === "read" && !notification.read) return false;
    if (selectedType !== "all" && notification.type !== selectedType) return false;
    return true;
  });

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

  const handleNotificationClick = async (notification: SafeNotification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleSelectNotification = (notificationId: string) => {
    setSelectedNotifications(prev => 
      prev.includes(notificationId)
        ? prev.filter(id => id !== notificationId)
        : [...prev, notificationId]
    );
  };

  const handleSelectAll = () => {
    if (selectedNotifications.length === filteredNotifications.length) {
      setSelectedNotifications([]);
    } else {
      setSelectedNotifications(filteredNotifications.map(n => n.id));
    }
  };

  const handleBulkMarkAsRead = async () => {
    const promises = selectedNotifications
      .filter(id => {
        const notification = notifications.find(n => n.id === id);
        return notification && !notification.read;
      })
      .map(id => markAsRead(id));
    
    await Promise.all(promises);
    setSelectedNotifications([]);
  };

  const handleBulkDelete = async () => {
    const promises = selectedNotifications.map(id => deleteNotification(id));
    await Promise.all(promises);
    setSelectedNotifications([]);
  };

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission();
    if (granted) {
      alert("Browser notifications enabled!");
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <Container>
        <div className="pt-24 pb-8">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          </div>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      <div className="pt-24 pb-8">
        {/* Header */}
        <div className="mb-8">
          <Heading
            title="Notifications"
            subtitle={`${totalCount} total notifications, ${unreadCount} unread`}
          />
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Filters */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-gray-500" />
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value as "all" | "unread" | "read")}
                    className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                  >
                    <option value="all">All notifications</option>
                    <option value="unread">Unread only</option>
                    <option value="read">Read only</option>
                  </select>
                </div>

                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value as NotificationType | "all")}
                  className="border border-gray-300 rounded-md px-3 py-1 text-sm"
                >
                  <option value="all">All types</option>
                  <option value={NotificationType.BOOKING_REQUEST}>Booking Requests</option>
                  <option value={NotificationType.BOOKING_APPROVED}>Booking Approved</option>
                  <option value={NotificationType.BOOKING_DECLINED}>Booking Declined</option>
                  <option value={NotificationType.REVIEW_RECEIVED}>Reviews</option>
                  <option value={NotificationType.MESSAGE_RECEIVED}>Messages</option>
                  <option value={NotificationType.PAYMENT_RECEIVED}>Payments</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={enableNotifications}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                >
                  <Settings size={14} />
                  Enable Browser Notifications
                </button>

                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-1"
                  >
                    <CheckCheck size={14} />
                    Mark All Read
                  </button>
                )}

                <button
                  onClick={deleteAllRead}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Clear Read
                </button>
              </div>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedNotifications.length > 0 && (
            <div className="p-4 bg-blue-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-blue-700">
                  {selectedNotifications.length} notification{selectedNotifications.length !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBulkMarkAsRead}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Mark as Read
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Delete
                  </button>
                  <button
                    onClick={() => setSelectedNotifications([])}
                    className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Select All */}
          {filteredNotifications.length > 0 && (
            <div className="p-4 border-b border-gray-200">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedNotifications.length === filteredNotifications.length && filteredNotifications.length > 0}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-600">
                  Select all {filteredNotifications.length} notifications
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Notifications List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center">
              <Bell size={48} className="mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === "unread" ? "No unread notifications" : "No notifications"}
              </h3>
              <p className="text-gray-500">
                {filter === "unread" 
                  ? "You're all caught up! Check back later for new notifications."
                  : "We'll notify you when something important happens."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-6 hover:bg-gray-50 transition-colors duration-200 ${
                    !notification.read ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedNotifications.includes(notification.id)}
                      onChange={() => handleSelectNotification(notification.id)}
                      className="mt-1 rounded border-gray-300"
                    />

                    {/* Icon */}
                    <div className="flex-shrink-0 text-2xl">
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div 
                      className="flex-1 cursor-pointer"
                      onClick={() => handleNotificationClick(notification)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className={`text-lg font-medium ${
                            !notification.read ? "text-gray-900" : "text-gray-700"
                          }`}>
                            {notification.title}
                          </h3>
                          <p className={`mt-1 ${
                            !notification.read ? "text-gray-700" : "text-gray-500"
                          }`}>
                            {notification.message}
                          </p>
                          <p className="text-sm text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>

                        {/* Status indicator */}
                        {!notification.read && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full ml-4"></div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {!notification.read && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.id);
                          }}
                          className="p-2 text-gray-400 hover:text-blue-600 rounded-full hover:bg-blue-100"
                          title="Mark as read"
                        >
                          <Check size={16} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        className="p-2 text-gray-400 hover:text-red-600 rounded-full hover:bg-red-100"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="p-6 border-t border-gray-200 text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      </div>
    </Container>
  );
};

export default NotificationsPage;
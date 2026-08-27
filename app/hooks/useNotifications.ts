import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { SafeNotification } from "@/app/types";
import { toast } from "@/app/libs/toast";

const getErrorMessage = (error: unknown, fallback: string): string => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.error || fallback;
  }
  return fallback;
};

interface NotificationResponse {
  notifications: SafeNotification[];
  totalCount: number;
  unreadCount: number;
  hasMore: boolean;
}

interface UseNotificationsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export const useNotifications = ({ 
  autoRefresh = false, 
  refreshInterval = 30000 
}: UseNotificationsProps = {}) => {
  const [notifications, setNotifications] = useState<SafeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async (
    unreadOnly = false,
    limit = 20,
    offset = 0,
    append = false
  ) => {
    try {
      if (!hasLoadedRef.current) setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (unreadOnly) {
        params.append("unread", "true");
      }

      const response = await axios.get(`/api/notifications?${params}`);
      const data: NotificationResponse = response.data;

      if (append) {
        setNotifications(prev => [...prev, ...data.notifications]);
      } else {
        setNotifications(data.notifications);
      }

      setUnreadCount(data.unreadCount);
      setTotalCount(data.totalCount);
      setHasMore(data.hasMore);
      hasLoadedRef.current = true;
    } catch (error) {
      console.error("Error fetching notifications:", error);
      setError(getErrorMessage(error, "Failed to fetch notifications"));
    } finally {
      setLoading(false);
    }
  }, []);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await axios.patch(`/api/notifications/${notificationId}`, { read: true });
      
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );

      setUnreadCount(prev => Math.max(0, prev - 1));
      
      return true;
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
      return false;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    try {
      await axios.patch("/api/notifications/bulk", { 
        notificationIds: [], 
        action: "markAllRead" 
      });

      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
      setUnreadCount(0);

      toast.success("All notifications marked as read");
      return true;
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all notifications as read");
      return false;
    }
  }, []);

  // Delete notification
  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      await axios.delete(`/api/notifications/${notificationId}`);
      
      const deletedNotification = notifications.find(n => n.id === notificationId);
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotalCount(prev => prev - 1);
      
      if (deletedNotification && !deletedNotification.read) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }

      return true;
    } catch (error) {
      console.error("Error deleting notification:", error);
      toast.error("Failed to delete notification");
      return false;
    }
  }, [notifications]);

  // Delete all read notifications
  const deleteAllRead = useCallback(async () => {
    try {
      await axios.delete("/api/notifications/bulk", {
        data: { action: "deleteRead" }
      });

      setNotifications(prev => prev.filter(n => !n.read));
      
      const readCount = notifications.filter(n => n.read).length;
      setTotalCount(prev => prev - readCount);

      toast.success("All read notifications deleted");
      return true;
    } catch (error) {
      console.error("Error deleting read notifications:", error);
      toast.error("Failed to delete read notifications");
      return false;
    }
  }, [notifications]);

  // Load more notifications (for pagination)
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false, 20, notifications.length, true);
    }
  }, [loading, hasMore, notifications.length, fetchNotifications]);

  // Get unread notifications only
  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  // Get notifications by type
  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  // Request browser notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission === "denied") {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === "granted";
  }, []);

  // Show browser notification
  const showBrowserNotification = useCallback(async (
    title: string,
    options?: NotificationOptions
  ) => {
    const hasPermission = await requestNotificationPermission();
    
    if (hasPermission) {
      const notification = new Notification(title, {
        icon: "/favicon.png",
        badge: "/favicon.png",
        ...options,
      });

      // Auto close after 5 seconds
      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    
    return null;
  }, [requestNotificationPermission]);

  // Initial load
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchNotifications();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchNotifications]);

  useEffect(() => {
    if (!autoRefresh) return;
    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void fetchNotifications();
    };
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);
    return () => {
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [autoRefresh, fetchNotifications]);

  useEffect(() => {
    const refreshFromAppEvent = () => void fetchNotifications();
    window.addEventListener("redrive:notifications", refreshFromAppEvent);
    return () => window.removeEventListener("redrive:notifications", refreshFromAppEvent);
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    totalCount,
    hasMore,
    loading,
    error,
    
    // Actions
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    loadMore,
    
    // Getters
    getUnreadNotifications,
    getNotificationsByType,
    
    // Browser notifications
    requestNotificationPermission,
    showBrowserNotification,
    
    // Refresh
    refresh: () => fetchNotifications(),
  };
};

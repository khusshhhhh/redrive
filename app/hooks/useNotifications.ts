import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { SafeNotification } from "@/app/types";
import { toast } from "@/app/libs/toast";
import { clientLog } from "@/app/libs/clientLog";

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
  /** While the panel is open the poll fetches rows; closed, it fetches a count. */
  detailedRefresh?: boolean;
}

export const useNotifications = ({
  autoRefresh = false,
  refreshInterval = 60000,
  detailedRefresh = false,
}: UseNotificationsProps = {}) => {
  const [notifications, setNotifications] = useState<SafeNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const fetchNotifications = useCallback(async (
    unreadOnly = false,
    limit = 20,
    offset = 0,
    append = false,
    countOnly = false,
  ) => {
    try {
      if (!hasLoadedRef.current && !countOnly) setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString(),
      });

      if (unreadOnly) {
        params.append("unread", "true");
      }
      if (countOnly) {
        params.append("countOnly", "true");
      }

      const response = await axios.get(`/api/notifications?${params}`);
      const data: NotificationResponse = response.data;

      // A count-only reply carries no rows, so the list already on screen has
      // to be left alone rather than replaced with an empty one.
      if (!countOnly) {
        if (append) {
          setNotifications(prev => [...prev, ...data.notifications]);
        } else {
          setNotifications(data.notifications);
        }
        setTotalCount(data.totalCount);
        setHasMore(data.hasMore);
        hasLoadedRef.current = true;
      }

      setUnreadCount(data.unreadCount);
    } catch (error) {
      clientLog.error("Error fetching notifications", error);
      setError(getErrorMessage(error, "Failed to fetch notifications"));
    } finally {
      setLoading(false);
    }
  }, []);

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
      clientLog.error("Error marking notification as read", error);
      toast.error("Failed to mark notification as read");
      return false;
    }
  }, []);

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
      clientLog.error("Error marking all notifications as read", error);
      toast.error("Failed to mark all notifications as read");
      return false;
    }
  }, []);

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
      clientLog.error("Error deleting notification", error);
      toast.error("Failed to delete notification");
      return false;
    }
  }, [notifications]);

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
      clientLog.error("Error deleting read notifications", error);
      toast.error("Failed to delete read notifications");
      return false;
    }
  }, [notifications]);

  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchNotifications(false, 20, notifications.length, true);
    }
  }, [loading, hasMore, notifications.length, fetchNotifications]);

  const getUnreadNotifications = useCallback(() => {
    return notifications.filter(n => !n.read);
  }, [notifications]);

  const getNotificationsByType = useCallback((type: string) => {
    return notifications.filter(n => n.type === type);
  }, [notifications]);

  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
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

      setTimeout(() => {
        notification.close();
      }, 5000);

      return notification;
    }
    
    return null;
  }, [requestNotificationPermission]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto refresh. A background tab has nobody looking at the badge, so the
  // timer stops while the page is hidden and catches up on the way back.
  useEffect(() => {
    if (!autoRefresh) return;

    let interval: number | undefined;
    let lastPoll = 0;

    const pollCount = () => {
      lastPoll = Date.now();
      void fetchNotifications(false, 20, 0, false, !detailedRefresh);
    };

    const start = () => {
      if (interval) return;
      interval = window.setInterval(pollCount, refreshInterval);
    };

    const stop = () => {
      if (!interval) return;
      window.clearInterval(interval);
      interval = undefined;
    };

    // focus and visibilitychange both fire when a tab is brought forward, so
    // the second one within a second is dropped rather than polled twice.
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        stop();
        return;
      }
      if (Date.now() - lastPoll >= 1_000) pollCount();
      start();
    };

    if (document.visibilityState === "visible") start();
    window.addEventListener("focus", onVisible);
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      stop();
      window.removeEventListener("focus", onVisible);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [autoRefresh, refreshInterval, detailedRefresh, fetchNotifications]);

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
    
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllRead,
    loadMore,
    
    getUnreadNotifications,
    getNotificationsByType,
    
    requestNotificationPermission,
    showBrowserNotification,
    
    refresh: () => fetchNotifications(),
  };
};

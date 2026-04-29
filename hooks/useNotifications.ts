"use client";

import { useEffect, useState } from "react";
import { humanizeErrorMessage } from "@/lib/errors";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  severity: "info" | "warning" | "error" | "success";
  createdAt: string;
  href?: string;
}

interface NotificationsPayload {
  unreadCount: number;
  items: NotificationItem[];
}

export function useNotifications(pollInterval = 30000) {
  const [data, setData] = useState<NotificationsPayload>({
    unreadCount: 0,
    items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await fetch("/api/notifications", { cache: "no-store" });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.reason || payload.error || "Failed to load notifications");
        }

        if (payload.success) {
          setData(payload.data);
          setError(null);
        }
      } catch (caughtError) {
        setError(humanizeErrorMessage(caughtError));
      } finally {
        setLoading(false);
      }
    };

    void fetchNotifications();
    const interval = setInterval(() => {
      void fetchNotifications();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [pollInterval]);

  return { data, loading, error };
}

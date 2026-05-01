"use client";

import { useState, useEffect, useCallback } from "react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  priceMonthlyINR: number;
  priceMonthlyUSD: number;
  priceYearlyINR: number;
  priceYearlyUSD: number;
  features: string;
  maxProjects: number;
  maxKeywords: number;
  maxAiCallsPerDay: number;
  maxTeamMembers: number;
}

interface Subscription {
  id: string;
  gateway: string;
  status: string;
  currency: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  plan: Plan;
}

interface UsageStats {
  projectsCount: number;
  keywordsCount: number;
  projectsLimit: number;
  keywordsLimit: number;
  aiCallsLimit: number;
  teamMembersCount: number;
  teamMembersLimit: number;
}

interface PaymentRecord {
  id: string;
  gateway: string;
  gatewayPaymentId: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod?: string | null;
  createdAt: string;
  receiptUrl?: string | null;
}

interface SubscriptionData {
  subscription: Subscription | null;
  usage: UsageStats;
  payments: PaymentRecord[];
  hasSubscription: boolean;
}

interface UseSubscriptionResult {
  data: SubscriptionData | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSubscription(): UseSubscriptionResult {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/subscription");
      if (!res.ok) {
        setError("Failed to load subscription");
        return;
      }
      const json = (await res.json()) as { data: SubscriptionData };
      setData(json.data);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refresh: fetchData };
}

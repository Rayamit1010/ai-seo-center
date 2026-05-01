"use client";

import { useState, useEffect } from "react";

interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
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

interface UsePlansResult {
  plans: Plan[];
  loading: boolean;
  error: string | null;
}

export function usePlans(): UsePlansResult {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/billing/plans");
        if (!res.ok) {
          setError("Failed to load plans");
          return;
        }
        const json = (await res.json()) as { data: Plan[] };
        setPlans(json.data ?? []);
      } catch {
        setError("Network error");
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  return { plans, loading, error };
}

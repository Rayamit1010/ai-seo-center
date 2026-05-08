"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    company: "",
    website: "",
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Registration failed");
        return;
      }

      toast.success("Account created! Please verify your email.");
      router.push("/verify-email");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const update = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="font-heading text-2xl font-bold text-text-primary">
              TechGeekStudio
            </span>
          </div>
          <p className="text-sm text-text-secondary">
            Create your SEO Command Center account
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-8 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Name</label>
              <Input placeholder="Your name" value={form.name} onChange={update("name")} required />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Email</label>
              <Input type="email" placeholder="you@company.com" value={form.email} onChange={update("email")} required />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Password</label>
              <Input
                type="password"
                placeholder="12+ chars with upper, lower, and number"
                value={form.password}
                onChange={update("password")}
                required
                minLength={12}
              />
              <p className="mt-1 text-xs text-text-muted">
                Use at least 12 characters and include uppercase, lowercase, and a number.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Company <span className="text-text-muted">(optional)</span></label>
              <Input placeholder="TechGeekStudio" value={form.company} onChange={update("company")} />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-primary">Website <span className="text-text-muted">(optional)</span></label>
              <Input type="url" placeholder="https://yoursite.com" value={form.website} onChange={update("website")} />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Creating account...
                </span>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

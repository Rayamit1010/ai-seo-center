"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bell, CircleAlert, Info, Menu, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/audit": "SEO Audit",
  "/keywords": "Keyword Research",
  "/backlinks": "Backlink Strategy",
  "/technical": "Technical SEO",
  "/content": "Content Analyzer",
  "/outreach": "Outreach Generator",
  "/authority": "Authority Building",
  "/chat": "AI SEO Chat",
  "/ai-analytics": "AI Analytics",
  "/ops": "Operations Center",
  "/reports": "Reports",
  "/settings": "Settings",
};

export function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const { data, error } = useNotifications();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const getTitle = () => {
    for (const [path, title] of Object.entries(pageTitles)) {
      if (pathname === path || pathname.startsWith(path + "/")) {
        return title;
      }
    }
    return "SEO Command Center";
  };

  const getBreadcrumbs = () => {
    const segments = pathname.split("/").filter(Boolean);
    return segments.map((seg) => seg.charAt(0).toUpperCase() + seg.slice(1));
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface/80 px-6 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <button onClick={onMenuClick} className="lg:hidden text-text-secondary hover:text-text-primary">
          <Menu className="h-5 w-5" />
        </button>
        <div>
          <h1 className="font-heading text-lg font-bold text-text-primary">
            {getTitle()}
          </h1>
          <div className="flex items-center gap-1 text-xs text-text-muted">
            {getBreadcrumbs().map((crumb, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-1">/</span>}
                {crumb}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={panelRef}>
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            onClick={() => setOpen((current) => !current)}
            aria-label="Open notifications"
          >
            <Bell className="h-5 w-5 text-text-secondary" />
            {data.unreadCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-white">
                {Math.min(data.unreadCount, 9)}{data.unreadCount > 9 ? "+" : ""}
              </span>
            ) : null}
          </Button>

          {open ? (
            <div className="absolute right-0 top-12 z-[120] w-[360px] rounded-2xl border border-border bg-surface p-3 shadow-2xl">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-text-primary">Notifications</p>
                  <p className="text-xs text-text-muted">
                    Live system and AI activity
                  </p>
                </div>
                <Link
                  href="/ops"
                  className="text-xs font-medium text-primary hover:underline"
                  onClick={() => setOpen(false)}
                >
                  Open Ops Center
                </Link>
              </div>

              {error ? (
                <div className="rounded-xl border border-warning/30 bg-warning-light p-3 text-sm text-text-secondary">
                  {error}
                </div>
              ) : (
                <div className="max-h-[420px] space-y-2 overflow-y-auto">
                  {data.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href || "/ops"}
                      className="block rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/40"
                      onClick={() => setOpen(false)}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "mt-0.5 rounded-lg p-2",
                            item.severity === "error" && "bg-error-light text-error",
                            item.severity === "warning" && "bg-warning-light text-warning",
                            item.severity === "success" && "bg-success-light text-success",
                            item.severity === "info" && "bg-primary-light text-primary"
                          )}
                        >
                          {item.severity === "error" ? (
                            <CircleAlert className="h-4 w-4" />
                          ) : item.severity === "warning" ? (
                            <Bell className="h-4 w-4" />
                          ) : item.severity === "success" ? (
                            <ShieldCheck className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-text-primary">{item.title}</p>
                          <p className="mt-1 text-xs leading-5 text-text-secondary">
                            {item.message}
                          </p>
                          <p className="mt-2 text-[11px] text-text-muted">
                            {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}

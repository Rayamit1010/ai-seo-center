"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Search,
  Tags,
  Link as LinkIcon,
  Settings,
  FileText,
  Mail,
  Trophy,
  MessageSquare,
  BarChart3,
  Sliders,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Zap,
  Bot,
  Cpu,
  Siren,
  CreditCard,
  TrendingUp,
  BookOpen,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/audit", icon: Search, label: "New Audit" },
  { href: "/keywords", icon: Tags, label: "Keywords" },
  { href: "/rank-tracker", icon: TrendingUp, label: "Rank Tracker" },
  { href: "/backlinks", icon: LinkIcon, label: "Backlinks" },
  { href: "/technical", icon: Settings, label: "Technical" },
  { href: "/content", icon: FileText, label: "Content" },
  { href: "/briefs", icon: BookOpen, label: "Content Briefs" },
  { href: "/outreach", icon: Mail, label: "Outreach" },
  { href: "/agent", icon: Bot, label: "AI Agent" },
  { href: "/authority", icon: Trophy, label: "Authority" },
  { href: "/chat", icon: MessageSquare, label: "AI Chat" },
  { href: "/projects", icon: Briefcase, label: "Projects" },
  { href: "/ai-analytics", icon: Cpu, label: "AI Analytics" },
  { href: "/ops", icon: Siren, label: "Ops Center" },
  { href: "/reports", icon: BarChart3, label: "Reports" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
  { href: "/settings/team", icon: Users, label: "Team" },
  { href: "/settings", icon: Sliders, label: "Settings" },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-surface transition-all duration-300",
        collapsed ? "w-[64px]" : "w-[240px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-border px-4">
        <Zap className="h-6 w-6 shrink-0 text-primary" />
        {!collapsed && (
          <span className="ml-3 font-heading text-lg font-bold text-text-primary">
            TGS SEO
          </span>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    isActive
                      ? "border-l-2 border-primary bg-primary-light text-primary"
                      : "text-text-secondary hover:bg-surface-hover hover:text-text-primary",
                    collapsed && "justify-center px-2"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-primary")} />
                  {!collapsed && <span className="ml-3">{item.label}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* User + Collapse */}
      <div className="border-t border-border p-3">
        {!collapsed && session?.user && (
          <div className="mb-3 flex items-center gap-3 rounded-lg bg-background px-3 py-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {(session.user.name || session.user.email || "U")[0].toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-text-primary">
                {session.user.name || "User"}
              </p>
              <p className="truncate text-xs text-text-muted">
                {session.user.email}
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-text-muted hover:text-error"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="flex w-full items-center justify-center rounded-lg py-2 text-text-muted hover:bg-surface-hover hover:text-text-primary"
        >
          {collapsed ? <ChevronRight className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </button>
      </div>
    </aside>
  );
}

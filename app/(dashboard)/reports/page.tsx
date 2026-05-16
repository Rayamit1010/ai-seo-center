"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  Clipboard,
  Download,
  FileText,
  Mail,
  Minus,
  Palette,
  RefreshCcw,
  Search as SearchIcon,
  Send,
  Share2,
  Sparkles,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { buildReportDocument, reportDocumentToHtml, type AuditReportSource, type ReportDocument } from "@/lib/reports";
import { cn, formatDate, formatDateTime, truncate } from "@/lib/utils";
import { toast } from "sonner";

interface AuditItem {
  id: string;
  url: string;
  title: string | null;
  status: string;
  summary: string | null;
  scores: { overall: number } | null;
  createdAt: string;
  inputType: string;
}

interface SavedReportItem {
  id: string;
  title: string;
  type: string;
  auditId: string | null;
  createdAt: string;
  content: ReportDocument | null;
}

interface ReportScheduleItem {
  id: string;
  auditId: string | null;
  targetUrl: string;
  clientName: string;
  projectName: string;
  recipientEmail: string;
  frequency: "daily" | "weekly" | "monthly";
  weekday: number | null;
  monthDay: number | null;
  hour: number;
  minute: number;
  timezone: string;
  deliveryMode: "email" | "draft";
  isActive: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
}

interface ReportDeliveryLogItem {
  id: string;
  reportId: string | null;
  recipientEmail: string;
  subject: string;
  status: "queued" | "sent" | "failed";
  provider: string;
  errorMessage: string | null;
  createdAt: string;
  sentAt: string | null;
}

interface ReportMeta {
  clientName: string;
  projectName: string;
  recipientEmail: string;
  agencyLabel: string;
  accent: string;
  footerNote: string;
}

const DEFAULT_META: ReportMeta = {
  clientName: "",
  projectName: "",
  recipientEmail: "",
  agencyLabel: "",
  accent: "#00C896",
  footerNote: "",
};

function ReportsPageContent() {
  const searchParams = useSearchParams();
  const [audits, setAudits] = useState<AuditItem[]>([]);
  const [reports, setReports] = useState<SavedReportItem[]>([]);
  const [schedules, setSchedules] = useState<ReportScheduleItem[]>([]);
  const [deliveries, setDeliveries] = useState<ReportDeliveryLogItem[]>([]);
  const [projectCount, setProjectCount] = useState(0);
  const [agentStats, setAgentStats] = useState({
    totalLinks: 0,
    linksThisMonth: 0,
    averageQualityScore: 0,
  });
  const [auditDetails, setAuditDetails] = useState<Record<string, AuditReportSource>>({});
  const [selectedKind, setSelectedKind] = useState<"report" | "audit">("report");
  const [selectedId, setSelectedId] = useState("");
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [meta, setMeta] = useState<ReportMeta>(DEFAULT_META);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scheduleConfig, setScheduleConfig] = useState({
    frequency: "daily" as "daily" | "weekly" | "monthly",
    weekday: "1",
    monthDay: "1",
    hour: "9",
    minute: "0",
    deliveryMode: "email" as "email" | "draft",
  });

  useEffect(() => {
    void loadWorkspace();
  }, []);

  useEffect(() => {
    const reportId = searchParams.get("report");
    const auditId = searchParams.get("audit");

    if (reportId && reports.some((report) => report.id === reportId)) {
      setSelectedKind("report");
      setSelectedId(reportId);
      return;
    }

    if (auditId && audits.some((audit) => audit.id === auditId)) {
      setSelectedKind("audit");
      setSelectedId(auditId);
      return;
    }

    if (!selectedId) {
      if (reports[0]) {
        setSelectedKind("report");
        setSelectedId(reports[0].id);
      } else if (audits[0]) {
        setSelectedKind("audit");
        setSelectedId(audits[0].id);
      }
    }
  }, [audits, reports, searchParams, selectedId]);

  useEffect(() => {
    const report = reports.find((item) => item.id === selectedId);
    const auditId = selectedKind === "audit" ? selectedId : report?.auditId || "";

    if (!auditId || auditDetails[auditId]) {
      return;
    }

    const audit = audits.find((item) => item.id === auditId);
    if (!audit || audit.status !== "COMPLETE") {
      return;
    }

    void loadAuditDetails(auditId);
  }, [auditDetails, audits, reports, selectedId, selectedKind]);

  useEffect(() => {
    const report = reports.find((item) => item.id === selectedId);
    if (selectedKind === "report" && report?.content) {
      setMeta({
        clientName: report.content.clientName || "",
        projectName: report.content.projectName || "",
        recipientEmail: report.content.recipientEmail || "",
        agencyLabel: report.content.branding.agencyLabel || "",
        accent: report.content.branding.accent || "#00C896",
        footerNote: report.content.branding.footerNote || "",
      });
      return;
    }

    if (selectedKind === "audit") {
      const audit = audits.find((item) => item.id === selectedId);
      if (audit) {
        setMeta((current) => ({
          clientName: current.clientName,
          projectName: current.projectName || audit.title || "",
          recipientEmail: current.recipientEmail,
          agencyLabel: current.agencyLabel,
          accent: current.accent || "#00C896",
          footerNote: current.footerNote,
        }));
      }
    }
  }, [audits, reports, selectedId, selectedKind]);

  async function loadWorkspace() {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await fetch("/api/reports/workspace");
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "The reports workspace could not be loaded right now.");
      }

      setAudits(Array.isArray(payload.data?.audits) ? payload.data.audits : []);
      setReports(Array.isArray(payload.data?.reports) ? payload.data.reports : []);
      setSchedules(Array.isArray(payload.data?.schedules) ? payload.data.schedules : []);
      setDeliveries(Array.isArray(payload.data?.deliveries) ? payload.data.deliveries : []);
      setProjectCount(Number(payload.data?.projectCount || 0));
      setAgentStats(
        payload.data?.agentStats
          ? {
              totalLinks: payload.data.agentStats.totalLinks || 0,
              linksThisMonth: payload.data.agentStats.linksThisMonth || 0,
              averageQualityScore: payload.data.agentStats.averageQualityScore || 0,
            }
          : { totalLinks: 0, linksThisMonth: 0, averageQualityScore: 0 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "The reports workspace could not be loaded.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function loadAuditDetails(auditId: string) {
    try {
      const response = await fetch(`/api/audit/${auditId}`);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The report preview could not load this audit.");
      }

      setAuditDetails((current) => ({
        ...current,
        [auditId]: {
          id: json.data.id,
          url: json.data.url,
          title: json.data.title,
          summary: json.data.summary,
          createdAt: json.data.createdAt,
          scores: json.data.scores,
          onPage: json.data.onPage,
          technical: json.data.technical,
          offPage: json.data.offPage,
          keywords: json.data.keywords,
          checklist: json.data.checklist,
        },
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The audit details could not be loaded.");
    }
  }

  const selectedReport = reports.find((item) => item.id === selectedId);
  const selectedAudit = audits.find((item) => item.id === selectedId);
  const selectedAuditId = selectedKind === "audit" ? selectedId : selectedReport?.auditId || "";
  const selectedAuditDetail = selectedAuditId ? auditDetails[selectedAuditId] : undefined;

  let preview: ReportDocument | null = null;
  if (selectedAuditDetail) {
    preview = buildReportDocument(selectedAuditDetail, {
      clientName: meta.clientName || selectedReport?.content?.clientName,
      projectName: meta.projectName || selectedReport?.content?.projectName,
      recipientEmail: meta.recipientEmail || selectedReport?.content?.recipientEmail,
      title: selectedReport?.title,
      status: selectedReport?.content?.status,
      sentAt: selectedReport?.content?.delivery.sentAt || null,
      branding: {
        agencyLabel: meta.agencyLabel || selectedReport?.content?.branding.agencyLabel,
        accent: meta.accent || selectedReport?.content?.branding.accent,
        footerNote: meta.footerNote || selectedReport?.content?.branding.footerNote,
      },
    });
  } else if (selectedReport?.content) {
    preview = {
      ...selectedReport.content,
      clientName: meta.clientName || selectedReport.content.clientName,
      projectName: meta.projectName || selectedReport.content.projectName,
      recipientEmail: meta.recipientEmail || selectedReport.content.recipientEmail,
      branding: {
        accent: meta.accent || selectedReport.content.branding.accent,
        agencyLabel: meta.agencyLabel || selectedReport.content.branding.agencyLabel,
        footerNote: meta.footerNote || selectedReport.content.branding.footerNote,
      },
    };
  }

  const completedAudits = audits.filter((audit) => audit.status === "COMPLETE");
  const averageAuditScore =
    completedAudits.length > 0
      ? Math.round(completedAudits.reduce((sum, audit) => sum + (audit.scores?.overall || 0), 0) / completedAudits.length)
      : 0;
  const readyReports = reports.filter((report) => report.content?.status === "ready_to_send").length;

  const filteredReports = reports.filter((report) => {
    const text = `${report.title} ${report.content?.domain || ""} ${report.content?.clientName || ""}`.toLowerCase();
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "ready" && report.content?.status === "ready_to_send") ||
      (filter === "draft" && report.content?.status === "draft") ||
      (filter === "sent" && report.content?.status === "sent");
    return matchesQuery && matchesFilter;
  });

  const filteredAudits = completedAudits.filter((audit) => {
    const text = `${audit.title || ""} ${audit.url}`.toLowerCase();
    return text.includes(query.toLowerCase());
  });

  async function generateReport() {
    const auditId = selectedKind === "audit" ? selectedId : selectedReport?.auditId;
    if (!auditId) {
      toast.error("Choose a completed audit first so I know what to build the report from.");
      return;
    }

    try {
      setWorking(true);
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auditId,
          clientName: meta.clientName,
          projectName: meta.projectName,
          recipientEmail: meta.recipientEmail,
          title: meta.projectName ? `SEO Growth Report - ${meta.projectName}` : undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The report could not be generated.");
      }

      const created = json.data as SavedReportItem;
      setReports((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setSelectedKind("report");
      setSelectedId(created.id);
      toast.success("Client-ready SEO report generated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The report could not be generated.");
    } finally {
      setWorking(false);
    }
  }

  async function saveReportDetails(nextStatus?: "draft" | "ready_to_send" | "sent") {
    if (selectedKind !== "report" || !selectedReport) {
      toast.error("Generate a report first, then I can save the delivery settings.");
      return;
    }

    try {
      setWorking(true);
      const response = await fetch("/api/reports", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: selectedReport.id,
          title: meta.projectName ? `SEO Growth Report - ${meta.projectName}` : selectedReport.title,
          clientName: meta.clientName,
          projectName: meta.projectName,
          recipientEmail: meta.recipientEmail,
          status: nextStatus,
          sentAt: nextStatus === "sent" ? new Date().toISOString() : nextStatus ? null : undefined,
          branding: {
            accent: meta.accent,
            agencyLabel: meta.agencyLabel,
            footerNote: meta.footerNote,
          },
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The report settings could not be saved.");
      }

      const updated = json.data as SavedReportItem;
      setReports((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(nextStatus === "sent" ? "Report marked as sent." : "Report details saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The report settings could not be saved.");
    } finally {
      setWorking(false);
    }
  }

  async function deleteReport(reportId: string) {
    try {
      setWorking(true);
      const response = await fetch(`/api/reports?id=${reportId}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The report could not be deleted.");
      }

      const nextReports = reports.filter((item) => item.id !== reportId);
      setReports(nextReports);
      if (selectedId === reportId) {
        if (nextReports[0]) {
          setSelectedKind("report");
          setSelectedId(nextReports[0].id);
        } else if (audits[0]) {
          setSelectedKind("audit");
          setSelectedId(audits[0].id);
        } else {
          setSelectedId("");
        }
      }
      toast.success("Report deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The report could not be deleted.");
    } finally {
      setWorking(false);
    }
  }

  async function copyEmailDraft() {
    if (!preview) {
      toast.error("Open a report first so there is an email draft to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(preview.emailBody);
      toast.success("Client email draft copied.");
    } catch {
      toast.error("Clipboard access was blocked, so the email draft could not be copied.");
    }
  }

  async function copyShareLink() {
    if (!selectedId) {
      return;
    }

    try {
      const params = new URLSearchParams(window.location.search);
      params.delete("audit");
      params.delete("report");
      params.set(selectedKind, selectedId);
      const url = `${window.location.origin}/reports?${params.toString()}`;
      await navigator.clipboard.writeText(url);
      toast.success("Share link copied.");
    } catch {
      toast.error("The share link could not be copied.");
    }
  }

  async function sendReportNow() {
    if (selectedKind !== "report" || !selectedReport) {
      toast.error("Generate and save a report first, then I can email it.");
      return;
    }

    try {
      setWorking(true);
      const response = await fetch("/api/reports/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId: selectedReport.id,
          recipientEmail: meta.recipientEmail || undefined,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The report email could not be queued.");
      }

      toast.success("Report email queued. Delivery status will appear below shortly.");
      await loadWorkspace();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The report email could not be queued.");
    } finally {
      setWorking(false);
    }
  }

  async function createSchedule() {
    const sourceAuditId = selectedKind === "audit" ? selectedId : selectedReport?.auditId;
    const targetUrl = selectedAuditDetail?.url || selectedAudit?.url || audits.find((item) => item.id === sourceAuditId)?.url;
    if (!targetUrl) {
      toast.error("Choose a report or completed audit first so I know which site to schedule.");
      return;
    }

    if (!meta.clientName || !meta.projectName || !meta.recipientEmail) {
      toast.error("Add client name, project name, and recipient email before creating a recurring schedule.");
      return;
    }

    try {
      setWorking(true);
      const response = await fetch("/api/reports/schedules", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          auditId: sourceAuditId || undefined,
          targetUrl,
          clientName: meta.clientName,
          projectName: meta.projectName,
          recipientEmail: meta.recipientEmail,
          frequency: scheduleConfig.frequency,
          weekday: scheduleConfig.frequency === "weekly" ? Number(scheduleConfig.weekday) : null,
          monthDay: scheduleConfig.frequency === "monthly" ? Number(scheduleConfig.monthDay) : null,
          hour: Number(scheduleConfig.hour),
          minute: Number(scheduleConfig.minute),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deliveryMode: scheduleConfig.deliveryMode,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The recurring schedule could not be created.");
      }

      setSchedules((current) => [json.data as ReportScheduleItem, ...current]);
      toast.success("Recurring report schedule created.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The recurring schedule could not be created.");
    } finally {
      setWorking(false);
    }
  }

  async function toggleSchedule(schedule: ReportScheduleItem) {
    try {
      const response = await fetch("/api/reports/schedules", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: schedule.id,
          isActive: !schedule.isActive,
        }),
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The schedule could not be updated.");
      }
      setSchedules((current) => current.map((item) => (item.id === schedule.id ? (json.data as ReportScheduleItem) : item)));
      toast.success(schedule.isActive ? "Schedule paused." : "Schedule activated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The schedule could not be updated.");
    }
  }

  async function deleteSchedule(id: string) {
    try {
      const response = await fetch(`/api/reports/schedules?id=${id}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.reason || json.error || "The schedule could not be deleted.");
      }
      setSchedules((current) => current.filter((item) => item.id !== id));
      toast.success("Schedule deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The schedule could not be deleted.");
    }
  }

  function openEmailDraft() {
    if (!preview) {
      toast.error("Generate or open a report first.");
      return;
    }

    const mailto = `mailto:${encodeURIComponent(preview.recipientEmail)}?subject=${encodeURIComponent(
      preview.emailSubject
    )}&body=${encodeURIComponent(preview.emailBody)}`;
    window.location.href = mailto;
  }

  function downloadHtmlReport() {
    if (!preview) {
      toast.error("Generate or open a report first.");
      return;
    }

    const blob = new Blob([reportDocumentToHtml(preview)], { type: "text/html;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = href;
    anchor.download = `${preview.projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-seo-report.html`;
    anchor.click();
    URL.revokeObjectURL(href);
  }

  async function downloadPdfReport() {
    if (!preview) {
      toast.error("Generate or open a report first.");
      return;
    }

    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      const marginX = 44;
      let y = 56;

      pdf.setFillColor(preview.branding.accent);
      pdf.rect(0, 0, 595, 18, "F");
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(22);
      pdf.text(preview.title, marginX, y);
      y += 24;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(10);
      pdf.text(`${preview.projectName} • ${preview.domain}`, marginX, y);
      y += 24;

      const sections = [
        { title: "Executive Summary", body: preview.executiveSummary },
        { title: "Client Summary", body: preview.clientSummary },
        { title: "Key Wins", body: preview.keyWins.map((item) => `• ${item}`).join("\n") },
        { title: "Key Risks", body: preview.keyRisks.map((item) => `• ${item}`).join("\n") },
        { title: "Priority Actions", body: preview.priorityActions.map((item) => `• ${item.title} - ${item.detail}`).join("\n") },
        { title: "30-Day Roadmap", body: preview.roadmap30Days.map((item) => `• ${item}`).join("\n") },
      ];

      for (const section of sections) {
        if (y > 740) {
          pdf.addPage();
          y = 56;
        }

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(14);
        pdf.text(section.title, marginX, y);
        y += 18;
        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(11);
        const lines = pdf.splitTextToSize(section.body || "No content available.", 500);
        pdf.text(lines, marginX, y);
        y += lines.length * 14 + 16;
      }

      pdf.setFontSize(9);
      pdf.setTextColor("#4B5563");
      pdf.text(preview.branding.footerNote, marginX, 800);
      pdf.save(`${preview.projectName.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-seo-report.pdf`);
      toast.success("PDF export downloaded.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The PDF could not be generated.");
    }
  }

  function printReport() {
    if (!preview) {
      toast.error("Generate or open a report first.");
      return;
    }

    const popup = window.open("", "_blank", "noopener,noreferrer,width=1000,height=800");
    if (!popup) {
      toast.error("The print preview was blocked by your browser.");
      return;
    }

    popup.document.write(reportDocumentToHtml(preview));
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function renderPreview() {
    if (!selectedId) {
      return (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[440px] flex-col items-center justify-center gap-3 text-center">
            <FileText className="h-10 w-10 text-text-muted" />
            <div>
              <p className="text-base font-semibold text-text-primary">No report selected yet</p>
              <p className="text-sm text-text-secondary">Pick a saved report or a completed audit to start building a client-ready deliverable.</p>
            </div>
            <Link href="/audit">
              <Button>Run New Audit</Button>
            </Link>
          </CardContent>
        </Card>
      );
    }

    if (selectedKind === "audit" && selectedAudit?.status !== "COMPLETE") {
      return (
        <Card className="border-dashed">
          <CardContent className="flex min-h-[440px] flex-col items-center justify-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-warning" />
            <div>
              <p className="text-base font-semibold text-text-primary">This audit is still in progress</p>
              <p className="text-sm text-text-secondary">Finish the audit first, then I can turn it into a polished client report with summary, priorities, and email copy.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (!preview) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-20 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      );
    }

    return (
      <Tabs defaultValue="summary">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="grid w-full max-w-xl grid-cols-4">
            <TabsTrigger value="summary">Summary</TabsTrigger>
            <TabsTrigger value="compare">Compare</TabsTrigger>
            <TabsTrigger value="actions">Action Plan</TabsTrigger>
            <TabsTrigger value="email">Client Email</TabsTrigger>
          </TabsList>
          <Badge
            variant={
              preview.status === "sent"
                ? "secondary"
                : preview.status === "ready_to_send"
                ? "success"
                : "warning"
            }
          >
            {preview.status === "sent" ? "Sent" : preview.status === "ready_to_send" ? "Ready to send" : "Draft"}
          </Badge>
        </div>

        <TabsContent value="summary" className="space-y-6">
          <Card className="overflow-hidden">
            <CardHeader className="border-b border-border bg-[radial-gradient(circle_at_top_left,rgba(0,200,150,0.12),transparent_45%),linear-gradient(135deg,rgba(0,102,255,0.14),transparent_55%)]">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{preview.domain}</Badge>
                <Badge variant="secondary">{formatDateTime(preview.generatedAt)}</Badge>
              </div>
              <CardTitle className="text-2xl">{preview.title}</CardTitle>
              <CardDescription>{preview.executiveSummary}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Prepared by</p>
                    <p className="mt-1 text-sm font-semibold text-text-primary">{preview.branding.agencyLabel}</p>
                  </div>
                  {preview.delivery.sentAt ? (
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Sent</p>
                      <p className="mt-1 text-sm text-text-primary">{formatDateTime(preview.delivery.sentAt)}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {preview.headlineMetrics.map((metric) => (
                  <div
                    key={metric.label}
                    className={cn(
                      "rounded-2xl border p-4",
                      metric.tone === "strong" && "border-success/30 bg-success-light/10",
                      metric.tone === "watch" && "border-warning/30 bg-warning-light/10",
                      metric.tone === "critical" && "border-error/30 bg-error-light/10"
                    )}
                  >
                    <p className="text-xs uppercase tracking-[0.22em] text-text-muted">{metric.label}</p>
                    <p className="mt-3 text-3xl font-bold text-text-primary">{metric.value}</p>
                    <p className="mt-2 text-sm text-text-secondary">{metric.note}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <Card className="border-success/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">What is already working</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {preview.keyWins.map((item) => (
                      <div key={item} className="flex gap-3 rounded-xl border border-success/20 bg-success-light/10 p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <p className="text-sm text-text-primary">{item}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="border-warning/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">What needs attention next</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {preview.keyRisks.map((item) => (
                      <div key={item} className="flex gap-3 rounded-xl border border-warning/20 bg-warning-light/10 p-3">
                        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                        <p className="text-sm text-text-primary">{item}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Client-facing summary</CardTitle>
                  <CardDescription>{preview.clientSummary}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {preview.highlights.map((item) => (
                    <div key={item} className="rounded-xl border border-border bg-background p-3 text-sm text-text-primary">
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>

              <div className="rounded-2xl border border-border bg-background p-4 text-sm text-text-secondary">
                {preview.branding.footerNote}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="compare" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress since the previous audit</CardTitle>
              <CardDescription>
                {preview.scoreDeltas.some((item) => item.previous !== null)
                  ? "This makes it easier to show clients what moved, what slipped, and where the next work should focus."
                  : "There is no earlier audit for this same domain yet, so this report is acting as the baseline."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {preview.scoreDeltas.map((item) => (
                  <div key={item.label} className="rounded-2xl border border-border bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.22em] text-text-muted">{item.label}</p>
                    <p className="mt-3 text-2xl font-bold text-text-primary">{item.current}/100</p>
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {item.change === null ? (
                        <>
                          <Minus className="h-4 w-4 text-text-muted" />
                          <span className="text-text-secondary">Baseline report</span>
                        </>
                      ) : item.change >= 0 ? (
                        <>
                          <TrendingUp className="h-4 w-4 text-success" />
                          <span className="text-success">+{item.change} vs previous audit</span>
                        </>
                      ) : (
                        <>
                          <TrendingDown className="h-4 w-4 text-error" />
                          <span className="text-error">{item.change} vs previous audit</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {preview.charts.map((chart) => (
                  <div key={chart.label} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-sm font-semibold text-text-primary">{chart.label}</p>
                      <p className="text-xs text-text-muted">
                        {chart.previous === null ? "First benchmark" : `Prev ${chart.previous}/100`}
                      </p>
                    </div>
                    <div className="mt-4 flex items-end gap-3">
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-surface-hover">
                          <div className="h-2 rounded-full" style={{ width: `${Math.max(chart.current, 4)}%`, backgroundColor: preview.branding.accent }} />
                        </div>
                        <p className="mt-2 text-xs text-text-secondary">Current: {chart.current}/100</p>
                      </div>
                      <div className="flex-1">
                        <div className="h-2 rounded-full bg-surface-hover">
                          <div className="h-2 rounded-full bg-text-muted/50" style={{ width: `${Math.max(chart.previous || 4, 4)}%` }} />
                        </div>
                        <p className="mt-2 text-xs text-text-secondary">
                          Previous: {chart.previous === null ? "N/A" : `${chart.previous}/100`}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Priority fixes and growth plan</CardTitle>
              <CardDescription>This section is organized to help you move from report to implementation without rewriting the strategy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {preview.priorityActions.map((action) => (
                  <div key={`${action.module}-${action.title}`} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">{action.module}</Badge>
                      <Badge variant={action.impact === "high" ? "destructive" : action.impact === "medium" ? "warning" : "secondary"}>
                        {action.impact} impact
                      </Badge>
                      <Badge variant="secondary">{action.effort} effort</Badge>
                    </div>
                    <p className="mt-3 text-sm font-semibold text-text-primary">{action.title}</p>
                    <p className="mt-1 text-sm text-text-secondary">{action.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <InsightList title="30-day roadmap" items={preview.roadmap30Days} tone="primary" />
                <InsightList title="Keyword opportunities" items={preview.keywordOpportunities} tone="success" />
                <InsightList
                  title="Authority and technical focus"
                  items={[...preview.backlinkOpportunities.slice(0, 3), ...preview.technicalFocus.slice(0, 2)]}
                  tone="warning"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client handoff draft</CardTitle>
              <CardDescription>The draft stays plain and human so it is easy to send directly or lightly edit first.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Subject</p>
                <p className="mt-2 text-sm font-medium text-text-primary">{preview.emailSubject}</p>
              </div>
              <Textarea value={preview.emailBody} readOnly className="min-h-[280px]" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary-light px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Client-Ready Reports
          </div>
          <h2 className="mt-3 font-heading text-3xl font-bold text-text-primary">SEO reports you can actually send to clients</h2>
          <p className="mt-2 max-w-3xl text-text-secondary">
            Build polished summaries from completed audits, add client details, preview the narrative, and send or export without copying everything into another tool.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/audit">
            <Button variant="outline">
              Run fresh audit
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Button onClick={() => void loadWorkspace()} variant="secondary" disabled={loading}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh workspace
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-6">
        <StatCard label="Websites managed" value={String(projectCount)} note="Per-domain strategy memory and reporting context" />
        <StatCard label="Saved reports" value={String(reports.length)} note="Reusable client deliverables" />
        <StatCard label="Active schedules" value={String(schedules.filter((schedule) => schedule.isActive).length)} note="Daily, weekly, or monthly delivery cadences" />
        <StatCard label="Links this month" value={String(agentStats.linksThisMonth)} note={`Total backlinks won: ${agentStats.totalLinks}`} />
        <StatCard label="Ready to send" value={String(readyReports)} note="Includes recipient-aware email copy" />
        <StatCard label="Average quality" value={`${agentStats.averageQualityScore}/100`} note={`Audit benchmark: ${averageAuditScore}/100`} />
      </div>

      {loadError ? <ErrorState message={loadError} onRetry={() => void loadWorkspace()} /> : null}

      <Card className="overflow-hidden">
        <CardContent className="grid gap-0 p-0 lg:grid-cols-[1.35fr_1fr_1fr]">
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">UI and UX power-ups already built in</p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">This page now behaves like a reporting studio, not an audit log.</h3>
            <p className="mt-2 text-sm text-text-secondary">You can pick a completed audit, generate a delivery-ready report, copy a client email, export HTML for print-to-PDF, and deep-link to a specific report.</p>
          </div>
          <div className="border-b border-border p-6 lg:border-b-0 lg:border-r">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Best next upgrade</p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">White-label branding presets</h3>
            <p className="mt-2 text-sm text-text-secondary">Add client logos, custom accent colors, and saved agency templates so every exported report feels branded without manual edits.</p>
          </div>
          <div className="p-6">
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">Next automation opportunity</p>
            <h3 className="mt-2 text-lg font-semibold text-text-primary">Scheduled send flows</h3>
            <p className="mt-2 text-sm text-text-secondary">Generate daily owner digests or weekly and monthly client reports automatically, queue approvals, and send them directly once the delivery provider is configured.</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workspace</CardTitle>
              <CardDescription>Search saved reports or pick a completed audit to turn into a fresh client deck.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search reports or domains" />
              </div>
              <Select value={filter} onValueChange={setFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter items" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reports</SelectItem>
                  <SelectItem value="ready">Ready to send</SelectItem>
                  <SelectItem value="draft">Draft reports</SelectItem>
                  <SelectItem value="sent">Sent reports</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Saved reports</CardTitle>
              <CardDescription>Open a polished report instantly without rebuilding it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </>
              ) : filteredReports.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-text-secondary">No saved reports match this view yet.</p>
              ) : (
                filteredReports.map((report) => (
                  <button
                    key={report.id}
                    type="button"
                    onClick={() => {
                      setSelectedKind("report");
                      setSelectedId(report.id);
                    }}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-colors",
                      selectedKind === "report" && selectedId === report.id
                        ? "border-primary bg-primary-light/10"
                        : "border-border bg-background hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{truncate(report.title, 34)}</p>
                      <Badge variant={report.content?.status === "ready_to_send" ? "success" : "warning"}>
                        {report.content?.status === "ready_to_send" ? "Ready" : "Draft"}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      {report.content?.domain || "Custom report"} • {formatDate(report.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-text-secondary">
                      {truncate(report.content?.plainSummary || "Open this report to preview the client-facing summary.", 88)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completed audits</CardTitle>
              <CardDescription>These are ready to convert into a client-facing SEO report.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <>
                  <Skeleton className="h-20 rounded-2xl" />
                  <Skeleton className="h-20 rounded-2xl" />
                </>
              ) : filteredAudits.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-text-secondary">
                  Finish an audit first, then it will show up here as a report source.
                </p>
              ) : (
                filteredAudits.map((audit) => (
                  <button
                    key={audit.id}
                    type="button"
                    onClick={() => {
                      setSelectedKind("audit");
                      setSelectedId(audit.id);
                    }}
                    className={cn(
                      "w-full rounded-2xl border p-4 text-left transition-colors",
                      selectedKind === "audit" && selectedId === audit.id
                        ? "border-primary bg-primary-light/10"
                        : "border-border bg-background hover:border-primary/40"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{truncate(audit.title || audit.url, 34)}</p>
                      <div
                        className="flex h-10 w-10 items-center justify-center rounded-xl font-mono text-sm font-bold text-white"
                        style={{ backgroundColor: getScoreBackground(audit.scores?.overall || 0) }}
                      >
                        {audit.scores?.overall ?? "--"}
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">
                      {audit.url} • {formatDate(audit.createdAt)}
                    </p>
                    <p className="mt-3 text-sm text-text-secondary">
                      {truncate(audit.summary || "Generate a report to turn this audit into a delivery-ready summary.", 88)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">{renderPreview()}</div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client delivery controls</CardTitle>
              <CardDescription>Adjust the client-facing details first, then generate, export, or send from the same workspace.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Client name</label>
                <Input value={meta.clientName} onChange={(event) => setMeta((current) => ({ ...current, clientName: event.target.value }))} placeholder="TechGeek Studio Client" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Project name</label>
                <Input value={meta.projectName} onChange={(event) => setMeta((current) => ({ ...current, projectName: event.target.value }))} placeholder="Q1 SEO growth plan" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Recipient email</label>
                <Input value={meta.recipientEmail} onChange={(event) => setMeta((current) => ({ ...current, recipientEmail: event.target.value }))} placeholder="client@example.com" type="email" />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Agency label</label>
                <Input value={meta.agencyLabel} onChange={(event) => setMeta((current) => ({ ...current, agencyLabel: event.target.value }))} placeholder="TechGeek Studio SEO Team" />
              </div>
              <div className="grid gap-4 md:grid-cols-[88px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Accent</label>
                  <Input value={meta.accent} onChange={(event) => setMeta((current) => ({ ...current, accent: event.target.value }))} type="color" className="h-11 p-2" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Footer note</label>
                  <Input value={meta.footerNote} onChange={(event) => setMeta((current) => ({ ...current, footerNote: event.target.value }))} placeholder="Prepared for client review." />
                </div>
              </div>
              <Button onClick={generateReport} className="w-full" disabled={working}>
                <Sparkles className="mr-2 h-4 w-4" />
                {selectedKind === "report" ? "Regenerate from audit" : "Generate report"}
              </Button>
              {selectedKind === "report" && selectedReport ? (
                <Button onClick={() => void saveReportDetails()} variant="secondary" className="w-full" disabled={working}>
                  <Palette className="mr-2 h-4 w-4" />
                  Save delivery settings
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Send and export</CardTitle>
              <CardDescription>These actions are designed to keep you moving even if full outbound email automation is not wired yet.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={copyEmailDraft} variant="secondary" className="w-full justify-start">
                <Clipboard className="mr-2 h-4 w-4" />
                Copy client email
              </Button>
              <Button onClick={openEmailDraft} variant="secondary" className="w-full justify-start">
                <Mail className="mr-2 h-4 w-4" />
                Open in email app
              </Button>
              <Button onClick={copyShareLink} variant="secondary" className="w-full justify-start">
                <Share2 className="mr-2 h-4 w-4" />
                Copy share link
              </Button>
              <Button onClick={downloadHtmlReport} variant="secondary" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download HTML report
              </Button>
              <Button onClick={downloadPdfReport} variant="secondary" className="w-full justify-start">
                <Download className="mr-2 h-4 w-4" />
                Download branded PDF
              </Button>
              <Button onClick={printReport} variant="outline" className="w-full justify-start">
                <Send className="mr-2 h-4 w-4" />
                Print or save as PDF
              </Button>
              {selectedKind === "report" && selectedReport ? (
                <Button onClick={() => void sendReportNow()} variant="success" className="w-full justify-start" disabled={working}>
                  <Mail className="mr-2 h-4 w-4" />
                  Send now with Resend
                </Button>
              ) : null}
              {selectedKind === "report" && selectedReport ? (
                <>
                  <Button onClick={() => void saveReportDetails("ready_to_send")} variant="success" className="w-full justify-start" disabled={working}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark ready to send
                  </Button>
                  <Button onClick={() => void saveReportDetails("sent")} variant="outline" className="w-full justify-start" disabled={working}>
                    <Mail className="mr-2 h-4 w-4" />
                    Mark as sent
                  </Button>
                </>
              ) : null}
              {selectedKind === "report" && selectedReport ? (
                <Button onClick={() => void deleteReport(selectedReport.id)} variant="destructive" className="w-full justify-start" disabled={working}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete saved report
                </Button>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recurring delivery</CardTitle>
              <CardDescription>Create a daily owner digest or a weekly/monthly client report cadence and let the background worker handle it.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Frequency</label>
                  <Select value={scheduleConfig.frequency} onValueChange={(value: "daily" | "weekly" | "monthly") => setScheduleConfig((current) => ({ ...current, frequency: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Delivery mode</label>
                  <Select value={scheduleConfig.deliveryMode} onValueChange={(value: "email" | "draft") => setScheduleConfig((current) => ({ ...current, deliveryMode: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email report</SelectItem>
                      <SelectItem value="draft">Draft only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {scheduleConfig.frequency === "daily" ? (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Cadence</label>
                    <div className="rounded-xl border border-border bg-background px-3 py-2 text-sm text-text-secondary">
                      Runs every day at the selected time
                    </div>
                  </div>
                ) : scheduleConfig.frequency === "weekly" ? (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Weekday</label>
                    <Select value={scheduleConfig.weekday} onValueChange={(value) => setScheduleConfig((current) => ({ ...current, weekday: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">Sunday</SelectItem>
                        <SelectItem value="1">Monday</SelectItem>
                        <SelectItem value="2">Tuesday</SelectItem>
                        <SelectItem value="3">Wednesday</SelectItem>
                        <SelectItem value="4">Thursday</SelectItem>
                        <SelectItem value="5">Friday</SelectItem>
                        <SelectItem value="6">Saturday</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Month day</label>
                    <Input type="number" min={1} max={28} value={scheduleConfig.monthDay} onChange={(event) => setScheduleConfig((current) => ({ ...current, monthDay: event.target.value }))} />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Hour</label>
                  <Input type="number" min={0} max={23} value={scheduleConfig.hour} onChange={(event) => setScheduleConfig((current) => ({ ...current, hour: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.22em] text-text-muted">Minute</label>
                  <Input type="number" min={0} max={59} value={scheduleConfig.minute} onChange={(event) => setScheduleConfig((current) => ({ ...current, minute: event.target.value }))} />
                </div>
              </div>
              <Button onClick={() => void createSchedule()} className="w-full" variant="outline" disabled={working}>
                <CalendarDays className="mr-2 h-4 w-4" />
                Create recurring schedule
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upcoming schedules</CardTitle>
              <CardDescription>These jobs run when `pnpm jobs:drain` or your queue worker processes due report schedules.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {schedules.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-text-secondary">No recurring report schedules yet.</p>
              ) : (
                schedules.slice(0, 4).map((schedule) => (
                  <div key={schedule.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">{schedule.projectName}</p>
                        <p className="mt-1 text-xs text-text-muted">{schedule.recipientEmail}</p>
                      </div>
                      <Badge variant={schedule.isActive ? "success" : "secondary"}>{schedule.isActive ? "Active" : "Paused"}</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-xs text-text-secondary">
                      <p>{schedule.frequency} • {schedule.deliveryMode}</p>
                      <p>Next run: {formatDateTime(schedule.nextRunAt)}</p>
                      {schedule.lastRunAt ? <p>Last run: {formatDateTime(schedule.lastRunAt)}</p> : null}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => void toggleSchedule(schedule)}>
                        {schedule.isActive ? "Pause" : "Resume"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void deleteSchedule(schedule.id)}>
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Delivery history</CardTitle>
              <CardDescription>Recent report email attempts, including failures with human-readable reasons.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {deliveries.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-text-secondary">No report deliveries have been logged yet.</p>
              ) : (
                deliveries.slice(0, 5).map((delivery) => (
                  <div key={delivery.id} className="rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-text-primary">{truncate(delivery.subject, 40)}</p>
                      <Badge variant={delivery.status === "sent" ? "success" : delivery.status === "failed" ? "destructive" : "warning"}>
                        {delivery.status}
                      </Badge>
                    </div>
                    <p className="mt-2 text-xs text-text-muted">{delivery.recipientEmail}</p>
                    <div className="mt-3 space-y-1 text-xs text-text-secondary">
                      <p>Queued: {formatDateTime(delivery.createdAt)}</p>
                      {delivery.sentAt ? <p>Sent: {formatDateTime(delivery.sentAt)}</p> : null}
                      {delivery.errorMessage ? <p className="text-error">{delivery.errorMessage}</p> : null}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What to improve next</CardTitle>
              <CardDescription>These are the highest-value upgrades to make reports feel even more premium for clients.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-text-secondary">
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold text-text-primary">1. Branded export presets</p>
                <p className="mt-1">Save logo, footer, accent color, and legal notes per client so every report exports on-brand.</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold text-text-primary">2. Charts and before-vs-after proof</p>
                <p className="mt-1">Add score trend, issue reduction, Core Web Vitals trend, and keyword movement so clients can see progress fast.</p>
              </div>
              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="font-semibold text-text-primary">3. Approval and scheduled send flow</p>
                <p className="mt-1">Move reports through draft, reviewed, approved, and sent states, then automate recurring delivery once approved.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense>
      <ReportsPageContent />
    </Suspense>
  );
}

function StatCard({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs uppercase tracking-[0.22em] text-text-muted">{label}</p>
        <p className="mt-3 text-3xl font-bold text-text-primary">{value}</p>
        <p className="mt-2 text-sm text-text-secondary">{note}</p>
      </CardContent>
    </Card>
  );
}

function InsightList({ title, items, tone }: { title: string; items: string[]; tone: "primary" | "success" | "warning" }) {
  const toneClass =
    tone === "success"
      ? "border-success/20 bg-success-light/10"
      : tone === "warning"
      ? "border-warning/20 bg-warning-light/10"
      : "border-primary/20 bg-primary-light/10";

  return (
    <div className={cn("rounded-2xl border p-4", toneClass)}>
      <p className="text-sm font-semibold text-text-primary">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div key={item} className="rounded-xl border border-white/5 bg-background/60 p-3 text-sm text-text-primary">
            {item}
          </div>
        ))}
      </div>
    </div>
  );
}

function getScoreBackground(score: number) {
  if (score >= 70) return "#00C896";
  if (score >= 50) return "#F59E0B";
  return "#EF4444";
}

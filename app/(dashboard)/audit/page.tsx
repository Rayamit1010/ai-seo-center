"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Code, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

const auditSteps = [
  { step: 1, message: "Connecting to page..." },
  { step: 2, message: "Scraping page structure..." },
  { step: 3, message: "Running Google PageSpeed test..." },
  { step: 4, message: "Analyzing on-page SEO..." },
  { step: 5, message: "Running technical SEO audit..." },
  { step: 6, message: "Generating keyword opportunities..." },
  { step: 7, message: "Building backlink strategy..." },
  { step: 8, message: "Creating priority action plan..." },
  { step: 9, message: "Finalizing report..." },
];

export default function AuditPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [html, setHtml] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const startAudit = async (inputType: "url" | "paste") => {
    if (inputType === "url" && !url.trim()) {
      toast.error("Please enter a URL");
      return;
    }
    if (inputType === "paste" && !html.trim()) {
      toast.error("Please paste HTML content");
      return;
    }

    setLoading(true);
    setCurrentStep(1);

    // Simulate step progress while waiting for API
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, 8));
    }, 2000);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: inputType === "url" ? url : undefined,
          htmlContent: inputType === "paste" ? html : undefined,
          inputType,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Audit failed");
        return;
      }

      setCurrentStep(9);
      toast.success("Audit started! Redirecting to results...");

      // Poll for completion
      const pollInterval = setInterval(async () => {
        const statusRes = await fetch(`/api/audit/${data.auditId}`);
        const statusData = await statusRes.json();
        if (statusData.data?.status === "COMPLETE") {
          clearInterval(pollInterval);
          router.push(`/audit/${data.auditId}`);
        } else if (statusData.data?.status === "FAILED") {
          clearInterval(pollInterval);
          toast.error("Audit failed. Please try again.");
          setLoading(false);
        }
      }, 3000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        router.push(`/audit/${data.auditId}`);
      }, 120000);
    } catch {
      toast.error("Something went wrong");
      setLoading(false);
    } finally {
      clearInterval(interval);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">
          Run SEO Audit
        </h2>
        <p className="mt-1 text-text-secondary">
          Analyze any webpage with AI-powered SEO intelligence
        </p>
      </div>

      {!loading ? (
        <Tabs defaultValue="url">
          <TabsList className="border border-border">
            <TabsTrigger value="url" className="gap-2">
              <Globe className="h-4 w-4" /> URL Scan
            </TabsTrigger>
            <TabsTrigger value="paste" className="gap-2">
              <Code className="h-4 w-4" /> Paste HTML
            </TabsTrigger>
          </TabsList>

          <TabsContent value="url">
            <div className="rounded-xl border border-border bg-surface p-6">
              <label className="mb-2 block text-sm font-medium text-text-primary">
                Website URL
              </label>
              <div className="flex gap-3">
                <Input
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={() => startAudit("url")} className="gap-2">
                  Analyze <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-text-muted">
                Scrapes the page, runs PageSpeed, and performs AI analysis
              </p>
            </div>
          </TabsContent>

          <TabsContent value="paste">
            <div className="rounded-xl border border-border bg-surface p-6">
              <label className="mb-2 block text-sm font-medium text-text-primary">
                HTML Source Code
              </label>
              <Textarea
                placeholder="Paste your HTML source code here..."
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                className="min-h-[200px] font-mono text-xs"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={() => startAudit("paste")} className="gap-2">
                  Analyze HTML <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      ) : (
        /* Progress Steps */
        <div className="rounded-xl border border-border bg-surface p-8">
          <h3 className="mb-6 font-heading text-lg font-semibold text-text-primary">
            Analyzing...
          </h3>
          <div className="space-y-3">
            {auditSteps.map((step) => {
              const isComplete = step.step < currentStep;
              const isRunning = step.step === currentStep;
              return (
                <div
                  key={step.step}
                  className="flex items-center gap-3 rounded-lg p-2"
                >
                  {isComplete ? (
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-success">
                      <span className="text-xs text-white">&#10003;</span>
                    </div>
                  ) : isRunning ? (
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-border" />
                  )}
                  <span
                    className={
                      isComplete
                        ? "text-sm text-success"
                        : isRunning
                          ? "text-sm font-medium text-primary"
                          : "text-sm text-text-muted"
                    }
                  >
                    {step.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

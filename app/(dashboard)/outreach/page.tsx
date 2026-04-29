"use client";

import { useState } from "react";
import { Loader2, Copy, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { OutreachEmailSequence } from "@/types";

export default function OutreachPage() {
  const [form, setForm] = useState({
    targetUrl: "",
    targetName: "",
    targetEmail: "",
    angle: "guest_post" as const,
    contentAngle: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<OutreachEmailSequence | null>(null);

  const copy = (text: string) => { navigator.clipboard.writeText(text); toast.success("Copied!"); };

  const generate = async () => {
    if (!form.targetUrl || !form.targetName || !form.contentAngle) {
      toast.error("Fill in all required fields");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { setResult(data.data); toast.success("Outreach emails generated!"); }
      else toast.error(data.error);
    } catch { toast.error("Failed to generate"); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Outreach Email Generator</h2>
        <p className="mt-1 text-text-secondary">AI-personalized cold outreach for link building</p>
      </div>

      <Card>
        <CardContent className="p-6 grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Target Website URL</label>
            <Input placeholder="https://targetsite.com/blog" value={form.targetUrl} onChange={(e) => setForm(p => ({ ...p, targetUrl: e.target.value }))} />
            <p className="mt-1 text-xs text-text-muted">We&apos;ll scrape this for personalization context</p>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Contact Name</label>
            <Input placeholder="John Smith" value={form.targetName} onChange={(e) => setForm(p => ({ ...p, targetName: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Email <span className="text-text-muted">(optional)</span></label>
            <Input type="email" placeholder="john@targetsite.com" value={form.targetEmail} onChange={(e) => setForm(p => ({ ...p, targetEmail: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Outreach Angle</label>
            <Select value={form.angle} onValueChange={(v) => setForm(p => ({ ...p, angle: v as typeof form.angle }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="guest_post">Guest Post</SelectItem>
                <SelectItem value="niche_edit">Niche Edit</SelectItem>
                <SelectItem value="resource_link">Resource Link</SelectItem>
                <SelectItem value="partnership">Partnership</SelectItem>
                <SelectItem value="digital_pr">Digital PR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-text-primary">Your Pitch / Content Angle</label>
            <Input placeholder="How AI is Transforming SaaS Development" value={form.contentAngle} onChange={(e) => setForm(p => ({ ...p, contentAngle: e.target.value }))} />
          </div>
          <div className="md:col-span-2">
            <Button onClick={generate} disabled={loading} className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              Generate Outreach Sequence
            </Button>
          </div>
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-4">
          {/* Initial Email */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Initial Email</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copy(`Subject: ${result.subject}\n\n${result.body}`)} className="gap-1">
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-text-muted mb-1">Subject (A):</p>
              <p className="font-medium text-text-primary text-sm mb-2">{result.subject}</p>
              <p className="text-xs text-text-muted mb-1">Subject (B):</p>
              <p className="font-medium text-text-primary text-sm mb-4">{result.subjectAlt}</p>
              <div className="rounded-lg bg-background p-4 text-sm text-text-secondary whitespace-pre-wrap">{result.body}</div>
            </CardContent>
          </Card>

          {/* Follow-ups */}
          {[
            { title: "Follow-up #1 (Day 4)", content: result.followUp1 },
            { title: "Follow-up #2 (Day 11)", content: result.followUp2 },
            { title: "Breakup Email (Day 21)", content: result.breakup },
          ].map((email, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{email.title}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copy(email.content)} className="gap-1">
                    <Copy className="h-3 w-3" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg bg-background p-4 text-sm text-text-secondary whitespace-pre-wrap">{email.content}</div>
              </CardContent>
            </Card>
          ))}

          {/* LinkedIn */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">LinkedIn Message</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => copy(result.linkedInMessage)} className="gap-1">
                  <Copy className="h-3 w-3" /> Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-background p-4 text-sm text-text-secondary">{result.linkedInMessage}</div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

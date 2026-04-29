"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Bot, Briefcase, Globe, Link2, Plus, Save, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/lib/utils";

interface ProjectProfile {
  id: string;
  name: string;
  websiteUrl: string;
  domain: string;
  industry: string;
  targetCountry: string;
  targetAudience: string;
  brandVoice: string;
  businessGoal: string;
  conversionGoals: string[];
  primaryServices: string[];
  backlinkRules: { preferredAngles: string[]; avoidPatterns: string[]; anchorGuidelines: string };
  contentPlaybook: { pillarTopics: string[]; freshnessCadence: string; eeatNotes: string[] };
  nichePlaybook: { positioning: string; competitors: string[]; differentiators: string[] };
  searchConsoleSiteUrl: string | null;
  ga4PropertyId: string | null;
  cmsProvider: "none" | "wordpress" | "webhook";
  cmsBaseUrl: string | null;
  cmsUsername: string | null;
  cmsWebhookUrl: string | null;
  cmsPublishStatus: "draft" | "publish";
  hasCmsSecret: boolean;
  cmsSecretPreview: string | null;
  notes: string | null;
  isDefault: boolean;
  updatedAt: string;
}

interface FormState {
  name: string;
  websiteUrl: string;
  industry: string;
  targetCountry: string;
  targetAudience: string;
  brandVoice: string;
  businessGoal: string;
  conversionGoals: string;
  primaryServices: string;
  preferredAngles: string;
  avoidPatterns: string;
  anchorGuidelines: string;
  pillarTopics: string;
  freshnessCadence: string;
  eeatNotes: string;
  positioning: string;
  competitors: string;
  differentiators: string;
  searchConsoleSiteUrl: string;
  ga4PropertyId: string;
  cmsProvider: "none" | "wordpress" | "webhook";
  cmsBaseUrl: string;
  cmsUsername: string;
  cmsAppPassword: string;
  cmsWebhookUrl: string;
  cmsPublishStatus: "draft" | "publish";
  notes: string;
  isDefault: boolean;
}

interface ConnectionStatus {
  configured: boolean;
  ok: boolean;
  message: string;
}

interface ConnectionCheckResult {
  searchConsole: ConnectionStatus;
  ga4: ConnectionStatus;
  cms: ConnectionStatus & { provider: "none" | "wordpress" | "webhook" };
  warnings: string[];
  fetchedAt: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  websiteUrl: "",
  industry: "",
  targetCountry: "Global",
  targetAudience: "",
  brandVoice: "",
  businessGoal: "",
  conversionGoals: "",
  primaryServices: "",
  preferredAngles: "",
  avoidPatterns: "",
  anchorGuidelines: "",
  pillarTopics: "",
  freshnessCadence: "",
  eeatNotes: "",
  positioning: "",
  competitors: "",
  differentiators: "",
  searchConsoleSiteUrl: "",
  ga4PropertyId: "",
  cmsProvider: "none",
  cmsBaseUrl: "",
  cmsUsername: "",
  cmsAppPassword: "",
  cmsWebhookUrl: "",
  cmsPublishStatus: "draft",
  notes: "",
  isDefault: false,
};

function toLines(values: string[]) {
  return values.join("\n");
}

function toArray(value: string) {
  return value
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function profileToForm(profile: ProjectProfile): FormState {
  return {
    name: profile.name,
    websiteUrl: profile.websiteUrl,
    industry: profile.industry,
    targetCountry: profile.targetCountry,
    targetAudience: profile.targetAudience,
    brandVoice: profile.brandVoice,
    businessGoal: profile.businessGoal,
    conversionGoals: toLines(profile.conversionGoals),
    primaryServices: toLines(profile.primaryServices),
    preferredAngles: toLines(profile.backlinkRules.preferredAngles),
    avoidPatterns: toLines(profile.backlinkRules.avoidPatterns),
    anchorGuidelines: profile.backlinkRules.anchorGuidelines,
    pillarTopics: toLines(profile.contentPlaybook.pillarTopics),
    freshnessCadence: profile.contentPlaybook.freshnessCadence,
    eeatNotes: toLines(profile.contentPlaybook.eeatNotes),
    positioning: profile.nichePlaybook.positioning,
    competitors: toLines(profile.nichePlaybook.competitors),
    differentiators: toLines(profile.nichePlaybook.differentiators),
    searchConsoleSiteUrl: profile.searchConsoleSiteUrl || "",
    ga4PropertyId: profile.ga4PropertyId || "",
    cmsProvider: profile.cmsProvider,
    cmsBaseUrl: profile.cmsBaseUrl || "",
    cmsUsername: profile.cmsUsername || "",
    cmsAppPassword: "",
    cmsWebhookUrl: profile.cmsWebhookUrl || "",
    cmsPublishStatus: profile.cmsPublishStatus,
    notes: profile.notes || "",
    isDefault: profile.isDefault,
  };
}

function buildPayload(form: FormState) {
  return {
    name: form.name.trim(),
    websiteUrl: form.websiteUrl.trim(),
    industry: form.industry.trim(),
    targetCountry: form.targetCountry.trim(),
    targetAudience: form.targetAudience.trim(),
    brandVoice: form.brandVoice.trim(),
    businessGoal: form.businessGoal.trim(),
    conversionGoals: toArray(form.conversionGoals),
    primaryServices: toArray(form.primaryServices),
    backlinkRules: {
      preferredAngles: toArray(form.preferredAngles),
      avoidPatterns: toArray(form.avoidPatterns),
      anchorGuidelines: form.anchorGuidelines.trim(),
    },
    contentPlaybook: {
      pillarTopics: toArray(form.pillarTopics),
      freshnessCadence: form.freshnessCadence.trim(),
      eeatNotes: toArray(form.eeatNotes),
    },
    nichePlaybook: {
      positioning: form.positioning.trim(),
      competitors: toArray(form.competitors),
      differentiators: toArray(form.differentiators),
    },
    searchConsoleSiteUrl: form.searchConsoleSiteUrl.trim(),
    ga4PropertyId: form.ga4PropertyId.trim(),
    cmsProvider: form.cmsProvider,
    cmsBaseUrl: form.cmsBaseUrl.trim(),
    cmsUsername: form.cmsUsername.trim(),
    ...(form.cmsAppPassword.trim()
      ? { cmsAppPassword: form.cmsAppPassword.trim() }
      : {}),
    cmsWebhookUrl: form.cmsWebhookUrl.trim(),
    cmsPublishStatus: form.cmsPublishStatus,
    notes: form.notes.trim(),
    isDefault: form.isDefault,
  };
}

export default function ProjectsPage() {
  const [profiles, setProfiles] = useState<ProjectProfile[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [checkingConnections, setCheckingConnections] = useState(false);
  const [connectionCheck, setConnectionCheck] = useState<ConnectionCheckResult | null>(null);

  async function loadProfiles(preferredId?: string | null) {
    try {
      setLoading(true);
      setLoadError(null);
      const response = await fetch("/api/projects");
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "The project memory workspace could not be loaded.");
      }

      const nextProfiles = Array.isArray(payload.data) ? (payload.data as ProjectProfile[]) : [];
      setProfiles(nextProfiles);

      const nextSelected =
        (preferredId && nextProfiles.find((profile) => profile.id === preferredId)?.id) ||
        nextProfiles[0]?.id ||
        null;

      setSelectedId(nextSelected);
      setConnectionCheck(null);
      setForm(nextSelected ? profileToForm(nextProfiles.find((profile) => profile.id === nextSelected)!) : { ...EMPTY_FORM, isDefault: nextProfiles.length === 0 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "The project memory workspace could not be loaded.";
      setLoadError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfiles();
  }, []);

  const selectedProfile = profiles.find((profile) => profile.id === selectedId) || null;
  const defaultProfile = profiles.find((profile) => profile.isDefault) || null;
  const readiness = profiles.length
    ? Math.round(
        profiles.reduce((sum, profile) => {
          const completed = [
            profile.brandVoice,
            profile.businessGoal,
            profile.targetAudience,
            profile.primaryServices.length ? "x" : "",
            profile.backlinkRules.preferredAngles.length ? "x" : "",
            profile.contentPlaybook.pillarTopics.length ? "x" : "",
            profile.nichePlaybook.positioning,
            profile.searchConsoleSiteUrl,
            profile.ga4PropertyId,
            profile.cmsProvider !== "none" ? "x" : "",
          ].filter(Boolean).length;
          return sum + Math.round((completed / 10) * 100);
        }, 0) / profiles.length
      )
    : 0;

  function updateField<Key extends keyof FormState>(key: Key, value: FormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startNewProfile() {
    setSelectedId(null);
    setForm({ ...EMPTY_FORM, isDefault: profiles.length === 0 });
    setConnectionCheck(null);
  }

  async function saveProfile() {
    try {
      setSaving(true);
      const response = await fetch(selectedId ? `/api/projects/${selectedId}` : "/api/projects", {
        method: selectedId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload(form)),
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "The website profile could not be saved.");
      }
      toast.success(selectedId ? "Project memory updated" : "Project memory created");
      await loadProfiles(payload.data.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The website profile could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteProfile() {
    if (!selectedId) return;
    try {
      setDeleting(true);
      const response = await fetch(`/api/projects/${selectedId}`, { method: "DELETE" });
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "The website profile could not be removed.");
      }
      toast.success("Project memory removed");
      await loadProfiles();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The website profile could not be removed.");
    } finally {
      setDeleting(false);
    }
  }

  async function runConnectionCheck() {
    if (!selectedId) {
      toast.error("Choose a saved project first so I know which integrations to test.");
      return;
    }

    try {
      setCheckingConnections(true);
      const response = await fetch(`/api/projects/${selectedId}/connections`);
      const payload = await response.json();
      if (!response.ok || !payload.success) {
        throw new Error(payload.reason || payload.error || "The project connections could not be checked.");
      }
      setConnectionCheck(payload.data as ConnectionCheckResult);
      toast.success("Connection check finished.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The project connections could not be checked.");
    } finally {
      setCheckingConnections(false);
    }
  }

  const memoryPreview = [
    form.brandVoice ? `Brand voice: ${form.brandVoice}` : null,
    form.businessGoal ? `Business goal: ${form.businessGoal}` : null,
    form.preferredAngles ? `Preferred backlink angles: ${toArray(form.preferredAngles).join(", ")}` : null,
    form.pillarTopics ? `Content pillars: ${toArray(form.pillarTopics).join(", ")}` : null,
    form.positioning ? `Market position: ${form.positioning}` : null,
    form.searchConsoleSiteUrl ? `Search Console: ${form.searchConsoleSiteUrl}` : null,
    form.ga4PropertyId ? `GA4 property: ${form.ga4PropertyId}` : null,
    form.cmsProvider !== "none" ? `CMS: ${form.cmsProvider} (${form.cmsPublishStatus})` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <h1 className="font-heading text-3xl font-bold text-text-primary">Projects</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm text-text-secondary">
            Manage persistent website memory so chat, backlink discovery, qualification, and outreach all follow the right strategy per domain.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild><Link href="/chat">AI Chat<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button variant="outline" asChild><Link href="/agent">AI Agent<ArrowRight className="ml-2 h-4 w-4" /></Link></Button>
          <Button onClick={startNewProfile}><Plus className="mr-2 h-4 w-4" />New Project</Button>
        </div>
      </div>

      {loadError ? <ErrorState title="Project memory needs attention" message={loadError} onRetry={() => void loadProfiles()} /> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-primary/20 bg-primary-light/30"><CardContent className="p-6"><p className="text-sm text-text-secondary">Managed sites</p><p className="mt-2 text-3xl font-semibold text-text-primary">{profiles.length}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-text-secondary">Default memory</p><p className="mt-2 text-xl font-semibold text-text-primary">{defaultProfile?.name || "Not set"}</p><p className="mt-2 text-sm text-text-secondary">{defaultProfile?.domain || "Set a default project so general prompts always have a home."}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-text-secondary">Countries covered</p><p className="mt-2 text-3xl font-semibold text-text-primary">{new Set(profiles.map((profile) => profile.targetCountry).filter(Boolean)).size}</p></CardContent></Card>
        <Card><CardContent className="p-6"><p className="text-sm text-text-secondary">Memory readiness</p><p className="mt-2 text-3xl font-semibold text-text-primary">{readiness}%</p><p className="mt-2 text-sm text-text-secondary">Higher means the AI has stronger brand and growth context.</p></CardContent></Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Website Profiles</CardTitle>
            <CardDescription>Each site gets its own memory, goals, voice, and backlink rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? <p className="text-sm text-text-secondary">Loading website profiles...</p> : null}
            {!loading && profiles.length === 0 ? <div className="rounded-xl border border-dashed border-border bg-background p-5 text-sm text-text-secondary">No saved profiles yet. Create one to activate per-website AI memory.</div> : null}
            {!loading ? profiles.map((profile) => (
              <button key={profile.id} onClick={() => { setSelectedId(profile.id); setConnectionCheck(null); setForm(profileToForm(profile)); }} className={`w-full rounded-2xl border px-4 py-4 text-left transition-colors ${selectedId === profile.id ? "border-primary bg-primary-light/30" : "border-border bg-background hover:border-primary/30"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-text-primary">{profile.name}</p>
                    <p className="mt-1 text-sm text-text-secondary">{profile.domain}</p>
                  </div>
                  {profile.isDefault ? <Badge variant="success">Default</Badge> : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline">{profile.industry}</Badge>
                  <Badge variant="outline">{profile.targetCountry}</Badge>
                  {profile.searchConsoleSiteUrl ? <Badge variant="secondary">GSC</Badge> : null}
                  {profile.ga4PropertyId ? <Badge variant="secondary">GA4</Badge> : null}
                  {profile.cmsProvider !== "none" ? <Badge variant="secondary">{profile.cmsProvider}</Badge> : null}
                </div>
                <p className="mt-3 text-xs text-text-muted">Updated {formatDateTime(profile.updatedAt)}</p>
              </button>
            )) : null}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>{selectedId ? "Edit Project Memory" : "Create Project Memory"}</CardTitle>
              <CardDescription>This memory is injected into AI chat and the autonomous backlink pipeline.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Project name</label><Input value={form.name} onChange={(event) => updateField("name", event.target.value)} placeholder="TechGeekStudio SEO" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Website URL</label><Input value={form.websiteUrl} onChange={(event) => updateField("websiteUrl", event.target.value)} placeholder="https://example.com" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Industry</label><Input value={form.industry} onChange={(event) => updateField("industry", event.target.value)} placeholder="B2B SaaS" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Target country</label><Input value={form.targetCountry} onChange={(event) => updateField("targetCountry", event.target.value)} placeholder="United States" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Target audience</label><Input value={form.targetAudience} onChange={(event) => updateField("targetAudience", event.target.value)} placeholder="Founders, marketers, demand gen leaders" /></div>
                <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Brand voice</label><Input value={form.brandVoice} onChange={(event) => updateField("brandVoice", event.target.value)} placeholder="Authoritative, practical, senior-operator tone" /></div>
              </div>

              <Tabs defaultValue="strategy">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="strategy">Strategy</TabsTrigger>
                  <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="market">Market</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                </TabsList>
                <TabsContent value="strategy" className="space-y-4">
                  <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Business goal</label><Textarea value={form.businessGoal} onChange={(event) => updateField("businessGoal", event.target.value)} rows={4} placeholder="Grow qualified demo requests from SEO landing pages." /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Primary services</label><Textarea value={form.primaryServices} onChange={(event) => updateField("primaryServices", event.target.value)} rows={6} placeholder={"AI SEO strategy\nTechnical SEO\nBacklink acquisition"} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Conversion goals</label><Textarea value={form.conversionGoals} onChange={(event) => updateField("conversionGoals", event.target.value)} rows={6} placeholder={"Book strategy calls\nCapture qualified leads\nGrow subscriber list"} /></div>
                  </div>
                  <label className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
                    <input type="checkbox" className="mt-1" checked={form.isDefault} onChange={(event) => updateField("isDefault", event.target.checked)} />
                    <div><p className="font-medium text-text-primary">Use as default website memory</p><p className="text-sm text-text-secondary">This profile is used when a prompt does not clearly name a website.</p></div>
                  </label>
                </TabsContent>
                <TabsContent value="backlinks" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Preferred angles</label><Textarea value={form.preferredAngles} onChange={(event) => updateField("preferredAngles", event.target.value)} rows={6} placeholder={"Guest posts with real insight\nResource page mentions\nPartnership links"} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Avoid patterns</label><Textarea value={form.avoidPatterns} onChange={(event) => updateField("avoidPatterns", event.target.value)} rows={6} placeholder={"PBNs\nCasino / pharma adjacency\nSpammy paid directories"} /></div>
                  </div>
                  <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Anchor guidelines</label><Textarea value={form.anchorGuidelines} onChange={(event) => updateField("anchorGuidelines", event.target.value)} rows={4} placeholder="Prefer partial-match branded anchors and contextual placements. Avoid repetitive exact match anchors." /></div>
                </TabsContent>
                <TabsContent value="content" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Pillar topics</label><Textarea value={form.pillarTopics} onChange={(event) => updateField("pillarTopics", event.target.value)} rows={6} placeholder={"AI SEO\nTechnical SEO for Next.js\nBacklinks for SaaS"} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">E-E-A-T notes</label><Textarea value={form.eeatNotes} onChange={(event) => updateField("eeatNotes", event.target.value)} rows={6} placeholder={"Reference real campaign data\nShow operator screenshots\nLead with practical experience"} /></div>
                  </div>
                  <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Freshness cadence</label><Input value={form.freshnessCadence} onChange={(event) => updateField("freshnessCadence", event.target.value)} placeholder="Refresh key pages every 45 days and pillar content quarterly." /></div>
                </TabsContent>
                <TabsContent value="market" className="space-y-4">
                  <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Positioning</label><Textarea value={form.positioning} onChange={(event) => updateField("positioning", event.target.value)} rows={4} placeholder="We win by combining technical execution, AI workflows, and revenue-focused SEO." /></div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Competitors</label><Textarea value={form.competitors} onChange={(event) => updateField("competitors", event.target.value)} rows={6} placeholder={"competitor-one.com\ncompetitor-two.com"} /></div>
                    <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Differentiators</label><Textarea value={form.differentiators} onChange={(event) => updateField("differentiators", event.target.value)} rows={6} placeholder={"Senior-led strategy\nFast implementation\nAI-assisted systems with human QA"} /></div>
                  </div>
                </TabsContent>
                <TabsContent value="integrations" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Search Console property</label>
                      <Input value={form.searchConsoleSiteUrl} onChange={(event) => updateField("searchConsoleSiteUrl", event.target.value)} placeholder="https://example.com/ or sc-domain:example.com" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">GA4 property ID</label>
                      <Input value={form.ga4PropertyId} onChange={(event) => updateField("ga4PropertyId", event.target.value)} placeholder="123456789" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">CMS provider</label>
                      <select value={form.cmsProvider} onChange={(event) => updateField("cmsProvider", event.target.value as FormState["cmsProvider"])} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-text-primary">
                        <option value="none">No CMS connection</option>
                        <option value="wordpress">WordPress</option>
                        <option value="webhook">Webhook</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">Publish mode</label>
                      <select value={form.cmsPublishStatus} onChange={(event) => updateField("cmsPublishStatus", event.target.value as FormState["cmsPublishStatus"])} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-text-primary">
                        <option value="draft">Draft</option>
                        <option value="publish">Publish immediately</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">CMS base URL</label>
                      <Input value={form.cmsBaseUrl} onChange={(event) => updateField("cmsBaseUrl", event.target.value)} placeholder="https://example.com" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">CMS username</label>
                      <Input value={form.cmsUsername} onChange={(event) => updateField("cmsUsername", event.target.value)} placeholder="wordpress-user" />
                    </div>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">CMS app password / token</label>
                      <Input value={form.cmsAppPassword} onChange={(event) => updateField("cmsAppPassword", event.target.value)} placeholder={selectedProfile?.hasCmsSecret ? "Leave blank to keep the saved secret" : "Paste app password or webhook token"} type="password" />
                      <p className="mt-1 text-xs text-text-muted">
                        {selectedProfile?.hasCmsSecret
                          ? `Saved secret: ${selectedProfile.cmsSecretPreview || "Configured"}`
                          : "The secret is encrypted before it is stored."}
                      </p>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-text-primary">CMS webhook URL</label>
                      <Input value={form.cmsWebhookUrl} onChange={(event) => updateField("cmsWebhookUrl", event.target.value)} placeholder="https://example.com/api/publish" />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border bg-background p-4 text-sm text-text-secondary">
                    Live reports and chat can use Search Console and GA4 data immediately. CMS settings are used for direct publishing workflows and stay isolated per website.
                  </div>
                </TabsContent>
              </Tabs>

              <div><label className="mb-1.5 block text-sm font-medium text-text-primary">Operator notes</label><Textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} rows={4} placeholder="Anything the AI should remember when answering, qualifying prospects, or writing outreach." /></div>

              <div className="flex flex-wrap gap-3">
                <Button onClick={() => void saveProfile()} disabled={saving || deleting}><Save className="mr-2 h-4 w-4" />{selectedId ? "Save Changes" : "Create Project"}</Button>
                <Button variant="outline" onClick={startNewProfile} disabled={saving || deleting}><Plus className="mr-2 h-4 w-4" />New Blank Profile</Button>
                <Button variant="outline" onClick={() => void runConnectionCheck()} disabled={!selectedId || saving || deleting || checkingConnections}>{checkingConnections ? "Checking..." : "Check Connections"}</Button>
                <Button variant="outline" onClick={() => void deleteProfile()} disabled={!selectedId || saving || deleting} className="text-error hover:text-error"><Trash2 className="mr-2 h-4 w-4" />Delete</Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-primary/20 bg-primary-light/30">
              <CardHeader><CardTitle>Memory Preview</CardTitle><CardDescription>This is the kind of context the AI will automatically carry into work for this site.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {memoryPreview.length ? memoryPreview.map((item) => <div key={item} className="rounded-xl border border-primary/10 bg-background/70 px-4 py-3 text-sm text-text-primary">{item}</div>) : <div className="rounded-xl border border-dashed border-border bg-background/70 px-4 py-6 text-sm text-text-secondary">Add brand voice, business goal, backlink rules, and content pillars to make the AI far more site-specific.</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>What This Powers</CardTitle><CardDescription>The memory layer is already connected to the most important AI surfaces.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><Bot className="mt-0.5 h-4 w-4 text-primary" /><div><p className="font-medium text-text-primary">AI Chat</p><p className="text-sm text-text-secondary">General prompts auto-resolve to the most relevant website memory before answering.</p></div></div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><Link2 className="mt-0.5 h-4 w-4 text-primary" /><div><p className="font-medium text-text-primary">Backlink Agent</p><p className="text-sm text-text-secondary">Discovery, qualification, and outreach follow the site’s angle preferences and risk guardrails.</p></div></div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><Target className="mt-0.5 h-4 w-4 text-primary" /><div><p className="font-medium text-text-primary">Conversion focus</p><p className="text-sm text-text-secondary">Business goals and conversion targets stay attached to the right domain.</p></div></div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><Globe className="mt-0.5 h-4 w-4 text-primary" /><div><p className="font-medium text-text-primary">Multi-site isolation</p><p className="text-sm text-text-secondary">Each site keeps separate positioning, competitors, and content plans.</p></div></div>
                <div className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4"><Globe className="mt-0.5 h-4 w-4 text-primary" /><div><p className="font-medium text-text-primary">Live analytics context</p><p className="text-sm text-text-secondary">Connected Search Console and GA4 properties feed external performance context into reports and AI answers.</p></div></div>
                {connectionCheck ? (
                  <div className="rounded-2xl border border-border bg-background p-4 text-sm">
                    <p className="font-medium text-text-primary">Latest connection check</p>
                    <div className="mt-3 space-y-2 text-text-secondary">
                      <div>Search Console: <span className={connectionCheck.searchConsole.ok ? "text-success" : "text-warning"}>{connectionCheck.searchConsole.message}</span></div>
                      <div>GA4: <span className={connectionCheck.ga4.ok ? "text-success" : "text-warning"}>{connectionCheck.ga4.message}</span></div>
                      <div>CMS: <span className={connectionCheck.cms.ok ? "text-success" : "text-warning"}>{connectionCheck.cms.message}</span></div>
                      {connectionCheck.warnings.length ? (
                        <div className="rounded-xl border border-warning/20 bg-warning-light/10 p-3 text-warning">
                          {connectionCheck.warnings.join(" ")}
                        </div>
                      ) : null}
                    </div>
                    <p className="mt-3 text-xs text-text-muted">Checked {formatDateTime(connectionCheck.fetchedAt)}</p>
                  </div>
                ) : null}
                {selectedProfile ? <p className="text-xs text-text-muted">Current profile updated {formatDateTime(selectedProfile.updatedAt)}</p> : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

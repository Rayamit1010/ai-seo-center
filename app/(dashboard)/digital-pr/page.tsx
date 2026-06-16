"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Newspaper, Plus, Trash2, ChevronDown, ChevronUp, Copy, CheckCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface PrCoverage {
  id: string;
  publicationName: string;
  coverageUrl: string | null;
  mentionType: string | null;
  publishedAt: string | null;
  dofollow: boolean | null;
}

interface PrCampaign {
  id: string;
  title: string;
  topic: string;
  angle: string | null;
  niche: string | null;
  status: string;
  pressRelease: string | null;
  pitchTemplate: string | null;
  targetPublications: string | null;
  createdAt: string;
  _count?: { coverages: number };
  coverages?: PrCoverage[];
}

interface Publication {
  name: string;
  url: string;
  beat: string;
  pitchTips: string;
  tier: string;
  estimatedDA: number;
}

function statusBadge(status: string) {
  if (status === "active") return <Badge variant="success">Active</Badge>;
  if (status === "completed") return <Badge variant="secondary">Completed</Badge>;
  return <Badge variant="outline">Draft</Badge>;
}

function tierBadge(tier: string) {
  if (tier === "A") return <Badge variant="destructive" className="text-xs">Tier A</Badge>;
  if (tier === "B") return <Badge variant="warning" className="text-xs">Tier B</Badge>;
  return <Badge variant="outline" className="text-xs">Tier C</Badge>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={copy}>
      {copied ? <CheckCheck className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}

export default function DigitalPrPage() {
  const [campaigns, setCampaigns] = useState<PrCampaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedCoverage, setExpandedCoverage] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Generator form
  const [gen, setGen] = useState({ title: "", topic: "", angle: "", niche: "", keyMessages: "" });
  const [generatingRelease, setGeneratingRelease] = useState(false);
  const [generatingPitch, setGeneratingPitch] = useState(false);
  const [generatingPubs, setGeneratingPubs] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [release, setRelease] = useState<Record<string, unknown> | null>(null);
  const [pitch, setPitch] = useState<Record<string, string> | null>(null);
  const [publications, setPublications] = useState<Publication[]>([]);

  // Pitch generator within campaigns tab
  const [pitchForm, setPitchForm] = useState({ contactName: "", publication: "", beat: "" });
  const [pitchCampaignId, setPitchCampaignId] = useState<string | null>(null);
  const [generatingInlinePitch, setGeneratingInlinePitch] = useState(false);

  // Coverage form
  const [covForm, setCovForm] = useState({ publicationName: "", coverageUrl: "", mentionType: "mention", publishedAt: "", dofollow: false });
  const [addingCoverage, setAddingCoverage] = useState<string | null>(null);

  const loadCampaigns = useCallback(async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch("/api/digital-pr/campaigns");
      const json = (await res.json()) as { success?: boolean; data?: PrCampaign[] };
      if (json.success && json.data) setCampaigns(json.data);
    } catch { toast.error("Failed to load campaigns"); }
    finally { setLoadingCampaigns(false); }
  }, []);

  useEffect(() => { void loadCampaigns(); }, [loadCampaigns]);

  const generateRelease = async () => {
    if (!gen.topic || !gen.angle || !gen.niche) { toast.error("Topic, angle, and niche required"); return; }
    setGeneratingRelease(true);
    try {
      const res = await fetch("/api/digital-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate-release", ...gen, keyMessages: gen.keyMessages.split("\n").filter(Boolean) }),
      });
      const json = (await res.json()) as { success?: boolean; data?: Record<string, unknown>; error?: string };
      if (json.success && json.data) { setRelease(json.data); toast.success("Press release generated!"); }
      else toast.error(json.error ?? "Generation failed");
    } catch { toast.error("Generation failed"); }
    finally { setGeneratingRelease(false); }
  };

  const generatePubs = async () => {
    if (!gen.topic || !gen.angle || !gen.niche) { toast.error("Topic, angle, and niche required"); return; }
    setGeneratingPubs(true);
    try {
      const res = await fetch("/api/digital-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suggest-publications", topic: gen.topic, angle: gen.angle, niche: gen.niche }),
      });
      const json = (await res.json()) as { success?: boolean; data?: { publications: Publication[] }; error?: string };
      if (json.success && json.data?.publications) { setPublications(json.data.publications); toast.success("Publications suggested!"); }
      else toast.error(json.error ?? "Failed");
    } catch { toast.error("Failed"); }
    finally { setGeneratingPubs(false); }
  };

  const generateInlinePitch = async (campaign: PrCampaign) => {
    if (!pitchForm.contactName || !pitchForm.publication) { toast.error("Contact name and publication required"); return; }
    setPitchCampaignId(campaign.id);
    setGeneratingInlinePitch(true);
    try {
      const res = await fetch("/api/digital-pr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate-pitch",
          topic: campaign.topic,
          angle: campaign.angle ?? "",
          headline: (release as Record<string, string> | null)?.headline ?? campaign.topic,
          ...pitchForm,
        }),
      });
      const json = (await res.json()) as { success?: boolean; data?: Record<string, string>; error?: string };
      if (json.success && json.data) {
        setPitch(json.data);
        // Save pitch to campaign
        await fetch(`/api/digital-pr/campaigns/${campaign.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pitchTemplate: formatPitch(json.data) }),
        });
        toast.success("Pitch generated and saved!");
        void loadCampaigns();
      } else toast.error(json.error ?? "Failed");
    } catch { toast.error("Failed"); }
    finally { setGeneratingInlinePitch(false); setPitchCampaignId(null); }
  };

  const formatPitch = (p: Record<string, string>) =>
    `Subject: ${p.subject ?? ""}\n\n${p.greeting ?? ""}\n\n${p.hook ?? ""}\n\n${p.pitch ?? ""}\n\n${p.teaser ?? ""}\n\n${p.cta ?? ""}\n\n${p.signature ?? ""}`;

  const saveCampaign = async () => {
    if (!gen.title || !gen.topic) { toast.error("Title and topic required"); return; }
    setSavingCampaign(true);
    try {
      const res = await fetch("/api/digital-pr/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: gen.title,
          topic: gen.topic,
          angle: gen.angle,
          niche: gen.niche,
          keyMessages: gen.keyMessages.split("\n").filter(Boolean),
          pressRelease: release ? JSON.stringify(release) : undefined,
          pitchTemplate: pitch ? formatPitch(pitch as Record<string, string>) : undefined,
          targetPublications: publications.length ? publications : undefined,
        }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        toast.success("Campaign saved!");
        setGen({ title: "", topic: "", angle: "", niche: "", keyMessages: "" });
        setRelease(null); setPitch(null); setPublications([]);
        void loadCampaigns();
      } else toast.error(json.error ?? "Failed to save");
    } catch { toast.error("Failed to save campaign"); }
    finally { setSavingCampaign(false); }
  };

  const deleteCampaign = async (id: string) => {
    setDeletingId(id);
    try {
      await fetch(`/api/digital-pr/campaigns/${id}`, { method: "DELETE" });
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
      toast.success("Campaign deleted");
    } catch { toast.error("Failed to delete"); }
    finally { setDeletingId(null); }
  };

  const addCoverage = async (campaignId: string) => {
    if (!covForm.publicationName) { toast.error("Publication name required"); return; }
    setAddingCoverage(campaignId);
    try {
      const res = await fetch(`/api/digital-pr/campaigns/${campaignId}/coverage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...covForm, dofollow: covForm.mentionType === "backlink" ? covForm.dofollow : undefined }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) { toast.success("Coverage added!"); setCovForm({ publicationName: "", coverageUrl: "", mentionType: "mention", publishedAt: "", dofollow: false }); void loadCampaigns(); }
      else toast.error(json.error ?? "Failed");
    } catch { toast.error("Failed"); }
    finally { setAddingCoverage(null); }
  };

  const deleteCoverage = async (campaignId: string, covId: string) => {
    try {
      await fetch(`/api/digital-pr/campaigns/${campaignId}/coverage?covId=${covId}`, { method: "DELETE" });
      toast.success("Coverage removed");
      void loadCampaigns();
    } catch { toast.error("Failed to remove coverage"); }
  };

  const releaseText = release
    ? [
        `# ${(release as Record<string, string>).headline ?? ""}`,
        `## ${(release as Record<string, string>).subheadline ?? ""}`,
        `\n${(release as Record<string, string>).dateline ?? ""}`,
        `\n${(release as Record<string, string>).intro ?? ""}`,
        ...((release as Record<string, string[]>).bodyParagraphs ?? []).map((p) => `\n${p}`),
        `\n"${(release as Record<string, Record<string, string>>).quote?.text ?? ""}" — ${(release as Record<string, Record<string, string>>).quote?.attribution ?? ""}`,
        `\n###\n${(release as Record<string, string>).boilerplate ?? ""}`,
      ].join("\n")
    : "";

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Digital PR Engine</h2>
        <p className="mt-1 text-text-secondary">AI-powered press releases, journalist pitches, and media coverage tracking</p>
      </div>

      <Tabs defaultValue="generate">
        <TabsList className="border border-border">
          <TabsTrigger value="generate">Campaign Generator</TabsTrigger>
          <TabsTrigger value="campaigns">My Campaigns ({campaigns.length})</TabsTrigger>
        </TabsList>

        {/* ── Generator ── */}
        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Campaign Brief</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Campaign Title *</label>
                  <Input placeholder="Q3 Product Launch PR" value={gen.title} onChange={(e) => setGen((p) => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Industry/Niche *</label>
                  <Input placeholder="SaaS, FinTech, Local Restaurant..." value={gen.niche} onChange={(e) => setGen((p) => ({ ...p, niche: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Story Topic *</label>
                  <Input placeholder="We just launched AI-powered SEO reporting for agencies..." value={gen.topic} onChange={(e) => setGen((p) => ({ ...p, topic: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">News Angle *</label>
                  <Input placeholder="First AI tool to cut agency reporting time by 80%" value={gen.angle} onChange={(e) => setGen((p) => ({ ...p, angle: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Key Messages (one per line)</label>
                  <Textarea placeholder="10x faster than manual reporting&#10;Used by 500+ agencies&#10;Free 30-day trial" value={gen.keyMessages} onChange={(e) => setGen((p) => ({ ...p, keyMessages: e.target.value }))} className="min-h-[80px] font-mono text-xs" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={generateRelease} disabled={generatingRelease} variant="default" className="gap-2">
                  {generatingRelease ? <Loader2 className="h-4 w-4 animate-spin" /> : <Newspaper className="h-4 w-4" />}
                  Generate Press Release
                </Button>
                <Button onClick={generatePubs} disabled={generatingPubs} variant="outline" className="gap-2">
                  {generatingPubs ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Suggest Publications
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Generated press release */}
          {release && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Press Release</CardTitle>
                <CopyButton text={releaseText} />
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-lg font-bold text-text-primary">{(release as Record<string, string>).headline}</p>
                <p className="text-sm font-medium text-text-secondary">{(release as Record<string, string>).subheadline}</p>
                <p className="text-xs text-text-muted">{(release as Record<string, string>).dateline}</p>
                <p className="text-sm text-text-primary">{(release as Record<string, string>).intro}</p>
                {((release as Record<string, string[]>).bodyParagraphs ?? []).map((p, i) => (
                  <p key={i} className="text-sm text-text-secondary">{p}</p>
                ))}
                {(release as Record<string, Record<string, string>>).quote && (
                  <blockquote className="border-l-2 border-primary pl-3">
                    <p className="text-sm italic text-text-primary">&ldquo;{(release as Record<string, Record<string, string>>).quote.text}&rdquo;</p>
                    <p className="mt-1 text-xs text-text-muted">— {(release as Record<string, Record<string, string>>).quote.attribution}</p>
                  </blockquote>
                )}

                {/* Pitch generator within release card */}
                <div className="mt-4 rounded-lg border border-border p-4">
                  <p className="mb-3 text-sm font-medium text-text-primary">Generate Pitch Email</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Input placeholder="Journalist name" value={pitchForm.contactName} onChange={(e) => setPitchForm((p) => ({ ...p, contactName: e.target.value }))} />
                    <Input placeholder="Publication" value={pitchForm.publication} onChange={(e) => setPitchForm((p) => ({ ...p, publication: e.target.value }))} />
                    <Input placeholder="Their beat / focus" value={pitchForm.beat} onChange={(e) => setPitchForm((p) => ({ ...p, beat: e.target.value }))} />
                  </div>
                  <Button
                    size="sm" className="mt-3 gap-2" variant="outline"
                    disabled={generatingPitch}
                    onClick={async () => {
                      if (!pitchForm.contactName || !pitchForm.publication) { toast.error("Contact name and publication required"); return; }
                      setGeneratingPitch(true);
                      try {
                        const res = await fetch("/api/digital-pr", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "generate-pitch", topic: gen.topic, angle: gen.angle, headline: (release as Record<string, string>).headline, ...pitchForm }),
                        });
                        const json = (await res.json()) as { success?: boolean; data?: Record<string, string>; error?: string };
                        if (json.success && json.data) { setPitch(json.data); toast.success("Pitch generated!"); }
                        else toast.error(json.error ?? "Failed");
                      } catch { toast.error("Failed"); }
                      finally { setGeneratingPitch(false); }
                    }}
                  >
                    {generatingPitch ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Generate Pitch
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Generated pitch */}
          {pitch && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Pitch Email</CardTitle>
                <CopyButton text={formatPitch(pitch)} />
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-xs font-medium text-text-muted">Subject: <span className="font-bold text-text-primary">{pitch.subject}</span></p>
                <div className="rounded-lg bg-background p-3 font-mono text-xs text-text-secondary whitespace-pre-wrap">
                  {formatPitch(pitch)}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Target publications */}
          {publications.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Target Publications ({publications.length})</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {publications.map((pub, i) => (
                  <div key={i} className="flex items-start justify-between rounded-lg bg-background p-3">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        {tierBadge(pub.tier)}
                        <span className="text-xs text-text-muted">DA ~{pub.estimatedDA}</span>
                      </div>
                      <p className="font-medium text-sm text-text-primary">{pub.name}</p>
                      <p className="text-xs text-text-muted">Beat: {pub.beat}</p>
                      <p className="mt-1 text-xs text-text-secondary">{pub.pitchTips}</p>
                    </div>
                    <a href={pub.url} target="_blank" rel="noopener noreferrer" className="ml-2 shrink-0">
                      <ExternalLink className="h-4 w-4 text-text-muted hover:text-primary" />
                    </a>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {(release || publications.length > 0) && (
            <Button onClick={saveCampaign} disabled={savingCampaign} className="gap-2">
              {savingCampaign ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Save Campaign
            </Button>
          )}
        </TabsContent>

        {/* ── Campaigns ── */}
        <TabsContent value="campaigns">
          {loadingCampaigns ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : campaigns.length === 0 ? (
            <Card><CardContent className="p-12 text-center">
              <Newspaper className="mx-auto mb-4 h-12 w-12 text-text-muted" />
              <p className="text-text-secondary">No campaigns yet. Use the Generator tab to create your first one.</p>
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => {
                const isExpanded = expandedId === campaign.id;
                const pubList: Publication[] = campaign.targetPublications ? JSON.parse(campaign.targetPublications) : [];

                return (
                  <Card key={campaign.id}>
                    <CardContent className="p-0">
                      {/* Campaign header row */}
                      <div className="flex items-center justify-between p-4 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : campaign.id)}>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            {statusBadge(campaign.status)}
                            <Badge variant="outline" className="text-xs">{campaign._count?.coverages ?? 0} coverage{(campaign._count?.coverages ?? 0) !== 1 ? "s" : ""}</Badge>
                          </div>
                          <p className="font-medium text-sm text-text-primary">{campaign.title}</p>
                          <p className="text-xs text-text-muted truncate">{campaign.topic}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error" disabled={deletingId === campaign.id} onClick={(e) => { e.stopPropagation(); void deleteCampaign(campaign.id); }}>
                            {deletingId === campaign.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </Button>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="border-t border-border p-4 space-y-4">
                          {/* Press release */}
                          {campaign.pressRelease && (() => {
                            const pr = JSON.parse(campaign.pressRelease) as Record<string, unknown>;
                            return (
                              <div>
                                <div className="mb-2 flex items-center justify-between">
                                  <p className="text-sm font-semibold text-text-primary">Press Release</p>
                                  <CopyButton text={JSON.stringify(pr)} />
                                </div>
                                <div className="rounded-lg bg-background p-3 text-xs text-text-secondary space-y-1">
                                  <p className="font-bold">{pr.headline as string}</p>
                                  <p className="text-text-muted">{pr.subheadline as string}</p>
                                  <p className="mt-2">{pr.intro as string}</p>
                                </div>
                              </div>
                            );
                          })()}

                          {/* Pitch template */}
                          {campaign.pitchTemplate && (
                            <div>
                              <div className="mb-2 flex items-center justify-between">
                                <p className="text-sm font-semibold text-text-primary">Pitch Email</p>
                                <CopyButton text={campaign.pitchTemplate} />
                              </div>
                              <div className="rounded-lg bg-background p-3 font-mono text-xs text-text-secondary whitespace-pre-wrap max-h-48 overflow-y-auto">
                                {campaign.pitchTemplate}
                              </div>
                            </div>
                          )}

                          {/* Generate pitch inline */}
                          {!campaign.pitchTemplate && (
                            <div className="rounded-lg border border-dashed border-border p-3">
                              <p className="mb-2 text-xs text-text-muted">Generate a personalized pitch for this campaign:</p>
                              <div className="grid gap-2 sm:grid-cols-3">
                                <Input placeholder="Journalist name" value={pitchCampaignId === campaign.id ? pitchForm.contactName : ""} onChange={(e) => setPitchForm((p) => ({ ...p, contactName: e.target.value }))} className="text-xs" />
                                <Input placeholder="Publication" value={pitchCampaignId === campaign.id ? pitchForm.publication : ""} onChange={(e) => setPitchForm((p) => ({ ...p, publication: e.target.value }))} className="text-xs" />
                                <Input placeholder="Their beat" value={pitchCampaignId === campaign.id ? pitchForm.beat : ""} onChange={(e) => setPitchForm((p) => ({ ...p, beat: e.target.value }))} className="text-xs" />
                              </div>
                              <Button size="sm" variant="outline" className="mt-2 gap-2 text-xs" disabled={generatingInlinePitch && pitchCampaignId === campaign.id} onClick={() => void generateInlinePitch(campaign)}>
                                {generatingInlinePitch && pitchCampaignId === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                                Generate Pitch
                              </Button>
                            </div>
                          )}

                          {/* Target publications */}
                          {pubList.length > 0 && (
                            <div>
                              <p className="mb-2 text-sm font-semibold text-text-primary">Target Publications</p>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {pubList.slice(0, 6).map((pub, i) => (
                                  <div key={i} className="flex items-center gap-2 rounded-lg bg-background px-3 py-2">
                                    {tierBadge(pub.tier)}
                                    <span className="text-xs font-medium text-text-primary truncate">{pub.name}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Coverage */}
                          <div>
                            <div className="mb-2 flex items-center justify-between">
                              <p className="text-sm font-semibold text-text-primary">Coverage Tracker</p>
                              <button className="text-xs text-primary hover:underline" onClick={() => setExpandedCoverage(expandedCoverage === campaign.id ? null : campaign.id)}>
                                {expandedCoverage === campaign.id ? "Hide" : "Add Coverage"}
                              </button>
                            </div>

                            {expandedCoverage === campaign.id && (
                              <div className="mb-3 rounded-lg border border-border p-3 space-y-2">
                                <div className="grid gap-2 sm:grid-cols-2">
                                  <Input placeholder="Publication name *" value={covForm.publicationName} onChange={(e) => setCovForm((p) => ({ ...p, publicationName: e.target.value }))} className="text-xs" />
                                  <Input placeholder="Coverage URL" value={covForm.coverageUrl} onChange={(e) => setCovForm((p) => ({ ...p, coverageUrl: e.target.value }))} className="text-xs" />
                                </div>
                                <div className="grid gap-2 sm:grid-cols-3">
                                  <Select value={covForm.mentionType} onValueChange={(v) => setCovForm((p) => ({ ...p, mentionType: v }))}>
                                    <SelectTrigger className="text-xs"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="full_story">Full Story</SelectItem>
                                      <SelectItem value="mention">Mention</SelectItem>
                                      <SelectItem value="backlink">Backlink</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <Input type="date" value={covForm.publishedAt} onChange={(e) => setCovForm((p) => ({ ...p, publishedAt: e.target.value }))} className="text-xs" />
                                  {covForm.mentionType === "backlink" && (
                                    <label className="flex items-center gap-2 text-xs text-text-secondary">
                                      <input type="checkbox" checked={covForm.dofollow} onChange={(e) => setCovForm((p) => ({ ...p, dofollow: e.target.checked }))} />
                                      Dofollow link
                                    </label>
                                  )}
                                </div>
                                <Button size="sm" className="gap-2 text-xs" disabled={addingCoverage === campaign.id} onClick={() => void addCoverage(campaign.id)}>
                                  {addingCoverage === campaign.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                                  Add
                                </Button>
                              </div>
                            )}

                            {(campaign.coverages ?? []).length === 0 ? (
                              <p className="text-xs text-text-muted">No coverage logged yet.</p>
                            ) : (
                              <ul className="space-y-1">
                                {(campaign.coverages ?? []).map((cov) => (
                                  <li key={cov.id} className="flex items-center justify-between rounded-lg bg-background px-3 py-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-text-primary">{cov.publicationName}</span>
                                        {cov.mentionType && <Badge variant="outline" className="text-[10px]">{cov.mentionType.replace("_", " ")}</Badge>}
                                        {cov.dofollow === true && <Badge variant="success" className="text-[10px]">Dofollow</Badge>}
                                      </div>
                                      {cov.coverageUrl && (
                                        <a href={cov.coverageUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">{cov.coverageUrl}</a>
                                      )}
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-error hover:text-error shrink-0" onClick={() => void deleteCoverage(campaign.id, cov.id)}>
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

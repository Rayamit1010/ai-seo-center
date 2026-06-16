"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, MapPin, RefreshCw, Trash2, Plus, CheckCircle, AlertTriangle, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface CitationBusiness {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  niche: string | null;
}

interface Citation {
  id: string;
  directoryName: string;
  directoryUrl: string;
  citationUrl: string | null;
  status: string | null;
  nameMatch: boolean | null;
  addressMatch: boolean | null;
  phoneMatch: boolean | null;
  lastCheckedAt: string | null;
}

interface Summary {
  total: number;
  verified: number;
  inconsistent: number;
  unreachable: number;
  unchecked: number;
}

const POPULAR_DIRECTORIES = [
  { name: "Google Business Profile", url: "https://business.google.com" },
  { name: "Yelp", url: "https://yelp.com" },
  { name: "Bing Places", url: "https://bingplaces.com" },
  { name: "Facebook Business", url: "https://facebook.com" },
  { name: "Apple Maps Connect", url: "https://mapsconnect.apple.com" },
  { name: "Foursquare", url: "https://foursquare.com" },
  { name: "Yellow Pages", url: "https://yellowpages.com" },
  { name: "BBB", url: "https://bbb.org" },
  { name: "TripAdvisor", url: "https://tripadvisor.com" },
  { name: "Trustpilot", url: "https://trustpilot.com" },
  { name: "Clutch", url: "https://clutch.co" },
  { name: "LinkedIn", url: "https://linkedin.com" },
];

function statusBadge(status: string | null) {
  if (status === "verified") return <Badge variant="success" className="gap-1"><CheckCircle className="h-3 w-3" />Verified</Badge>;
  if (status === "inconsistent") return <Badge variant="warning" className="gap-1"><AlertTriangle className="h-3 w-3" />Inconsistent</Badge>;
  if (status === "unreachable") return <Badge variant="destructive" className="gap-1"><WifiOff className="h-3 w-3" />Unreachable</Badge>;
  return <Badge variant="secondary">Not checked</Badge>;
}

function NapMatch({ label, match }: { label: string; match: boolean | null }) {
  if (match === null) return null;
  return (
    <span className={`text-xs ${match ? "text-success" : "text-error"}`}>
      {match ? "✓" : "✗"} {label}
    </span>
  );
}

export default function CitationsPage() {
  const [business, setBusiness] = useState<CitationBusiness | null>(null);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBiz, setSavingBiz] = useState(false);
  const [rechecking, setRechecking] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [bizForm, setBizForm] = useState({ name: "", address: "", city: "", state: "", country: "", phone: "", website: "", niche: "" });
  const [addForm, setAddForm] = useState({ directoryName: "", directoryUrl: "", citationUrl: "" });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/citations");
      const json = (await res.json()) as { success?: boolean; data?: { business: CitationBusiness | null; citations: Citation[]; summary: Summary | null }; error?: string };
      if (json.success && json.data) {
        setBusiness(json.data.business);
        setCitations(json.data.citations);
        setSummary(json.data.summary);
        if (json.data.business) {
          const b = json.data.business;
          setBizForm({ name: b.name, address: b.address ?? "", city: b.city ?? "", state: b.state ?? "", country: b.country ?? "", phone: b.phone ?? "", website: b.website ?? "", niche: b.niche ?? "" });
        }
      } else {
        toast.error(json.error ?? "Failed to load citations");
      }
    } catch {
      toast.error("Failed to load citations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const saveBusiness = async () => {
    if (!bizForm.name.trim()) { toast.error("Business name is required"); return; }
    setSavingBiz(true);
    try {
      const res = await fetch("/api/citations/business", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bizForm),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) { toast.success("Business profile saved"); void loadData(); }
      else toast.error(json.error ?? "Failed to save");
    } catch { toast.error("Failed to save business profile"); }
    finally { setSavingBiz(false); }
  };

  const addCitation = async () => {
    if (!addForm.directoryName.trim() || !addForm.directoryUrl.trim()) { toast.error("Directory name and URL are required"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/citations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) {
        toast.success("Citation added");
        setAddForm({ directoryName: "", directoryUrl: "", citationUrl: "" });
        void loadData();
      } else toast.error(json.error ?? "Failed to add");
    } catch { toast.error("Failed to add citation"); }
    finally { setAdding(false); }
  };

  const recheck = async (id: string) => {
    setRechecking(id);
    try {
      const res = await fetch(`/api/citations/${id}/check`, { method: "POST" });
      const json = (await res.json()) as { success?: boolean; data?: Citation; error?: string };
      if (json.success && json.data) {
        setCitations((prev) => prev.map((c) => c.id === id ? { ...c, ...json.data } : c));
        toast.success("Citation rechecked");
      } else toast.error(json.error ?? "Failed to recheck");
    } catch { toast.error("Failed to recheck"); }
    finally { setRechecking(null); }
  };

  const deleteCitation = async (id: string) => {
    setDeleting(id);
    try {
      const res = await fetch(`/api/citations/${id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (json.success) { setCitations((prev) => prev.filter((c) => c.id !== id)); toast.success("Removed"); }
      else toast.error(json.error ?? "Failed to remove");
    } catch { toast.error("Failed to remove"); }
    finally { setDeleting(null); }
  };

  const pickDirectory = (dir: { name: string; url: string }) => {
    setAddForm((p) => ({ ...p, directoryName: dir.name, directoryUrl: dir.url }));
  };

  if (loading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-heading text-2xl font-bold text-text-primary">Citation Manager</h2>
        <p className="mt-1 text-text-secondary">Track your local SEO citations across business directories and monitor NAP consistency</p>
      </div>

      <Tabs defaultValue={business ? "tracker" : "business"}>
        <TabsList className="border border-border">
          <TabsTrigger value="business">My Business</TabsTrigger>
          <TabsTrigger value="tracker">Citation Tracker</TabsTrigger>
        </TabsList>

        {/* ── Business Setup ── */}
        <TabsContent value="business">
          <Card>
            <CardHeader><CardTitle>Business Profile (NAP)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-text-secondary">Your Name, Address, and Phone (NAP) data. We use this to verify that each directory listing matches your correct information.</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Business Name *</label>
                  <Input placeholder="Acme Corp" value={bizForm.name} onChange={(e) => setBizForm((p) => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Phone</label>
                  <Input placeholder="+1 (555) 123-4567" value={bizForm.phone} onChange={(e) => setBizForm((p) => ({ ...p, phone: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Street Address</label>
                  <Input placeholder="123 Main St" value={bizForm.address} onChange={(e) => setBizForm((p) => ({ ...p, address: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">City</label>
                  <Input placeholder="San Francisco" value={bizForm.city} onChange={(e) => setBizForm((p) => ({ ...p, city: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">State / Region</label>
                  <Input placeholder="CA" value={bizForm.state} onChange={(e) => setBizForm((p) => ({ ...p, state: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Country</label>
                  <Input placeholder="USA" value={bizForm.country} onChange={(e) => setBizForm((p) => ({ ...p, country: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Website</label>
                  <Input placeholder="https://acmecorp.com" value={bizForm.website} onChange={(e) => setBizForm((p) => ({ ...p, website: e.target.value }))} />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1.5 block text-sm font-medium text-text-primary">Niche / Industry</label>
                  <Input placeholder="e.g. SaaS, Local Restaurant, Law Firm" value={bizForm.niche} onChange={(e) => setBizForm((p) => ({ ...p, niche: e.target.value }))} />
                </div>
              </div>
              <Button onClick={saveBusiness} disabled={savingBiz} className="gap-2">
                {savingBiz ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
                Save Business Profile
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Citation Tracker ── */}
        <TabsContent value="tracker" className="space-y-4">
          {!business && (
            <Card><CardContent className="p-6 text-center text-text-secondary">
              Set up your business profile first to start tracking citations.
            </CardContent></Card>
          )}

          {business && (
            <>
              {/* Summary cards */}
              {summary && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Total</p><p className="mt-1 text-2xl font-bold text-text-primary">{summary.total}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Verified</p><p className="mt-1 text-2xl font-bold text-success">{summary.verified}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Inconsistent</p><p className="mt-1 text-2xl font-bold text-warning">{summary.inconsistent}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Unreachable</p><p className="mt-1 text-2xl font-bold text-error">{summary.unreachable}</p></CardContent></Card>
                  <Card><CardContent className="p-4"><p className="text-xs text-text-muted">Unchecked</p><p className="mt-1 text-2xl font-bold text-text-secondary">{summary.unchecked}</p></CardContent></Card>
                </div>
              )}

              {/* Add citation */}
              <Card>
                <CardHeader><CardTitle className="text-base">Add Citation</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="mb-2 text-xs text-text-muted">Quick-select a popular directory:</p>
                    <div className="flex flex-wrap gap-2">
                      {POPULAR_DIRECTORIES.map((d) => (
                        <button
                          key={d.name}
                          onClick={() => pickDirectory(d)}
                          className="rounded-md border border-border px-2 py-1 text-xs text-text-secondary hover:border-primary hover:text-primary transition-colors"
                        >
                          {d.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-primary">Directory Name *</label>
                      <Input placeholder="Yelp" value={addForm.directoryName} onChange={(e) => setAddForm((p) => ({ ...p, directoryName: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-primary">Directory URL *</label>
                      <Input placeholder="https://yelp.com" value={addForm.directoryUrl} onChange={(e) => setAddForm((p) => ({ ...p, directoryUrl: e.target.value }))} />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-medium text-text-primary">Your Listing URL</label>
                      <Input placeholder="https://yelp.com/biz/acme-corp" value={addForm.citationUrl} onChange={(e) => setAddForm((p) => ({ ...p, citationUrl: e.target.value }))} />
                    </div>
                  </div>
                  <Button onClick={addCitation} disabled={adding} size="sm" className="gap-2">
                    {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Add Citation
                  </Button>
                </CardContent>
              </Card>

              {/* Citations list */}
              <Card>
                <CardContent className="p-0">
                  {citations.length === 0 ? (
                    <div className="p-12 text-center">
                      <MapPin className="mx-auto mb-4 h-12 w-12 text-text-muted" />
                      <p className="text-text-secondary">No citations tracked yet.</p>
                      <p className="mt-1 text-xs text-text-muted">Add a directory above to start monitoring your local presence.</p>
                    </div>
                  ) : (
                    <ul className="divide-y divide-border">
                      {citations.map((c) => (
                        <li key={c.id} className="flex items-start justify-between gap-3 p-4">
                          <div className="min-w-0 flex-1">
                            <div className="mb-1 flex flex-wrap items-center gap-2">
                              {statusBadge(c.status)}
                            </div>
                            <p className="font-medium text-sm text-text-primary">{c.directoryName}</p>
                            <a href={c.directoryUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted hover:text-primary">
                              {c.directoryUrl}
                            </a>
                            {c.citationUrl ? (
                              <a href={c.citationUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-xs text-primary hover:underline">
                                {c.citationUrl}
                              </a>
                            ) : (
                              <p className="text-xs text-text-muted italic">No listing URL — add one to enable verification</p>
                            )}
                            {c.status && c.status !== "unreachable" && (
                              <div className="mt-1 flex gap-3">
                                <NapMatch label="Name" match={c.nameMatch} />
                                <NapMatch label="Phone" match={c.phoneMatch} />
                                <NapMatch label="City" match={c.addressMatch} />
                              </div>
                            )}
                            <p className="mt-1 text-xs text-text-muted">
                              {c.lastCheckedAt ? `Checked ${new Date(c.lastCheckedAt).toLocaleString()}` : "Never checked"}
                            </p>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            {c.citationUrl && (
                              <Button variant="ghost" size="icon" className="h-8 w-8" title="Re-check" disabled={rechecking === c.id} onClick={() => recheck(c.id)}>
                                {rechecking === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-error hover:text-error" title="Remove" disabled={deleting === c.id} onClick={() => deleteCitation(c.id)}>
                              {deleting === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

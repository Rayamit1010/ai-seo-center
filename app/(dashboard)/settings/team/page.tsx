"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Users, UserPlus, Trash2, Shield } from "lucide-react";

interface TeamMemberData {
  id: string;
  role: string;
  joinedAt: string;
  user: { id: string; name: string | null; email: string | null };
}

interface TeamInviteData {
  id: string;
  email: string;
  role: string;
  expiresAt: string;
  createdAt: string;
}

interface TeamData {
  id: string;
  name: string;
  ownerId: string;
  members: TeamMemberData[];
  invites: TeamInviteData[];
}

interface ApiResponse {
  success?: boolean;
  data?: { team: TeamData; role: string } | null;
  error?: string;
}

export default function TeamSettingsPage() {
  const [teamData, setTeamData] = useState<{ team: TeamData; role: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamName, setTeamName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"viewer" | "admin">("viewer");
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/team");
      const json = (await res.json()) as ApiResponse;
      if (json.success && json.data) setTeamData(json.data);
      else setTeamData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  // Get current user id from session
  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((s: { user?: { id?: string } }) => {
      if (s?.user?.id) setUserId(s.user.id);
    }).catch(() => null);
  }, []);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: teamName.trim() }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) { toast.success("Team created!"); await load(); }
      else toast.error(json.error ?? "Failed to create team");
    } finally {
      setCreating(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      const json = (await res.json()) as { success?: boolean; error?: string };
      if (res.ok && json.success) { toast.success(`Invite sent to ${inviteEmail}`); setInviteEmail(""); await load(); }
      else toast.error(json.error ?? "Failed to send invite");
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Remove this team member?")) return;
    const res = await fetch(`/api/team/members/${memberId}`, { method: "DELETE" });
    if (res.ok) { toast.success("Member removed"); await load(); }
    else toast.error("Failed to remove member");
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await fetch("/api/team/invite", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inviteId }),
    });
    if (res.ok) { toast.success("Invite cancelled"); await load(); }
    else toast.error("Failed to cancel invite");
  };

  const handleChangeRole = async (memberId: string, role: "viewer" | "admin") => {
    const res = await fetch(`/api/team/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) { toast.success("Role updated"); await load(); }
    else toast.error("Failed to update role");
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;
  }

  if (!teamData) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Team</h1>
          <p className="mt-1 text-sm text-text-secondary">Create a team to collaborate with others.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-6">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-text-primary">Create Your Team</h2>
          </div>
          <form onSubmit={handleCreateTeam} className="flex gap-3">
            <input
              type="text"
              placeholder="Team name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
            <button type="submit" disabled={creating} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {creating ? "Creating…" : "Create Team"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const { team } = teamData;
  const isOwner = team.ownerId === userId;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{team.name}</h1>
          <p className="mt-1 text-sm text-text-secondary">{team.members.length} member{team.members.length !== 1 ? "s" : ""}</p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-text-primary">Members</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Member</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Role</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Joined</th>
              {isOwner && <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {team.members.map((member) => {
              const isThisOwner = member.user.id === team.ownerId;
              const letter = (member.user.name || member.user.email || "U")[0].toUpperCase();
              return (
                <tr key={member.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{letter}</div>
                      <div>
                        <p className="font-medium text-text-primary">{member.user.name ?? "Unknown"}</p>
                        <p className="text-xs text-text-muted">{member.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {isThisOwner ? (
                      <span className="flex items-center gap-1 text-xs text-amber-400"><Shield className="h-3 w-3" /> Owner</span>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-xs ${member.role === "admin" ? "bg-blue-500/20 text-blue-400" : "bg-surface text-text-muted border border-border"}`}>
                        {member.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-text-muted">{new Date(member.joinedAt).toLocaleDateString()}</td>
                  {isOwner && (
                    <td className="px-4 py-3">
                      {!isThisOwner && (
                        <div className="flex items-center gap-2">
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value as "viewer" | "admin")}
                            className="rounded border border-border bg-background px-2 py-1 text-xs text-text-primary"
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button onClick={() => handleRemoveMember(member.id)} className="text-text-muted hover:text-red-400">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {team.invites.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-text-primary">Pending Invites</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Email</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Role</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">Expires</th>
                {isOwner && <th className="px-4 py-2.5 text-xs font-medium text-text-muted">Action</th>}
              </tr>
            </thead>
            <tbody>
              {team.invites.map((inv) => (
                <tr key={inv.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2.5 text-text-secondary">{inv.email}</td>
                  <td className="px-4 py-2.5"><span className="text-xs text-text-muted">{inv.role}</span></td>
                  <td className="px-4 py-2.5 text-xs text-text-muted">{new Date(inv.expiresAt).toLocaleDateString()}</td>
                  {isOwner && (
                    <td className="px-4 py-2.5">
                      <button onClick={() => handleRevokeInvite(inv.id)} className="text-xs text-red-400 hover:underline">Revoke</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {isOwner && (
        <div className="rounded-xl border border-border bg-surface p-4">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold text-text-primary">Invite Member</h2>
          </div>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              placeholder="email@example.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as "viewer" | "admin")}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-text-primary focus:border-primary focus:outline-none"
            >
              <option value="viewer">Viewer</option>
              <option value="admin">Admin</option>
            </select>
            <button type="submit" disabled={inviting} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
              {inviting ? "Sending…" : "Invite"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

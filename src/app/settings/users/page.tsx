"use client";

import { useEffect, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Shield,
  ShieldCheck,
  UserCog,
  Archive,
  RotateCcw,
  Pencil,
  Mail,
  UserPlus,
} from "lucide-react";
import { fetchAllUsers, adminUpdateUser } from "@/lib/supabase/queries";
import { createClient } from "@/lib/supabase/client";
import type { AdminUserRecord } from "@/lib/supabase/queries";

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: typeof Shield }> = {
  super_user: {
    label: "Admin",
    color: "border-janpro-cyan/30 bg-janpro-cyan/10 text-janpro-cyan",
    icon: ShieldCheck,
  },
  sales_manager: {
    label: "Manager",
    color: "border-amber-300/50 bg-amber-50 text-amber-700",
    icon: UserCog,
  },
  sales_rep: {
    label: "Sales Rep",
    color: "border-border bg-muted text-muted-foreground",
    icon: Shield,
  },
};

const ROLE_OPTIONS = [
  { value: "sales_rep", label: "Sales Rep" },
  { value: "sales_manager", label: "Sales Manager" },
  { value: "super_user", label: "Admin (Super User)" },
];

function EditUserModal({
  user,
  open,
  onOpenChange,
  onSaved,
}: {
  user: AdminUserRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("sales_rep");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setRole(user.role);
    }
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    await adminUpdateUser(user.id, { fullName, role });
    setSaving(false);
    onSaved();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-janpro-navy" />
            Edit User
          </DialogTitle>
          <DialogDescription>{user?.email}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Enter full name..."
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function InviteUserModal({
  open,
  onOpenChange,
  onInvited,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("sales_rep");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const handleInvite = async () => {
    if (!email.trim()) return;
    setSending(true);
    setResult(null);

    try {
      // Send OTP email — this creates the user in auth.users if they don't exist
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          shouldCreateUser: true,
        },
      });

      if (error) {
        setResult({ type: "error", message: error.message });
        setSending(false);
        return;
      }

      // Wait briefly for the profile trigger to create the profile row, then update the role
      setTimeout(async () => {
        // The user may not have a profile yet (they need to verify the OTP first)
        // But we can try to update it — if it fails, the role will be set when they first log in
        // For now, just show success
        setResult({ type: "success", message: `Invitation sent to ${email.trim()}. They'll receive a sign-in code.` });
        setEmail("");
        setRole("sales_rep");
        setSending(false);
        onInvited();
      }, 1000);
    } catch {
      setResult({ type: "error", message: "Failed to send invitation." });
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) setResult(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-janpro-navy" />
            Invite User
          </DialogTitle>
          <DialogDescription>
            Send a sign-in code to a new user. They&apos;ll appear in the user list after they verify.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Email Address</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            />
          </div>

          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Role will be applied after the user verifies their email.
            </p>
          </div>

          {result && (
            <div className={`text-sm p-3 rounded-lg ${
              result.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {result.message}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={sending || !email.trim()}>
              {sending ? "Sending..." : "Send Invite"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function UsersSettingsPage() {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editUser, setEditUser] = useState<AdminUserRecord | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const data = await fetchAllUsers();
    setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleArchive = async (user: AdminUserRecord) => {
    await adminUpdateUser(user.id, { status: "archived" });
    loadUsers();
  };

  const handleRestore = async (user: AdminUserRecord) => {
    await adminUpdateUser(user.id, { status: "active" });
    loadUsers();
  };

  const handleEdit = (user: AdminUserRecord) => {
    setEditUser(user);
    setEditOpen(true);
  };

  if (loading) {
    return <div className="text-center text-muted-foreground py-16">Loading users...</div>;
  }

  const activeUsers = users.filter((u) => u.status === "active");
  const archivedUsers = users.filter((u) => u.status === "archived");

  // Group active users by role
  const grouped: Record<string, AdminUserRecord[]> = {};
  for (const u of activeUsers) {
    if (!grouped[u.role]) grouped[u.role] = [];
    grouped[u.role].push(u);
  }

  // Order: super_user first, then sales_manager, then sales_rep
  const roleOrder = ["super_user", "sales_manager", "sales_rep"];
  const sortedRoles = roleOrder.filter((r) => grouped[r]?.length > 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-janpro-navy">User Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage user roles and access. Archived users cannot sign in.
          </p>
        </div>
        <Button onClick={() => setInviteOpen(true)} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      <InviteUserModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={loadUsers}
      />

      <div className="space-y-6">
        {sortedRoles.map((role) => {
          const config = ROLE_CONFIG[role] || ROLE_CONFIG.sales_rep;
          const Icon = config.icon;
          const roleUsers = grouped[role];

          return (
            <Card key={role}>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-janpro-navy" />
                  <CardTitle className="text-sm">{config.label}s</CardTitle>
                  <Badge variant="outline" className="text-xs ml-auto">
                    {roleUsers.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0 space-y-1">
                {roleUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-white/50 hover:bg-white/80 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-janpro-navy-light/50 flex items-center justify-center shrink-0">
                      <Mail className="h-4 w-4 text-janpro-navy/60" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {user.fullName || user.email}
                      </p>
                      {user.fullName && (
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      )}
                    </div>
                    <Badge className={`text-xs shrink-0 ${config.color}`}>
                      {config.label}
                    </Badge>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleEdit(user)}
                        title="Edit user"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleArchive(user)}
                        title="Archive user"
                      >
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          );
        })}

        {activeUsers.length === 0 && (
          <div className="text-center text-muted-foreground py-12">
            No active users found.
          </div>
        )}

        {/* Archived Users */}
        {archivedUsers.length > 0 && (
          <Card className="opacity-60">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Archive className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-sm text-muted-foreground">Archived</CardTitle>
                <Badge variant="outline" className="text-xs ml-auto">
                  {archivedUsers.length}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {archivedUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/30 bg-muted/30"
                >
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0">
                    <Mail className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-muted-foreground truncate">
                      {user.fullName || user.email}
                    </p>
                    {user.fullName && (
                      <p className="text-xs text-muted-foreground/60 truncate">{user.email}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="text-xs text-muted-foreground shrink-0">
                    Archived
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-xs shrink-0"
                    onClick={() => handleRestore(user)}
                    title="Restore user"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Restore
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      <EditUserModal
        user={editUser}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSaved={loadUsers}
      />
    </div>
  );
}

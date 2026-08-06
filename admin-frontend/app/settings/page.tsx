"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { RoleGate } from "@/components/role-gate";
import { apiUrl, authHeaders } from "@/lib/api";
import { getStoredUser } from "@/lib/session";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Eye, EyeOff, Globe, Lock, Save, Settings2, ShieldCheck, Loader2 } from "lucide-react";

type PortalSettings = {
  portalName: string;
  academicYear: string;
  supportEmail: string;
  supportPhone: string;
  timezone: string;
  maintenanceMode: boolean;
  allowStudentEnrollment: boolean;
  allowParentCourseView: boolean;
  announcementBanner: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
};

const DEFAULT_SETTINGS: PortalSettings = {
  portalName: "Q Tech Portal",
  academicYear: "2026-2027",
  supportEmail: "support@qtech.local",
  supportPhone: "",
  timezone: "Asia/Karachi",
  maintenanceMode: false,
  allowStudentEnrollment: true,
  allowParentCourseView: true,
  announcementBanner: "",
};

function getToken() {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export default function SettingsPage() {
  const [userEmail, setUserEmail] = useState("");
  const [settings, setSettings] = useState<PortalSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirm: false });
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({
    currentPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  useEffect(() => {
    const user = getStoredUser();
    setUserEmail(user?.email || "");
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/settings"), { headers: authHeaders(), cache: "no-store" });
        const json = await res.json();
        if (!alive) return;
        if (res.ok && json?.success && json?.data) {
          setSettings({
            portalName: json.data.portalName || DEFAULT_SETTINGS.portalName,
            academicYear: json.data.academicYear || DEFAULT_SETTINGS.academicYear,
            supportEmail: json.data.supportEmail || DEFAULT_SETTINGS.supportEmail,
            supportPhone: json.data.supportPhone || "",
            timezone: json.data.timezone || DEFAULT_SETTINGS.timezone,
            maintenanceMode: Boolean(json.data.maintenanceMode),
            allowStudentEnrollment: Boolean(json.data.allowStudentEnrollment),
            allowParentCourseView: Boolean(json.data.allowParentCourseView),
            announcementBanner: json.data.announcementBanner || "",
          });
        } else {
          setSettings(DEFAULT_SETTINGS);
        }
      } catch {
        if (alive) setSettings(DEFAULT_SETTINGS);
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const updateField = <K extends keyof PortalSettings>(key: K, value: PortalSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
    setSettingsMessage(null);
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setSettingsMessage(null);
    try {
      const res = await fetch(apiUrl("/api/settings"), {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify(settings),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Failed to save settings");
      }
      setSettingsMessage({ type: "success", text: "System settings saved successfully." });
      if (json?.data) {
        setSettings((current) => ({
          ...current,
          portalName: json.data.portalName || current.portalName,
          academicYear: json.data.academicYear || current.academicYear,
          supportEmail: json.data.supportEmail || current.supportEmail,
          supportPhone: json.data.supportPhone || current.supportPhone,
          timezone: json.data.timezone || current.timezone,
          maintenanceMode: Boolean(json.data.maintenanceMode),
          allowStudentEnrollment: Boolean(json.data.allowStudentEnrollment),
          allowParentCourseView: Boolean(json.data.allowParentCourseView),
          announcementBanner: json.data.announcementBanner || current.announcementBanner,
        }));
      }
    } catch (error: any) {
      setSettingsMessage({ type: "error", text: error?.message || "Failed to save settings" });
    } finally {
      setSavingSettings(false);
    }
  };

  const togglePassword = (key: keyof typeof showPasswords) => {
    setShowPasswords((current) => ({ ...current, [key]: !current[key] }));
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    setPasswordMessage(null);

    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmNewPassword) {
      setPasswordMessage({ type: "error", text: "All password fields are required." });
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters long." });
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmNewPassword) {
      setPasswordMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    const token = getToken();
    if (!token) {
      setPasswordMessage({ type: "error", text: "You need to log in again." });
      return;
    }

    setPasswordLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/change-password"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(passwordForm),
      });
      const json = await res.json();
      if (!res.ok || !json?.success) {
        throw new Error(json?.message || "Password change failed");
      }
      setPasswordMessage({ type: "success", text: "Password changed successfully." });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmNewPassword: "" });
    } catch (error: any) {
      setPasswordMessage({ type: "error", text: error?.message || "Password change failed" });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <RoleGate allowedRoles={["superadmin"]} message="System settings are reserved for superadmin.">
      <AdminLayout>
        <div className="space-y-6">
          <div className="rounded-3xl border bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 p-5 text-white sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-white/70">
                  <Settings2 className="h-4 w-4" />
                  Superadmin Control Center
                </div>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">System Settings</h1>
                <p className="mt-2 max-w-3xl text-sm text-white/75">
                  Configure portal identity, academic year, support contacts, enrollment policy, and maintenance mode.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white">
                  <Globe className="mr-2 h-4 w-4" />
                  {settings.timezone}
                </Badge>
                <Badge className="rounded-full bg-white/10 px-3 py-1 text-white">
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {settings.maintenanceMode ? "Maintenance On" : "Live"}
                </Badge>
              </div>
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Portal Configuration</CardTitle>
                <CardDescription>These values drive the portal branding and global behavior.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {loading ? (
                  <div className="flex items-center gap-3 rounded-2xl border p-4 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading settings...
                  </div>
                ) : (
                  <>
                    {settingsMessage && (
                      <Alert variant={settingsMessage.type === "error" ? "destructive" : "default"}>
                        <AlertDescription>{settingsMessage.text}</AlertDescription>
                      </Alert>
                    )}

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Portal Name</Label>
                        <Input value={settings.portalName} onChange={(e) => updateField("portalName", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Academic Year</Label>
                        <Input value={settings.academicYear} onChange={(e) => updateField("academicYear", e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Support Email</Label>
                        <Input type="email" value={settings.supportEmail} onChange={(e) => updateField("supportEmail", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Support Phone</Label>
                        <Input value={settings.supportPhone} onChange={(e) => updateField("supportPhone", e.target.value)} />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Timezone</Label>
                        <Input value={settings.timezone} onChange={(e) => updateField("timezone", e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>Announcement Banner</Label>
                        <Input
                          value={settings.announcementBanner}
                          onChange={(e) => updateField("announcementBanner", e.target.value)}
                          placeholder="Optional banner text"
                        />
                      </div>
                    </div>

                    <Separator />

                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center justify-between rounded-2xl border p-4">
                        <div>
                          <div className="font-medium">Maintenance Mode</div>
                          <div className="text-sm text-muted-foreground">Restrict portal access to staff.</div>
                        </div>
                        <Switch checked={settings.maintenanceMode} onCheckedChange={(checked) => updateField("maintenanceMode", checked)} />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border p-4">
                        <div>
                          <div className="font-medium">Student LMS Enrollment</div>
                          <div className="text-sm text-muted-foreground">Allow students to enroll themselves.</div>
                        </div>
                        <Switch checked={settings.allowStudentEnrollment} onCheckedChange={(checked) => updateField("allowStudentEnrollment", checked)} />
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border p-4">
                        <div>
                          <div className="font-medium">Parent LMS View</div>
                          <div className="text-sm text-muted-foreground">Allow parents to view course content.</div>
                        </div>
                        <Switch checked={settings.allowParentCourseView} onCheckedChange={(checked) => updateField("allowParentCourseView", checked)} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <Button onClick={saveSettings} disabled={savingSettings}>
                        {savingSettings ? "Saving..." : "Save Settings"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent"
                        onClick={() => setSettings(DEFAULT_SETTINGS)}
                      >
                        Reset Draft
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-emerald-600" />
                    Change Password
                  </CardTitle>
                  <CardDescription>{userEmail || "Your account"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={changePassword} className="space-y-4">
                    {passwordMessage && (
                      <Alert variant={passwordMessage.type === "error" ? "destructive" : "default"}>
                        <AlertDescription>{passwordMessage.text}</AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label>Current Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.current ? "text" : "password"}
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm((current) => ({ ...current, currentPassword: e.target.value }))}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() => togglePassword("current")}
                        >
                          {showPasswords.current ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>New Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.next ? "text" : "password"}
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm((current) => ({ ...current, newPassword: e.target.value }))}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() => togglePassword("next")}
                        >
                          {showPasswords.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Confirm Password</Label>
                      <div className="relative">
                        <Input
                          type={showPasswords.confirm ? "text" : "password"}
                          value={passwordForm.confirmNewPassword}
                          onChange={(e) => setPasswordForm((current) => ({ ...current, confirmNewPassword: e.target.value }))}
                          className="pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1 h-8 w-8"
                          onClick={() => togglePassword("confirm")}
                        >
                          {showPasswords.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={passwordLoading}>
                      {passwordLoading ? "Changing..." : "Update Password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Current Snapshot</CardTitle>
                  <CardDescription>Quick view of the active portal configuration.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Portal</span>
                    <span className="font-medium">{settings.portalName}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Academic Year</span>
                    <span className="font-medium">{settings.academicYear}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Student Enrollment</span>
                    <span className="font-medium">{settings.allowStudentEnrollment ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Parent LMS View</span>
                    <span className="font-medium">{settings.allowParentCourseView ? "Enabled" : "Disabled"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Maintenance Mode</span>
                    <span className="font-medium">{settings.maintenanceMode ? "On" : "Off"}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </AdminLayout>
    </RoleGate>
  );
}

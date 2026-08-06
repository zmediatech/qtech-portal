"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { apiUrl, authHeaders } from "@/lib/api";
import { getStoredUser } from "@/lib/session";
import { Edit3, Plus, Trash2, Users2 } from "lucide-react";

type SimpleItem = { _id: string; name?: string; code?: string };
type UserRow = {
  _id: string;
  name: string;
  email: string;
  role?: "superadmin" | "admin" | "teacher" | "student" | "parent";
  studentClass?: string | SimpleItem | null;
  parentStudentIds?: Array<string | SimpleItem>;
  assignedClasses?: Array<string | SimpleItem>;
  assignedSubjects?: Array<string | SimpleItem>;
};

const ROLES = ["superadmin", "admin", "teacher", "student", "parent"] as const;

function asArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object" && Array.isArray((payload as any).data)) return (payload as any).data;
  return [];
}

function toIdList(items?: Array<string | SimpleItem> | null) {
  return (items || []).map((item) => (typeof item === "string" ? item : item._id)).filter(Boolean);
}

function labelFor(item: string | SimpleItem | null | undefined) {
  if (!item) return "";
  if (typeof item === "string") return item;
  return item.code ? `${item.name || "Unnamed"} (${item.code})` : item.name || "Unnamed";
}

export default function UsersPage() {
  const stored = getStoredUser();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [classes, setClasses] = useState<SimpleItem[]>([]);
  const [subjects, setSubjects] = useState<SimpleItem[]>([]);
  const [students, setStudents] = useState<SimpleItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    studentClass: "",
    parentStudentIds: [] as string[],
    assignedClasses: [] as string[],
    assignedSubjects: [] as string[],
  });

  const canManageSuperadmin = stored?.role === "superadmin";
  const availableRoles = canManageSuperadmin ? ROLES : ROLES.filter((role) => role !== "superadmin");
  const visibleUsers = useMemo(
    () => (canManageSuperadmin ? users : users.filter((user) => user.role !== "superadmin")),
    [canManageSuperadmin, users]
  );
  const selectedUser = useMemo(() => visibleUsers.find((user) => user._id === selectedUserId) || null, [visibleUsers, selectedUserId]);

  useEffect(() => {
    if (stored?.role !== "admin" && stored?.role !== "superadmin") {
      window.location.href = "/dashboard";
    }
  }, [stored]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setBusy(true);
        const [usersRes, classesRes, subjectsRes, studentsRes] = await Promise.all([
          fetch(apiUrl("/api/users"), { headers: authHeaders(), cache: "no-store" }),
          fetch(apiUrl("/api/classes"), { headers: authHeaders(), cache: "no-store" }),
          fetch(apiUrl("/api/subjects"), { headers: authHeaders(), cache: "no-store" }),
          fetch(apiUrl("/api/students"), { headers: authHeaders(), cache: "no-store" }),
        ]);

        const [usersJson, classesJson, subjectsJson, studentsJson] = await Promise.all([
          usersRes.json(),
          classesRes.json(),
          subjectsRes.json(),
          studentsRes.json(),
        ]);

        if (!alive) return;

        const nextUsers = asArray<UserRow>(usersJson);
        setUsers(nextUsers);
        setClasses(asArray<SimpleItem>(classesJson));
        setSubjects(asArray<SimpleItem>(subjectsJson));
        setStudents(asArray<SimpleItem>(studentsJson));
        const nextVisibleUsers = canManageSuperadmin ? nextUsers : nextUsers.filter((user) => user.role !== "superadmin");
        setSelectedUserId((current) => current ?? nextVisibleUsers[0]?._id ?? null);
      } catch (err: any) {
        if (!alive) return;
        setError(err?.message || "Unable to load users");
      } finally {
        if (alive) setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    if (!selectedUser) return;
    setForm({
      name: selectedUser.name || "",
      email: selectedUser.email || "",
      password: "",
      role: selectedUser.role || "student",
      studentClass: typeof selectedUser.studentClass === "string" ? selectedUser.studentClass : selectedUser.studentClass?._id || "",
      parentStudentIds: toIdList(selectedUser.parentStudentIds),
      assignedClasses: toIdList(selectedUser.assignedClasses),
      assignedSubjects: toIdList(selectedUser.assignedSubjects),
    });
  }, [selectedUser]);

  useEffect(() => {
    if (selectedUser) return;
    setForm({
      name: "",
      email: "",
      password: "",
      role: "student",
      studentClass: "",
      parentStudentIds: [],
      assignedClasses: [],
      assignedSubjects: [],
    });
  }, [selectedUser]);

  const toggleValue = (value: string, field: "parentStudentIds" | "assignedClasses" | "assignedSubjects") => {
    setForm((current) => ({
      ...current,
      [field]: current[field].includes(value)
        ? current[field].filter((item) => item !== value)
        : [...current[field], value],
    }));
  };

  const toggleClass = (value: string) => {
    setForm((current) => ({
      ...current,
      studentClass: current.studentClass === value ? "" : value,
    }));
  };

  const saveUser = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        studentClass: form.studentClass || undefined,
        parentStudentIds: form.parentStudentIds,
        assignedClasses: form.assignedClasses,
        assignedSubjects: form.assignedSubjects,
      };

      const endpoint = selectedUser ? apiUrl(`/api/users/${selectedUser._id}`) : apiUrl("/api/users/register");
      const method = selectedUser ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Save failed");
      }

      const refreshed = await fetch(apiUrl("/api/users"), { headers: authHeaders(), cache: "no-store" });
      const refreshedJson = await refreshed.json();
      setUsers(asArray<UserRow>(refreshedJson));
      setSelectedUserId(selectedUser?._id || asArray<UserRow>(refreshedJson)[0]?._id || null);
      setForm((current) => ({ ...current, password: "" }));
    } catch (err: any) {
      setError(err?.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  const removeUser = async (id: string) => {
    if (!window.confirm("Delete this user?")) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl(`/api/users/${id}`), {
        method: "DELETE",
        headers: authHeaders(),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message || "Delete failed");
      }
      setUsers((current) => current.filter((user) => user._id !== id));
      setSelectedUserId((current) => (current === id ? null : current));
    } catch (err: any) {
      setError(err?.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="rounded-3xl border bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-800 p-5 text-white sm:p-6">
          <div className="flex items-center gap-3">
            <Users2 className="h-6 w-6" />
            <div>
              <h1 className="text-2xl font-semibold">Users & Roles</h1>
              <p className="text-sm text-white/75">Create student, parent, teacher, and admin accounts. Assign classes and subjects here.</p>
            </div>
          </div>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-4 text-sm text-red-700">{error}</CardContent>
          </Card>
        )}

        <div className="grid gap-4 xl:grid-cols-[1.1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-emerald-600" />
                {selectedUser ? "Edit User" : "Create User"}
              </CardTitle>
              <CardDescription>Use this panel to create or update a role-based account.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={saveUser} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input value={form.name} onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))} required />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>{selectedUser ? "New Password (optional)" : "Password"}</Label>
                    <Input
                      type="password"
                      value={form.password}
                      onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                      required={!selectedUser}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Role</Label>
                    <Select value={form.role} onValueChange={(value) => setForm((current) => ({ ...current, role: value }))}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRoles.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {form.role === "student" && (
                  <div className="space-y-2">
                    <Label>Student Class</Label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {classes.map((classItem) => (
                        <button
                          key={classItem._id}
                          type="button"
                          onClick={() => toggleClass(classItem._id)}
                          className={`rounded-xl border px-3 py-2 text-left text-sm ${form.studentClass === classItem._id ? "border-emerald-500 bg-emerald-50" : "bg-white"}`}
                        >
                          {classItem.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {form.role === "parent" && (
                  <div className="space-y-2">
                    <Label>Linked Students</Label>
                    <div className="grid gap-2 sm:grid-cols-2 max-h-52 overflow-auto rounded-2xl border p-2">
                      {students.map((student) => (
                        <label key={student._id} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={form.parentStudentIds.includes(student._id)}
                            onChange={() => toggleValue(student._id, "parentStudentIds")}
                          />
                          <span>{student.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {form.role === "teacher" && (
                  <>
                    <div className="space-y-2">
                      <Label>Assigned Classes</Label>
                      <div className="grid gap-2 sm:grid-cols-2 max-h-52 overflow-auto rounded-2xl border p-2">
                        {classes.map((classItem) => (
                          <label key={classItem._id} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.assignedClasses.includes(classItem._id)}
                              onChange={() => toggleValue(classItem._id, "assignedClasses")}
                            />
                            <span>{classItem.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Assigned Subjects</Label>
                      <div className="grid gap-2 sm:grid-cols-2 max-h-52 overflow-auto rounded-2xl border p-2">
                        {subjects.map((subject) => (
                          <label key={subject._id} className="flex items-center gap-2 rounded-xl px-2 py-2 text-sm">
                            <input
                              type="checkbox"
                              checked={form.assignedSubjects.includes(subject._id)}
                              onChange={() => toggleValue(subject._id, "assignedSubjects")}
                            />
                            <span>{subject.code ? `${subject.code} - ` : ""}{subject.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={busy} className="rounded-full">
                    {busy ? "Saving..." : selectedUser ? "Update User" : "Create User"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => {
                      setSelectedUserId(null);
                      setForm({
                        name: "",
                        email: "",
                        password: "",
                        role: "student",
                        studentClass: "",
                        parentStudentIds: [],
                        assignedClasses: [],
                        assignedSubjects: [],
                      });
                    }}
                  >
                    Clear
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Tap a user to edit roles and assignments.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {visibleUsers.map((userRow) => (
                  <div key={userRow._id} className={`rounded-2xl border p-4 ${selectedUserId === userRow._id ? "border-emerald-500 bg-emerald-50" : "bg-white"}`}>
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <button type="button" className="text-left" onClick={() => setSelectedUserId(userRow._id)}>
                        <div className="text-base font-semibold text-slate-900">{userRow.name}</div>
                        <div className="text-sm text-slate-600">{userRow.email}</div>
                      </button>
                      <Badge variant="secondary" className="w-fit capitalize">{userRow.role || "student"}</Badge>
                    </div>

                    <div className="mt-3 grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
                      <div>
                        <div className="font-medium text-slate-900">Class</div>
                        <div>{labelFor(userRow.studentClass) || "None"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Teacher classes</div>
                        <div>{(userRow.assignedClasses || []).map(labelFor).filter(Boolean).join(", ") || "None"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Teacher subjects</div>
                        <div>{(userRow.assignedSubjects || []).map(labelFor).filter(Boolean).join(", ") || "None"}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Linked students</div>
                        <div>{(userRow.parentStudentIds || []).map(labelFor).filter(Boolean).join(", ") || "None"}</div>
                      </div>
                    </div>

                    <Separator className="my-3" />

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={() => setSelectedUserId(userRow._id)}>
                        <Edit3 className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button type="button" variant="destructive" size="sm" className="rounded-full" onClick={() => removeUser(userRow._id)} disabled={busy}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

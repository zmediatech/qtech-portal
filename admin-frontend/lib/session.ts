export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role?: "superadmin" | "admin" | "teacher" | "student" | "parent";
  studentClass?: string | { _id?: string; name?: string } | null;
  parentStudentIds?: string[];
  assignedClasses?: Array<string | { _id?: string; name?: string }>;
  assignedSubjects?: Array<string | { _id?: string; name?: string; code?: string }>;
  leftSignatureDataUrl?: string;
  rightSignatureDataUrl?: string;
};

export type SessionRole = "superadmin" | "admin" | "teacher" | "student" | "parent";

export function normalizeRole(role?: string | null): SessionRole {
  if (role === "superadmin" || role === "admin" || role === "teacher" || role === "student" || role === "parent") {
    return role;
  }
  return "student";
}

export function getRoleHomePath(role?: string | null) {
  switch (normalizeRole(role)) {
    case "superadmin":
      return "/superadmin/dashboard";
    case "admin":
      return "/admin/dashboard";
    case "teacher":
      return "/teacher/dashboard";
    case "parent":
      return "/parent/dashboard";
    default:
      return "/student/dashboard";
  }
}

export function getStoredUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function getApiBase() {
  return "/api/backend";
}

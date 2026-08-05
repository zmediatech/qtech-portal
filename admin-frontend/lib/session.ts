export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role?: "admin" | "teacher" | "student" | "parent";
  studentClass?: string | { _id?: string; name?: string } | null;
  parentStudentIds?: string[];
  assignedClasses?: Array<string | { _id?: string; name?: string }>;
  assignedSubjects?: Array<string | { _id?: string; name?: string; code?: string }>;
  leftSignatureDataUrl?: string;
  rightSignatureDataUrl?: string;
};

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

import { getApiBase } from "./session";

export function apiUrl(path: string) {
  return `${getApiBase()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function authHeaders(): HeadersInit {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

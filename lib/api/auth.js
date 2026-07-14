import { api } from "./client";
const API_BASE = (() => {
  const url = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
  return url.endsWith("/api") ? url.slice(0, -4) : url;
})();
const authApi = {
  /** Get current authenticated user's profile */
  me: () => api.get("/auth/me"),
  /** Update current authenticated user's profile */
  updateProfile: (data) => api.put("/auth/profile", data),
  /** Get the URL to redirect to for Google OAuth login */
  getGoogleLoginUrl: () => `${API_BASE}/api/auth/google`,
  /** Get the URL to redirect to for GitHub OAuth login */
  getGitHubLoginUrl: () => `${API_BASE}/api/auth/github`,
  /** Login with email or username and password */
  login: (data) => api.post("/auth/login", data),
  /** Register a new account */
  register: (data) => api.post("/auth/register", data)
};
export {
  authApi
};

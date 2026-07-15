import { api } from "./client";
const workspacesApi = {
  /** List all workspaces the current user is a member of */
  list: (params) => api.get("/workspaces", {
    params: params ? {
      page: String(params.page ?? 1),
      per_page: String(params.per_page ?? 20)
    } : void 0
  }),
  /** Create a new workspace (current user becomes owner) */
  create: (data) => api.post("/workspaces", data),
  /** Update workspace name/description (owner only) */
  update: (id, data) => api.put(`/workspaces/${id}`, data),
  /** Delete workspace and all its projects/documents (owner only) */
  delete: (id) => api.delete(`/workspaces/${id}`),
  /** List all members of a workspace (any member) */
  listMembers: (id) => api.get(`/workspaces/${id}/members`),
  /** Invite a user by username or email (owner only). role: "editor" | "viewer" */
  addMember: (id, data) => api.post(`/workspaces/${id}/members`, data),
  /** Change a member's role (owner only) */
  updateMemberRole: (id, userId, role) => api.put(`/workspaces/${id}/members/${userId}`, { role }),
  /** Remove a member, or leave the workspace (self) */
  removeMember: (id, userId) => api.delete(`/workspaces/${id}/members/${userId}`)
};
export {
  workspacesApi
};

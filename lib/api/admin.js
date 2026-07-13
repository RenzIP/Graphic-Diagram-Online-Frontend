import { api } from "./client";

const adminApi = {
  getOverview: () => api.get("/admin/overview"),
  listUsers: () => api.get("/admin/users"),
  updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  listWorkspaces: () => api.get("/admin/workspaces"),
  deleteWorkspace: (id) => api.delete(`/admin/workspaces/${id}`),
  listDocuments: () => api.get("/admin/documents"),
  deleteDocument: (id) => api.delete(`/admin/documents/${id}`)
};

export { adminApi };

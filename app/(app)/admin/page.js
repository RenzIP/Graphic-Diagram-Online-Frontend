'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '../../../hooks/useStore.js';
import { currentUserStore } from '../../../lib/stores/auth.js';
import AppSidebar from '../../../components/layout/AppSidebar.js';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';
import Modal from '../../../components/ui/Modal.js';
import { adminApi } from '../../../lib/api/admin.js';
import { DIAGRAM_TYPES } from '../../../lib/utils/constants.js';

function formatDate(dateStr) {
	if (!dateStr) return '-';
	const d = new Date(dateStr);
	return d.toLocaleDateString('id-ID', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});
}

export default function AdminPage() {
	const user = useStore(useMemo(() => currentUserStore(), []));
	const router = useRouter();

	const [activeTab, setActiveTab] = useState('overview'); // overview, users, workspaces, diagrams
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');

	// Data states
	const [overview, setOverview] = useState({ users: 0, workspaces: 0, projects: 0, documents: 0 });
	const [usersList, setUsersList] = useState([]);
	const [workspacesList, setWorkspacesList] = useState([]);
	const [documentsList, setDocumentsList] = useState([]);

	// Modal states
	const [confirmDelete, setConfirmDelete] = useState(null); // { type: 'user'|'workspace'|'document', id, name }
	const [isProcessing, setIsProcessing] = useState(false);

	// Protect route - only allow admins
	useEffect(() => {
		if (user && user.role !== 'admin') {
			router.replace('/dashboard');
		}
	}, [user, router]);

	// Fetch data when active tab changes
	useEffect(() => {
		if (!user || user.role !== 'admin') return;

		setLoading(true);
		if (activeTab === 'overview') {
			adminApi.getOverview()
				.then(res => setOverview(res.data ?? res))
				.catch(err => console.error('Failed to load overview:', err))
				.finally(() => setLoading(false));
		} else if (activeTab === 'users') {
			adminApi.listUsers()
				.then(res => setUsersList(res.data ?? res))
				.catch(err => console.error('Failed to load users:', err))
				.finally(() => setLoading(false));
		} else if (activeTab === 'workspaces') {
			adminApi.listWorkspaces()
				.then(res => setWorkspacesList(res.data ?? res))
				.catch(err => console.error('Failed to load workspaces:', err))
				.finally(() => setLoading(false));
		} else if (activeTab === 'diagrams') {
			adminApi.listDocuments()
				.then(res => setDocumentsList(res.data ?? res))
				.catch(err => console.error('Failed to load documents:', err))
				.finally(() => setLoading(false));
		}
	}, [activeTab, user]);

	// Filter data based on search
	const filteredData = useMemo(() => {
		const query = searchQuery.toLowerCase().trim();
		if (!query) {
			if (activeTab === 'users') return usersList;
			if (activeTab === 'workspaces') return workspacesList;
			if (activeTab === 'diagrams') return documentsList;
			return [];
		}

		if (activeTab === 'users') {
			return usersList.filter(u => 
				u.username?.toLowerCase().includes(query) || 
				u.email?.toLowerCase().includes(query) ||
				u.full_name?.toLowerCase().includes(query)
			);
		}
		if (activeTab === 'workspaces') {
			return workspacesList.filter(w => 
				w.name?.toLowerCase().includes(query) || 
				w.description?.toLowerCase().includes(query) ||
				w.owner_name?.toLowerCase().includes(query) ||
				w.owner_email?.toLowerCase().includes(query)
			);
		}
		if (activeTab === 'diagrams') {
			return documentsList.filter(d => 
				d.title?.toLowerCase().includes(query) || 
				d.diagram_type?.toLowerCase().includes(query) ||
				d.workspace_name?.toLowerCase().includes(query) ||
				d.creator_name?.toLowerCase().includes(query)
			);
		}
		return [];
	}, [activeTab, searchQuery, usersList, workspacesList, documentsList]);

	// Handle role update
	async function toggleUserRole(userId, currentRole) {
		const targetRole = currentRole === 'admin' ? 'user' : 'admin';
		if (!confirm(`Ubah role user ini menjadi ${targetRole.toUpperCase()}?`)) return;

		try {
			await adminApi.updateUserRole(userId, targetRole);
			setUsersList(prev => prev.map(u => u.id === userId ? { ...u, role: targetRole } : u));
			if (window.__gradiol_toast) window.__gradiol_toast('Role berhasil diubah!', 'success');
		} catch (err) {
			console.error('Failed to update user role:', err);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal mengubah role', 'error');
		}
	}

	// Handle deletion execution
	async function executeDeletion() {
		if (!confirmDelete) return;
		setIsProcessing(true);
		try {
			const { type, id } = confirmDelete;
			if (type === 'user') {
				await adminApi.deleteUser(id);
				setUsersList(prev => prev.filter(u => u.id !== id));
			} else if (type === 'workspace') {
				await adminApi.deleteWorkspace(id);
				setWorkspacesList(prev => prev.filter(w => w.id !== id));
			} else if (type === 'document') {
				await adminApi.deleteDocument(id);
				setDocumentsList(prev => prev.filter(d => d.id !== id));
			}
			setConfirmDelete(null);
			if (window.__gradiol_toast) window.__gradiol_toast('Data berhasil dihapus!', 'success');
		} catch (err) {
			console.error('Failed to delete resource:', err);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal menghapus data', 'error');
		} finally {
			setIsProcessing(false);
		}
	}

	if (!user || user.role !== 'admin') {
		return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>;
	}

	return (
		<div className="page-shell">
			<AppSidebar />
			<main className="page-main">
				<header className="page-header">
					<div>
						<div className="section-kicker">
							<span className="h-2 w-2 rounded-full bg-indigo-400"></span>
							Admin Center
						</div>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">System Management</h1>
						<p className="mt-2 text-sm leading-6 text-slate-400">Kelola pengguna, workspace, dan diagram yang aktif di dalam sistem secara menyeluruh.</p>
					</div>
					{activeTab !== 'overview' && (
						<div className="relative min-w-[300px]">
							<svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.6-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
							</svg>
							<input
								type="text"
								placeholder={`Cari ${activeTab === 'users' ? 'user...' : activeTab === 'workspaces' ? 'workspace...' : 'diagram...'}`}
								value={searchQuery}
								onChange={(e) => setSearchQuery(e.target.value)}
								className="field-sm w-full pl-11"
							/>
						</div>
					)}
				</header>

				{/* Tabs Navigation */}
				<div className="border-b border-white/8 mb-6 flex gap-4">
					{[
						{ id: 'overview', label: 'Overview', icon: '📊' },
						{ id: 'users', label: 'Users', icon: '👤' },
						{ id: 'workspaces', label: 'Workspaces', icon: '📁' },
						{ id: 'diagrams', label: 'Diagrams', icon: '📐' }
					].map(tab => (
						<button
							key={tab.id}
							onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
							className={`relative py-3 text-sm font-medium transition duration-200 ${
								activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-white'
							}`}
						>
							<span className="flex items-center gap-2">
								<span>{tab.icon}</span>
								<span>{tab.label}</span>
							</span>
							{activeTab === tab.id && (
								<span className="absolute bottom-0 left-0 w-full h-0.5 bg-indigo-400 rounded-full"></span>
							)}
						</button>
					))}
				</div>

				<div className="page-content">
					{/* OVERVIEW TAB */}
					{activeTab === 'overview' && (
						<section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
							<Card className="p-6">
								<div className="text-sm font-medium text-slate-400">Total Users</div>
								<div className="mt-4 text-4xl font-bold text-white">{loading ? '...' : overview.users}</div>
								<div className="mt-2 text-xs text-slate-500">Registered on the platform</div>
							</Card>
							<Card className="p-6">
								<div className="text-sm font-medium text-slate-400">Total Workspaces</div>
								<div className="mt-4 text-4xl font-bold text-indigo-400">{loading ? '...' : overview.workspaces}</div>
								<div className="mt-2 text-xs text-slate-500">Collaborative workspaces</div>
							</Card>
							<Card className="p-6">
								<div className="text-sm font-medium text-slate-400">Total Projects</div>
								<div className="mt-4 text-4xl font-bold text-violet-400">{loading ? '...' : overview.projects}</div>
								<div className="mt-2 text-xs text-slate-500">Project directories in workspaces</div>
							</Card>
							<Card className="p-6">
								<div className="text-sm font-medium text-slate-400">Total Diagrams</div>
								<div className="mt-4 text-4xl font-bold text-sky-400">{loading ? '...' : overview.documents}</div>
								<div className="mt-2 text-xs text-slate-500">Created documents/canvases</div>
							</Card>
						</section>
					)}

					{/* LIST TABLES TABS */}
					{activeTab !== 'overview' && (
						<section className="data-table">
							<div className="overflow-x-auto">
								<table>
									<thead>
										{activeTab === 'users' && (
											<tr>
												<th>No</th>
												<th>Username</th>
												<th>Full Name</th>
												<th>Email</th>
												<th>Role</th>
												<th>Registration Date</th>
												<th className="text-right">Actions</th>
											</tr>
										)}
										{activeTab === 'workspaces' && (
											<tr>
												<th>No</th>
												<th>Workspace Name</th>
												<th>Description</th>
												<th>Owner Name</th>
												<th>Owner Email</th>
												<th>Created Date</th>
												<th className="text-right">Actions</th>
											</tr>
										)}
										{activeTab === 'diagrams' && (
											<tr>
												<th>No</th>
												<th>Diagram Title</th>
												<th>Type</th>
												<th>Workspace / Project</th>
												<th>Created By</th>
												<th>Last Updated</th>
												<th className="text-right">Actions</th>
											</tr>
										)}
									</thead>
									<tbody>
										{loading ? (
											Array.from({ length: 5 }).map((_, idx) => (
												<tr key={idx}>
													<td colSpan={activeTab === 'users' ? 7 : activeTab === 'workspaces' ? 7 : 7}>
														<div className="grid gap-3 px-6 py-4">
															<div className="skeleton h-5 w-24 rounded-full"></div>
															<div className="skeleton h-5 w-full rounded-full"></div>
														</div>
													</td>
												</tr>
											))
										) : filteredData.length === 0 ? (
											<tr>
												<td colSpan={7}>
													<div className="empty-state m-8 py-6">
														<div className="text-lg font-medium text-white mb-2">Tidak ada data ditemukan</div>
														<p className="text-sm text-slate-500">Belum ada resource untuk kategori ini atau tidak cocok dengan filter pencarian.</p>
													</div>
												</td>
											</tr>
										) : (
											filteredData.map((item, idx) => (
												<tr key={item.id}>
													<td className="text-slate-500">{idx + 1}</td>
													
													{/* Users Row Rendering */}
													{activeTab === 'users' && (
														<>
															<td>
																<div className="font-semibold text-white">{item.username}</div>
															</td>
															<td className="text-slate-300">{item.full_name || '-'}</td>
															<td className="text-slate-400">{item.email || '-'}</td>
															<td>
																<span className={`status-pill ${item.role === 'admin' ? 'border-amber-400/20 bg-amber-400/10 text-amber-200' : 'border-slate-400/20 bg-slate-400/10 text-slate-300'}`}>
																	{item.role}
																</span>
															</td>
															<td className="text-slate-400">{formatDate(item.created_at)}</td>
															<td>
																<div className="flex justify-end gap-2">
																	<Button
																		variant="outline"
																		size="sm"
																		className="h-8 text-xs"
																		onClick={() => toggleUserRole(item.id, item.role)}
																	>
																		{item.role === 'admin' ? 'Demote' : 'Promote'}
																	</Button>
																	{item.id !== user.id && (
																		<Button
																			variant="danger"
																			size="sm"
																			className="h-8 text-xs"
																			onClick={() => setConfirmDelete({ type: 'user', id: item.id, name: item.username })}
																		>
																			Delete
																		</Button>
																	)}
																</div>
															</td>
														</>
													)}

													{/* Workspaces Row Rendering */}
													{activeTab === 'workspaces' && (
														<>
															<td>
																<div className="font-semibold text-white">{item.name}</div>
															</td>
															<td className="text-slate-400 max-w-[200px] truncate">{item.description || '-'}</td>
															<td className="text-slate-300">{item.owner_name || '-'}</td>
															<td className="text-slate-400">{item.owner_email || '-'}</td>
															<td className="text-slate-400">{formatDate(item.created_at)}</td>
															<td>
																<div className="flex justify-end gap-2">
																	<Button
																		variant="danger"
																		size="sm"
																		className="h-8 text-xs"
																		onClick={() => setConfirmDelete({ type: 'workspace', id: item.id, name: item.name })}
																	>
																		Delete
																	</Button>
																</div>
															</td>
														</>
													)}

													{/* Diagrams Row Rendering */}
													{activeTab === 'diagrams' && (
														<>
															<td>
																<div className="font-semibold text-white">{item.title}</div>
															</td>
															<td>
																<span className="status-pill border-indigo-400/20 bg-indigo-400/10 text-indigo-200">
																	{item.diagram_type}
																</span>
															</td>
															<td className="text-slate-300">
																{item.workspace_name} {item.project_name ? <span className="opacity-60">/ {item.project_name}</span> : ''}
															</td>
															<td className="text-slate-300">{item.creator_name || 'System'}</td>
															<td className="text-slate-400">{formatDate(item.updated_at)}</td>
															<td>
																<div className="flex justify-end gap-2">
																	<Button
																		variant="ghost"
																		size="sm"
																		className="h-8 text-xs"
																		onClick={() => (window.location.href = `/editor/${item.id}`)}
																	>
																		View
																	</Button>
																	<Button
																		variant="danger"
																		size="sm"
																		className="h-8 text-xs"
																		onClick={() => setConfirmDelete({ type: 'document', id: item.id, name: item.title })}
																	>
																		Delete
																	</Button>
																</div>
															</td>
														</>
													)}
												</tr>
											))
										)}
									</tbody>
								</table>
							</div>
						</section>
					)}
				</div>
			</main>

			{/* Delete Confirmation Modal */}
			<Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Konfirmasi Hapus Data">
				<div className="p-6">
					<p className="mb-6 text-sm leading-7 text-slate-300">
						Apakah Anda yakin ingin menghapus {confirmDelete?.type} <span className="font-semibold text-white">"{confirmDelete?.name}"</span>?
						Tindakan ini permanen dan akan menghapus seluruh data yang terkait di dalam sistem.
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="ghost" onClick={() => setConfirmDelete(null)}>Batal</Button>
						<Button variant="danger" onClick={executeDeletion} disabled={isProcessing}>
							{isProcessing ? 'Menghapus...' : 'Ya, Hapus Data'}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}

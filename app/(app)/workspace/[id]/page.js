'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import AppSidebar from '../../../../components/layout/AppSidebar.js';
import Button from '../../../../components/ui/Button.js';
import Card from '../../../../components/ui/Card.js';
import Input from '../../../../components/ui/Input.js';
import Modal from '../../../../components/ui/Modal.js';
import { DIAGRAM_TYPES } from '../../../../lib/utils/constants.js';
import { documentsApi } from '../../../../lib/api/documents.js';
import { projectsApi } from '../../../../lib/api/projects.js';
import { workspacesApi } from '../../../../lib/api/workspaces.js';

function timeAgo(dateStr) {
	const now = new Date();
	const date = new Date(dateStr);
	const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
	if (diff < 60) return 'just now';
	if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`;
	return `${Math.floor(diff / 86400)} days ago`;
}

function Icon({ path, className = 'h-4 w-4' }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
			<path strokeLinecap="round" strokeLinejoin="round" d={path} />
		</svg>
	);
}

function ActionPill({ tone = 'neutral', children, onClick, title }) {
	const tones = {
		neutral: 'border-white/8 bg-white/5 text-slate-200 hover:border-white/14 hover:bg-white/10 hover:text-white',
		brand: 'border-indigo-400/18 bg-indigo-500/10 text-indigo-100 hover:border-indigo-300/32 hover:bg-indigo-500/16 hover:text-white',
		danger: 'border-red-400/16 bg-red-500/8 text-red-100 hover:border-red-300/28 hover:bg-red-500/14 hover:text-red-50'
	};

	return (
		<button
			type="button"
			title={title}
			onClick={onClick}
			className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${tones[tone] ?? tones.neutral}`}
		>
			{children}
		</button>
	);
}

export default function WorkspacePage() {
	const params = useParams();
	const workspaceId = params.id;
	const [workspace, setWorkspace] = useState(null);
	const [loading, setLoading] = useState(true);
	const [projects, setProjects] = useState([]);
	const [showNewProjectModal, setShowNewProjectModal] = useState(false);
	const [newProjectName, setNewProjectName] = useState('');
	const [newProjectDescription, setNewProjectDescription] = useState('');
	const [creatingProject, setCreatingProject] = useState(false);
	const [showNewDocModal, setShowNewDocModal] = useState(false);
	const [newDocProjectId, setNewDocProjectId] = useState('');
	const [newDocTitle, setNewDocTitle] = useState('');
	const [creatingDoc, setCreatingDoc] = useState(false);
	const [expandedProjects, setExpandedProjects] = useState({});
	const [projectDocsMap, setProjectDocsMap] = useState({});
	const [loadingDocsMap, setLoadingDocsMap] = useState({});

	const [showEditWorkspaceModal, setShowEditWorkspaceModal] = useState(false);
	const [editWsName, setEditWsName] = useState('');
	const [editWsDescription, setEditWsDescription] = useState('');
	const [isUpdatingWs, setIsUpdatingWs] = useState(false);

	const [showDeleteWorkspaceModal, setShowDeleteWorkspaceModal] = useState(false);
	const [isDeletingWs, setIsDeletingWs] = useState(false);

	function toggleProject(projectId) {
		const isExpanded = !expandedProjects[projectId];
		setExpandedProjects((prev) => ({ ...prev, [projectId]: isExpanded }));

		if (isExpanded && !projectDocsMap[projectId]) {
			setLoadingDocsMap((prev) => ({ ...prev, [projectId]: true }));
			documentsApi
				.listByProject(projectId)
				.then((res) => {
					setProjectDocsMap((prev) => ({ ...prev, [projectId]: res.data ?? [] }));
				})
				.catch((e) => {
					console.error('Failed to load documents:', e);
				})
				.finally(() => {
					setLoadingDocsMap((prev) => ({ ...prev, [projectId]: false }));
				});
		}
	}

	useEffect(() => {
		Promise.all([workspacesApi.list({ per_page: 100 }), projectsApi.listByWorkspace(workspaceId, { per_page: 50 })])
			.then(([wsRes, projRes]) => {
				setWorkspace(wsRes.data.find((w) => w.id === workspaceId) ?? null);
				setProjects(projRes.data ?? []);
			})
			.catch((e) => {
				console.error('Failed to load workspace:', e);
				setProjects([]);
			})
			.finally(() => setLoading(false));
	}, [workspaceId]);

	async function createProject() {
		if (!newProjectName.trim()) return;
		setCreatingProject(true);
		try {
			const project = await projectsApi.create({
				workspace_id: workspaceId,
				name: newProjectName.trim(),
				description: newProjectDescription.trim() || undefined
			});
			setProjects((items) => [...items, project]);
			setShowNewProjectModal(false);
			setNewProjectName('');
			setNewProjectDescription('');
		} catch (e) {
			console.error('Failed to create project:', e);
		} finally {
			setCreatingProject(false);
		}
	}

	async function deleteProject(id, name) {
		if (!confirm(`Delete project "${name}" and all its documents?`)) return;
		try {
			await projectsApi.delete(id);
			setProjects((items) => items.filter((p) => p.id !== id));
		} catch (e) {
			console.error('Failed to delete project:', e);
		}
	}

	async function createDocument(typeId) {
		if (!newDocProjectId) return;
		setCreatingDoc(true);
		try {
			const doc = await documentsApi.create({
				workspace_id: workspaceId,
				project_id: newDocProjectId,
				title: newDocTitle.trim() || 'Untitled',
				diagram_type: typeId
			});
			setShowNewDocModal(false);
			setNewDocTitle('');
			window.location.href = `/editor/${doc.id}`;
		} catch (e) {
			console.error('Failed to create document:', e);
		} finally {
			setCreatingDoc(false);
		}
	}

	function openEditWorkspace() {
		setEditWsName(workspace.name);
		setEditWsDescription(workspace.description || '');
		setShowEditWorkspaceModal(true);
	}

	async function updateWorkspace() {
		if (!editWsName.trim()) return;
		setIsUpdatingWs(true);
		try {
			const updated = await workspacesApi.update(workspaceId, {
				name: editWsName.trim(),
				description: editWsDescription.trim() || undefined
			});
			setWorkspace(updated);
			setShowEditWorkspaceModal(false);
			if (window.__gradiol_toast) window.__gradiol_toast('Workspace berhasil diperbarui!', 'success');
		} catch (e) {
			console.error('Failed to update workspace:', e);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal memperbarui workspace', 'error');
		} finally {
			setIsUpdatingWs(false);
		}
	}

	async function deleteWorkspace() {
		setIsDeletingWs(true);
		try {
			await workspacesApi.delete(workspaceId);
			setShowDeleteWorkspaceModal(false);
			if (window.__gradiol_toast) window.__gradiol_toast('Workspace berhasil dihapus!', 'success');
			window.location.href = '/dashboard';
		} catch (e) {
			console.error('Failed to delete workspace:', e);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal menghapus workspace', 'error');
		} finally {
			setIsDeletingWs(false);
		}
	}

	return (
		<div className="page-shell">
			<AppSidebar />
			<main className="page-main">
				<header className="page-header">
					<div>
						<nav className="flex items-center gap-2 text-sm text-slate-500">
							<a href="/dashboard" className="hover:text-white">Dashboard</a>
							<span>/</span>
							<span className="text-slate-300">{workspace?.name ?? 'Workspace'}</span>
						</nav>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">{workspace?.name ?? 'Workspace'}</h1>
						<p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
							{workspace?.description || 'Kelola project dan dokumen diagram dalam satu ruang kerja yang rapi dan siap kolaborasi.'}
						</p>
					</div>
					<div className="mt-4 flex flex-wrap items-center gap-3 sm:mt-0">
						{workspace?.role === 'owner' || workspace?.role === 'editor' ? (
							<div className="glass-panel flex flex-wrap items-center gap-2 rounded-[1.25rem] px-2 py-2">
								<Button variant="outline" size="sm" className="gap-2" onClick={openEditWorkspace}>
									<Icon path="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.25 19.463l-4.5 1.318 1.318-4.5z" />
									Edit Workspace
								</Button>
								{workspace?.role === 'owner' ? (
									<Button variant="danger" size="sm" className="gap-2 shadow-none" onClick={() => setShowDeleteWorkspaceModal(true)}>
										<Icon path="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
										Hapus Workspace
									</Button>
								) : null}
							</div>
						) : null}
						{workspace?.role === 'owner' || workspace?.role === 'editor' ? (
							<Button variant="primary" size="sm" className="gap-2" onClick={() => setShowNewProjectModal(true)}>
								<Icon path="M12 4.5v15m7.5-7.5h-15" />
								New Project
							</Button>
						) : null}
					</div>
				</header>

				<div className="page-content">
					<div className="mb-8 grid gap-5 lg:grid-cols-3">
						<div className="metric-card">
							<div className="text-sm text-slate-400">Projects</div>
							<div className="mt-4 text-3xl font-semibold text-white">{projects.length}</div>
							<div className="mt-2 text-sm text-slate-500">Organized inside this workspace</div>
						</div>
						<div className="metric-card">
							<div className="text-sm text-slate-400">Access role</div>
							<div className="mt-4 text-3xl font-semibold capitalize text-white">{workspace?.role || 'viewer'}</div>
							<div className="mt-2 text-sm text-slate-500">Current permission level</div>
						</div>
						<div className="metric-card">
							<div className="text-sm text-slate-400">Workspace status</div>
							<div className="mt-4 text-3xl font-semibold text-white">{loading ? '...' : 'Active'}</div>
							<div className="mt-2 text-sm text-slate-500">Ready for new projects and documents</div>
						</div>
					</div>

					<section className="mb-6 flex flex-wrap items-end justify-between gap-4">
						<div>
							<div className="section-kicker">
								<span className="h-2 w-2 rounded-full bg-indigo-400"></span>
								Project hub
							</div>
							<h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Projects</h2>
							<p className="mt-2 text-sm leading-6 text-slate-500">Ruang kerja ini menyimpan semua alur, diagram, dan dokumen yang terkait.</p>
						</div>
						<span className="rounded-full border border-white/8 bg-white/4 px-4 py-2 text-sm text-slate-400">{projects.length} project{projects.length !== 1 ? 's' : ''}</span>
					</section>

					{loading ? (
						<div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
							{Array.from({ length: 3 }).map((_, idx) => (
								<div key={idx} className="surface-panel rounded-[1.75rem] p-6">
									<div className="skeleton mb-6 h-12 w-12 rounded-2xl"></div>
									<div className="skeleton mb-3 h-6 w-2/3 rounded-full"></div>
									<div className="skeleton h-4 w-full rounded-full"></div>
								</div>
							))}
						</div>
					) : (
						<div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
							{projects.map((project) => (
								<Card key={project.id} onClick={() => toggleProject(project.id)} className={`group relative cursor-pointer overflow-hidden rounded-[1.75rem] p-0 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_40px_rgba(99,102,241,0.1)] ${expandedProjects[project.id] ? 'ring-1 ring-indigo-500/25 bg-slate-900/50' : ''}`}>
									<div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 opacity-70"></div>
									<div className="p-6">
										<div className="mb-5 flex items-start justify-between gap-3">
											<div className="flex items-center gap-4">
												<div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-white/10 bg-gradient-to-br from-indigo-500/25 to-sky-500/20 text-white shadow-[0_16px_30px_rgba(99,102,241,0.18)]">
													<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
													</svg>
												</div>
												<div>
													<div className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500">Project Space</div>
													<div className="mt-1 rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-300">
														{project.document_count ?? 0} document{project.document_count !== 1 ? 's' : ''}
													</div>
												</div>
											</div>
											<div className="flex gap-2">
												<ActionPill tone="brand" title="Add document" onClick={(e) => { e.stopPropagation(); setNewDocProjectId(project.id); setShowNewDocModal(true); }}>
													<Icon path="M12 4.5v15m7.5-7.5h-15" className="h-3.5 w-3.5" />
													New doc
												</ActionPill>
												<ActionPill tone="danger" title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(project.id, project.name); }}>
													<Icon path="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" className="h-3.5 w-3.5" />
													Delete
												</ActionPill>
											</div>
										</div>
										<h3 className="text-xl font-semibold tracking-tight text-white">{project.name}</h3>
										{project.description ? (
											<p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{project.description}</p>
										) : (
											<p className="mt-3 text-sm leading-6 text-slate-500">No project description added yet.</p>
										)}
										<div className="mt-6 flex items-center justify-between text-sm text-slate-500">
											<span className="flex items-center gap-1.5 transition-colors hover:text-indigo-300">
												<svg className={`h-4 w-4 transition-transform duration-200 ${expandedProjects[project.id] ? 'rotate-90 text-indigo-400' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" />
												</svg>
												View documents
											</span>
											<span>Updated {timeAgo(project.updated_at)}</span>
										</div>
									</div>

									{expandedProjects[project.id] ? (
										<div className="border-t border-white/8 bg-slate-950/20 px-6 py-5" onClick={(e) => e.stopPropagation()}>
											<div className="mb-3 flex items-center justify-between gap-3">
												<div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Documents</div>
												<div className="text-[11px] text-slate-500">Open a document or remove items from this project.</div>
											</div>
											{loadingDocsMap[project.id] ? (
												<div className="space-y-2">
													<div className="skeleton h-10 w-full rounded-xl"></div>
													<div className="skeleton h-10 w-2/3 rounded-xl"></div>
												</div>
											) : !projectDocsMap[project.id] || projectDocsMap[project.id].length === 0 ? (
												<div className="rounded-xl border border-dashed border-white/5 py-3 text-center text-sm text-slate-500">No documents yet. Click "New doc" to create one.</div>
											) : (
												<div className="custom-scrollbar max-h-[240px] space-y-2 overflow-y-auto pr-1">
													{projectDocsMap[project.id].map((doc) => {
														const icon = DIAGRAM_TYPES.find((dt) => dt.id === doc.diagram_type)?.icon || 'D';
														return (
															<div key={doc.id} className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-slate-950/40 p-3 transition hover:border-indigo-400/20 hover:bg-slate-950/70" onClick={() => { window.location.href = `/editor/${doc.id}`; }}>
																<div className="flex items-center gap-3">
																	<span className="text-xl">{icon}</span>
																	<div>
																		<div className="line-clamp-1 text-sm font-medium text-white">{doc.title}</div>
																		<div className="text-[10px] text-slate-500">{timeAgo(doc.updated_at)}</div>
																	</div>
																</div>
																<button
																	className="rounded-lg border border-red-500/16 bg-red-500/8 p-1.5 text-red-200 transition-colors hover:bg-red-500/20"
																	title="Delete document"
																	onClick={async (e) => {
																		e.stopPropagation();
																		if (!confirm(`Delete document "${doc.title}"?`)) return;
																		try {
																			await documentsApi.delete(doc.id);
																			setProjectDocsMap((prev) => ({
																				...prev,
																				[project.id]: prev[project.id].filter((d) => d.id !== doc.id)
																			}));
																			project.document_count = Math.max(0, (project.document_count || 1) - 1);
																		} catch (err) {
																			console.error('Failed to delete document:', err);
																		}
																	}}
																>
																	<svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
																		<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v3M4 7h16" />
																	</svg>
																</button>
															</div>
														);
													})}
												</div>
											)}
										</div>
									) : null}
								</Card>
							))}

							<button className="surface-panel group relative flex min-h-[260px] flex-col items-center justify-center overflow-hidden rounded-[1.75rem] border-dashed p-6 text-center hover:-translate-y-1 hover:border-indigo-400/24 hover:bg-indigo-500/8" onClick={() => setShowNewProjectModal(true)}>
								<div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.1),transparent_38%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
								<div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-[1.35rem] border border-white/10 bg-white/5 text-3xl text-white shadow-[0_12px_24px_rgba(2,6,23,0.2)]">+</div>
								<div className="relative text-xl font-semibold text-white">Create New Project</div>
								<div className="relative mt-3 max-w-xs text-sm leading-6 text-slate-500">Group related diagrams, workflows, and assets inside one polished project space.</div>
							</button>
						</div>
					)}
				</div>
			</main>

			<Modal open={showNewProjectModal} onClose={() => setShowNewProjectModal(false)} title="Create New Project">
				<div className="p-6">
					<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createProject(); }}>
						<Input label="Project Name" placeholder="My Project" value={newProjectName} onChange={setNewProjectName} />
						<div>
							<label htmlFor="proj-desc" className="field-label">Description (optional)</label>
							<textarea id="proj-desc" value={newProjectDescription} onChange={(e) => setNewProjectDescription(e.target.value)} rows={4} placeholder="What is this project about?" className="field"></textarea>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="ghost" size="sm" onClick={() => setShowNewProjectModal(false)}>Cancel</Button>
							<Button variant="primary" size="sm" type="submit" disabled={creatingProject || !newProjectName.trim()}>{creatingProject ? 'Creating...' : 'Create Project'}</Button>
						</div>
					</form>
				</div>
			</Modal>

			<Modal open={showNewDocModal} onClose={() => setShowNewDocModal(false)} title="Create Document" size="lg">
				<div className="p-6">
					<div className="mb-5">
						<Input label="Title" placeholder="Untitled" value={newDocTitle} onChange={setNewDocTitle} />
					</div>
					<label className="field-label">Diagram Type</label>
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
						{DIAGRAM_TYPES.map((dt) => (
							<button key={dt.id} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 text-left hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/10" onClick={() => createDocument(dt.id)} disabled={creatingDoc}>
								<div className="mb-4 text-2xl">{dt.icon}</div>
								<div className="text-sm font-medium text-white">{dt.name}</div>
							</button>
						))}
					</div>
				</div>
			</Modal>

			<Modal open={showEditWorkspaceModal} onClose={() => setShowEditWorkspaceModal(false)} title="Edit Workspace">
				<div className="p-6">
					<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); updateWorkspace(); }}>
						<Input label="Nama Workspace" placeholder="Mis. Product Design Squad" value={editWsName} onChange={setEditWsName} />
						<div>
							<label htmlFor="edit-ws-desc" className="field-label">Deskripsi (opsional)</label>
							<textarea id="edit-ws-desc" value={editWsDescription} onChange={(e) => setEditWsDescription(e.target.value)} rows={4} placeholder="Apa fungsi workspace ini?" className="field"></textarea>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="ghost" size="sm" type="button" onClick={() => setShowEditWorkspaceModal(false)}>Batal</Button>
							<Button variant="primary" size="sm" type="submit" disabled={isUpdatingWs || !editWsName.trim()}>{isUpdatingWs ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
						</div>
					</form>
				</div>
			</Modal>

			<Modal open={showDeleteWorkspaceModal} onClose={() => setShowDeleteWorkspaceModal(false)} title="Konfirmasi Hapus Workspace">
				<div className="p-6">
					<p className="mb-6 text-sm leading-7 text-slate-300">
						Apakah Anda yakin ingin menghapus workspace <span className="font-semibold text-white">"{workspace?.name}"</span>? Tindakan ini akan menghapus semua project dan dokumen di dalamnya, dan tidak dapat dibatalkan.
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="ghost" type="button" onClick={() => setShowDeleteWorkspaceModal(false)}>Batal</Button>
						<Button variant="danger" type="button" onClick={deleteWorkspace} disabled={isDeletingWs}>{isDeletingWs ? 'Menghapus...' : 'Ya, Hapus Workspace'}</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}

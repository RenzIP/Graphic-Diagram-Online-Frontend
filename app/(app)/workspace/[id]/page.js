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
			const project = await projectsApi.create({ workspace_id: workspaceId, name: newProjectName.trim(), description: newProjectDescription.trim() || undefined });
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
			const doc = await documentsApi.create({ workspace_id: workspaceId, project_id: newDocProjectId, title: newDocTitle.trim() || 'Untitled', diagram_type: typeId });
			setShowNewDocModal(false);
			setNewDocTitle('');
			window.location.href = `/editor/${doc.id}`;
		} catch (e) {
			console.error('Failed to create document:', e);
		} finally {
			setCreatingDoc(false);
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
						<p className="mt-2 text-sm leading-6 text-slate-400">{workspace?.description || 'Kelola project dan dokumen diagram dalam satu ruang kerja yang rapi dan siap kolaborasi.'}</p>
					</div>
					{workspace?.role === 'owner' || workspace?.role === 'editor' ? <Button variant="primary" size="sm" onClick={() => setShowNewProjectModal(true)}>New Project</Button> : null}
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

					<section className="mb-6 flex items-center justify-between">
						<div>
							<div className="section-kicker">
								<span className="h-2 w-2 rounded-full bg-indigo-400"></span>
								Project hub
							</div>
							<h2 className="mt-4 text-2xl font-semibold tracking-tight text-white">Projects</h2>
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
								<Card key={project.id} className="group relative cursor-pointer rounded-[1.75rem] p-0">
									<div className="absolute inset-x-6 top-0 h-1 rounded-b-full bg-gradient-to-r from-indigo-400 via-violet-400 to-sky-400 opacity-70"></div>
									<div className="p-6">
										<div className="mb-5 flex items-start justify-between">
											<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500/25 to-sky-500/20 text-white shadow-[0_16px_30px_rgba(99,102,241,0.18)]">
												<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
												</svg>
											</div>
											<div className="flex gap-2">
												<button className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs text-slate-300 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white" title="Add document" onClick={(e) => { e.stopPropagation(); setNewDocProjectId(project.id); setShowNewDocModal(true); }}>New doc</button>
												<button className="rounded-xl border border-red-400/16 bg-red-500/8 px-3 py-2 text-xs text-red-100 hover:border-red-300/24 hover:bg-red-500/12" title="Delete project" onClick={(e) => { e.stopPropagation(); deleteProject(project.id, project.name); }}>Delete</button>
											</div>
										</div>
										<h3 className="text-xl font-semibold tracking-tight text-white">{project.name}</h3>
										{project.description ? <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-400">{project.description}</p> : <p className="mt-3 text-sm leading-6 text-slate-500">No project description added yet.</p>}
										<div className="mt-6 flex items-center justify-between text-sm text-slate-500">
											<span>{project.document_count} document{project.document_count !== 1 ? 's' : ''}</span>
											<span>Updated {timeAgo(project.updated_at)}</span>
										</div>
									</div>
								</Card>
							))}
							<button className="surface-panel flex min-h-[220px] flex-col items-center justify-center rounded-[1.75rem] border-dashed p-6 text-center hover:-translate-y-1 hover:border-indigo-400/24 hover:bg-indigo-500/8" onClick={() => setShowNewProjectModal(true)}>
								<div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-white">+</div>
								<div className="text-lg font-medium text-white">Create New Project</div>
								<div className="mt-2 max-w-xs text-sm leading-6 text-slate-500">Group related diagrams, workflows, and assets inside one polished project space.</div>
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
		</div>
	);
}

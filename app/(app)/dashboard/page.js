'use client';

import { useEffect, useMemo, useState } from 'react';
import { currentUserStore } from '../../../lib/stores/auth.js';
import { useStore } from '../../../hooks/useStore.js';
import AppSidebar from '../../../components/layout/AppSidebar.js';
import Button from '../../../components/ui/Button.js';
import Input from '../../../components/ui/Input.js';
import Modal from '../../../components/ui/Modal.js';
import { DIAGRAM_TYPES } from '../../../lib/utils/constants.js';
import { documentsApi } from '../../../lib/api/documents.js';
import { workspacesApi } from '../../../lib/api/workspaces.js';

const typeColors = {
	flowchart: { tone: 'rgba(129,140,248,0.16)', border: 'rgba(129,140,248,0.26)', text: '#c7d2fe' },
	erd: { tone: 'rgba(192,132,252,0.16)', border: 'rgba(192,132,252,0.26)', text: '#e9d5ff' },
	usecase: { tone: 'rgba(56,189,248,0.16)', border: 'rgba(56,189,248,0.26)', text: '#bae6fd' },
	blank: { tone: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.22)', text: '#cbd5e1' }
};

function timeAgo(dateStr) {
	const now = new Date();
	const date = new Date(dateStr);
	const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
	if (diff < 60) return 'baru saja';
	if (diff < 3600) return `${Math.floor(diff / 60)} mnt yang lalu`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
	return `${Math.floor(diff / 86400)} hari yang lalu`;
}

function MetricCard({ label, value, detail }) {
	return (
		<div className="metric-card">
			<div className="text-sm font-medium text-slate-400">{label}</div>
			<div className="mt-4 text-3xl font-semibold tracking-tight text-white">{value}</div>
			<div className="mt-2 text-sm text-slate-500">{detail}</div>
		</div>
	);
}

export default function DashboardPage() {
	const user = useStore(useMemo(() => currentUserStore(), []));
	const [searchQuery, setSearchQuery] = useState('');
	const [filterType, setFilterType] = useState('');

	const [showNewDiagramModal, setShowNewDiagramModal] = useState(false);
	const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);

	const [documentToEdit, setDocumentToEdit] = useState(null);
	const [documentToDelete, setDocumentToDelete] = useState(null);
	const [editTitle, setEditTitle] = useState('');
	const [isUpdating, setIsUpdating] = useState(false);
	const [isDeleting, setIsDeleting] = useState(false);

	const [loading, setLoading] = useState(true);
	const [recentDocs, setRecentDocs] = useState([]);
	const [workspaces, setWorkspaces] = useState([]);
	const [newWsName, setNewWsName] = useState('');
	const [newWsDescription, setNewWsDescription] = useState('');
	const [creatingWs, setCreatingWs] = useState(false);
	const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('');
	const [newDiagramTitle, setNewDiagramTitle] = useState('');
	const [creatingDiagram, setCreatingDiagram] = useState(false);

	useEffect(() => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
		if (!token) {
			setLoading(false);
			return;
		}
		fetchDashboardData();
	}, []);

	function fetchDashboardData() {
		setLoading(true);
		Promise.all([documentsApi.recent(50), workspacesApi.list({ per_page: 50 })])
			.then(([recentRes, wsRes]) => {
				setRecentDocs(recentRes?.data ?? recentRes ?? []);
				setWorkspaces(wsRes.data ?? []);
				if (wsRes.data?.length > 0) setSelectedWorkspaceId(wsRes.data[0].id);
			})
			.catch((e) => {
				console.error('Failed to load dashboard data:', e);
				setRecentDocs([]);
				setWorkspaces([]);
				if (window.__gradiol_toast) window.__gradiol_toast('Gagal memuat data', 'error');
			})
			.finally(() => setLoading(false));
	}

	const filteredDocs = useMemo(() => {
		let docs = recentDocs;
		if (filterType) docs = docs.filter((d) => d.diagram_type === filterType);
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			docs = docs.filter((d) =>
				d.title.toLowerCase().includes(query) ||
				d.diagram_type.toLowerCase().includes(query) ||
				(d.workspace_name?.toLowerCase().includes(query) ?? false)
			);
		}
		return docs;
	}, [recentDocs, searchQuery, filterType]);

	const metrics = useMemo(() => {
		const activeWorkspaceCount = workspaces.length;
		const flowchartCount = recentDocs.filter((doc) => doc.diagram_type === 'flowchart').length;
		return [
			['Total diagrams', recentDocs.length, `${filteredDocs.length} shown in current view`],
			['Active workspaces', activeWorkspaceCount, activeWorkspaceCount ? 'Ready for collaboration' : 'Create your first workspace'],
			['Flowcharts', flowchartCount, 'Most used diagram category']
		];
	}, [filteredDocs.length, recentDocs, workspaces.length]);

	async function createDiagram(typeId) {
		if (!user) {
			const localId = 'local-' + crypto.randomUUID();
			setShowNewDiagramModal(false);
			window.location.href = `/editor/${localId}?type=${typeId}`;
			return;
		}
		if (!selectedWorkspaceId) {
			setShowNewDiagramModal(false);
			setShowNewWorkspaceModal(true);
			return;
		}
		if (!newDiagramTitle.trim() && typeId !== 'blank') {
			if (window.__gradiol_toast) window.__gradiol_toast('Judul diagram wajib diisi', 'error');
			return;
		}

		setCreatingDiagram(true);
		try {
			const doc = await documentsApi.create({
				workspace_id: selectedWorkspaceId,
				title: newDiagramTitle.trim() || 'Untitled',
				diagram_type: typeId
			});
			setShowNewDiagramModal(false);
			setNewDiagramTitle('');
			if (window.__gradiol_toast) window.__gradiol_toast('Diagram berhasil dibuat!', 'success');
			window.location.href = `/editor/${doc.id}`;
		} catch (e) {
			console.error('Failed to create diagram:', e);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal membuat diagram', 'error');
		} finally {
			setCreatingDiagram(false);
		}
	}

	async function updateDocumentTitle(e) {
		e.preventDefault();
		if (!documentToEdit || !editTitle.trim()) return;

		setIsUpdating(true);
		try {
			await documentsApi.update(documentToEdit.id, { title: editTitle.trim() });
			setDocumentToEdit(null);
			if (window.__gradiol_toast) window.__gradiol_toast('Judul diagram berhasil diperbarui!', 'success');
			fetchDashboardData();
		} catch (e) {
			console.error('Failed to update document:', e);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal memperbarui judul', 'error');
		} finally {
			setIsUpdating(false);
		}
	}

	async function confirmDeleteDocument() {
		if (!documentToDelete) return;

		setIsDeleting(true);
		try {
			await documentsApi.delete(documentToDelete.id);
			setDocumentToDelete(null);
			if (window.__gradiol_toast) window.__gradiol_toast('Diagram berhasil dihapus!', 'success');
			fetchDashboardData();
		} catch (e) {
			console.error('Failed to delete document:', e);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal menghapus diagram', 'error');
		} finally {
			setIsDeleting(false);
		}
	}

	async function createWorkspace() {
		if (!newWsName.trim()) {
			if (window.__gradiol_toast) window.__gradiol_toast('Nama workspace wajib diisi', 'error');
			return;
		}
		setCreatingWs(true);
		try {
			const ws = await workspacesApi.create({ name: newWsName.trim(), description: newWsDescription.trim() || undefined });
			setWorkspaces((items) => [...items, ws]);
			if (!selectedWorkspaceId) setSelectedWorkspaceId(ws.id);
			setShowNewWorkspaceModal(false);
			setNewWsName('');
			setNewWsDescription('');
			if (window.__gradiol_toast) window.__gradiol_toast('Workspace berhasil dibuat!', 'success');
		} catch (e) {
			console.error('Failed to create workspace:', e);
			if (window.__gradiol_toast) window.__gradiol_toast('Gagal membuat workspace', 'error');
		} finally {
			setCreatingWs(false);
		}
	}

	function openEditModal(doc) {
		setDocumentToEdit(doc);
		setEditTitle(doc.title);
	}

	return (
		<div className="page-shell">
			<AppSidebar />
			<main className="page-main">
				<header className="page-header">
					<div>
						<div className="section-kicker">
							<span className="h-2 w-2 rounded-full bg-sky-400"></span>
							Overview
						</div>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Dashboard Utama</h1>
						<p className="mt-2 text-sm leading-6 text-slate-400">Monitor diagram terbaru, kelola workspace, dan mulai dokumen baru tanpa keluar dari workspace flow.</p>
					</div>
					<div className="flex flex-wrap items-center justify-end gap-3">
						<select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="field-sm min-w-[190px]">
							<option value="">Semua Tipe Diagram</option>
							{DIAGRAM_TYPES.map((dt) => (
								<option key={dt.id} value={dt.id}>{dt.name}</option>
							))}
						</select>
						<div className="relative min-w-[260px]">
							<svg className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.6-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
							</svg>
							<input type="text" placeholder="Cari diagram, workspace, atau tipe..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="field-sm w-full pl-11" />
						</div>
						<Button variant="primary" size="sm" onClick={() => setShowNewDiagramModal(true)}>Buat diagram baru</Button>
					</div>
				</header>

				<div className="page-content">
					<section className="mb-8 grid gap-5 lg:grid-cols-3">
						{metrics.map(([label, value, detail]) => (
							<MetricCard key={label} label={label} value={value} detail={detail} />
						))}
					</section>

					<section className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
						<div className="surface-panel rounded-[1.75rem] p-6">
							<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
								<div>
									<p className="text-sm font-medium text-slate-400">Recent activity</p>
									<h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">List Data Diagram</h2>
								</div>
								<div className="rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-400">
									{loading ? 'Memuat data...' : `${filteredDocs.length} diagram tampil`}
								</div>
							</div>
						</div>

						<div className="surface-panel rounded-[1.75rem] p-6">
							<p className="text-sm font-medium text-slate-400">Quick action</p>
							<div className="mt-4 flex flex-wrap gap-3">
								<Button variant="secondary" size="sm" onClick={() => setShowNewDiagramModal(true)}>New diagram</Button>
								<Button variant="outline" size="sm" onClick={() => setShowNewWorkspaceModal(true)}>Create workspace</Button>
							</div>
							<p className="mt-4 text-sm leading-6 text-slate-500">Gunakan quick action untuk mulai flow baru lebih cepat tanpa berpindah halaman.</p>
						</div>
					</section>

					<section className="data-table">
						<div className="overflow-x-auto">
							<table>
								<thead>
									<tr>
										<th>No</th>
										<th>Judul Diagram</th>
										<th>Tipe</th>
										<th>Workspace / Project</th>
										<th>Terakhir Diubah</th>
										<th className="text-right">Aksi</th>
									</tr>
								</thead>
								<tbody>
									{loading ? (
										Array.from({ length: 5 }).map((_, idx) => (
											<tr key={idx}>
												<td colSpan="6">
													<div className="grid gap-3 px-6 py-4">
														<div className="skeleton h-5 w-16 rounded-full"></div>
														<div className="skeleton h-5 w-full rounded-full"></div>
													</div>
												</td>
											</tr>
										))
									) : filteredDocs.length === 0 ? (
										<tr>
											<td colSpan="6">
												<div className="empty-state m-6">
													<div className="mb-3 text-lg font-medium text-white">{searchQuery || filterType ? 'Tidak ada diagram yang cocok' : 'Belum ada diagram.'}</div>
													<p className="max-w-md text-sm leading-6 text-slate-500">{searchQuery || filterType ? 'Coba ubah filter atau kata kunci pencarian Anda.' : 'Mulai dari diagram baru untuk mengisi dashboard dengan dokumen terbaru.'}</p>
												</div>
											</td>
										</tr>
									) : (
										filteredDocs.map((doc, idx) => {
											const tone = typeColors[doc.diagram_type] || typeColors.blank;
											return (
												<tr key={doc.id}>
													<td className="text-slate-500">{idx + 1}</td>
													<td>
														<div className="font-medium text-white">{doc.title}</div>
													</td>
													<td>
														<span className="status-pill" style={{ background: tone.tone, borderColor: tone.border, color: tone.text }}>
															<span className="h-2 w-2 rounded-full" style={{ background: tone.text }}></span>
															{doc.diagram_type}
														</span>
													</td>
													<td className="text-slate-400">
														{doc.workspace_name} {doc.project_name ? <span className="opacity-60">/ {doc.project_name}</span> : ''}
													</td>
													<td className="text-slate-400">{timeAgo(doc.updated_at)}</td>
													<td>
														<div className="flex justify-end gap-2">
															<Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => (window.location.href = `/editor/${doc.id}`)}>Detail</Button>
															<Button variant="outline" size="sm" className="h-9 px-3" onClick={() => openEditModal(doc)}>Edit</Button>
															<Button variant="danger" size="sm" className="h-9 px-3" onClick={() => setDocumentToDelete(doc)}>Hapus</Button>
														</div>
													</td>
												</tr>
											);
										})
									)}
								</tbody>
							</table>
						</div>
					</section>
				</div>
			</main>

			<Modal open={showNewDiagramModal} onClose={() => setShowNewDiagramModal(false)} title="Buat Diagram Baru" size="lg">
				<div className="p-6">
					{(() => {
						if (loading) return <div className="py-10 text-center text-sm text-slate-400">Memuat workspace...</div>;
						if (!user) {
							return (
								<>
									<p className="mb-5 text-sm leading-6 text-slate-400">Pilih tipe diagram dan lanjutkan sebagai workspace lokal.</p>
									<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
										{DIAGRAM_TYPES.map((dt) => (
											<button key={dt.id} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 text-left hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/10" onClick={() => createDiagram(dt.id)}>
												<div className="mb-4 text-2xl">{dt.icon}</div>
												<div className="text-sm font-medium text-white">{dt.name}</div>
											</button>
										))}
									</div>
								</>
							);
						}
						if (workspaces.length === 0) {
							return <p className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-sm leading-6 text-slate-300">Anda harus memiliki workspace terlebih dahulu. <button className="font-semibold text-indigo-300 hover:text-white" onClick={() => { setShowNewDiagramModal(false); setShowNewWorkspaceModal(true); }}>Buat workspace</button></p>;
						}
						return (
							<>
								<div className="space-y-4">
									<Input label="Judul Diagram" placeholder="Mis. Checkout Flow" value={newDiagramTitle} onChange={setNewDiagramTitle} />
									<div>
										<label htmlFor="ws-select" className="field-label">Workspace</label>
										<select id="ws-select" value={selectedWorkspaceId} onChange={(e) => setSelectedWorkspaceId(e.target.value)} className="field">
											{workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
										</select>
									</div>
								</div>
								<div className="mt-6">
									<label className="field-label">Pilih Tipe Diagram</label>
									<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
										<button className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 text-left hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/10" onClick={() => createDiagram('blank')} disabled={creatingDiagram}>
											<div className="mb-4 text-2xl opacity-70">+</div>
											<div className="text-sm font-medium text-white">Blank Diagram</div>
										</button>
										{DIAGRAM_TYPES.map((dt) => (
											<button key={dt.id} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 text-left hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/10" onClick={() => createDiagram(dt.id)} disabled={creatingDiagram}>
												<div className="mb-4 text-2xl">{dt.icon}</div>
												<div className="text-sm font-medium text-white">{dt.name}</div>
											</button>
										))}
									</div>
								</div>
							</>
						);
					})()}
				</div>
			</Modal>

			<Modal open={!!documentToEdit} onClose={() => setDocumentToEdit(null)} title="Edit Judul Diagram">
				<div className="p-6">
					<form onSubmit={updateDocumentTitle} className="space-y-4">
						<Input label="Judul Diagram Baru" placeholder="Masukkan judul..." value={editTitle} onChange={setEditTitle} autoFocus />
						<div className="flex justify-end gap-3 pt-2">
							<Button variant="ghost" type="button" onClick={() => setDocumentToEdit(null)}>Batal</Button>
							<Button variant="primary" type="submit" disabled={isUpdating || !editTitle.trim()}>{isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}</Button>
						</div>
					</form>
				</div>
			</Modal>

			<Modal open={!!documentToDelete} onClose={() => setDocumentToDelete(null)} title="Konfirmasi Hapus">
				<div className="p-6">
					<p className="mb-6 text-sm leading-7 text-slate-300">
						Apakah Anda yakin ingin menghapus diagram <span className="font-semibold text-white">"{documentToDelete?.title}"</span>? Tindakan ini tidak dapat dibatalkan.
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="ghost" onClick={() => setDocumentToDelete(null)}>Batal</Button>
						<Button variant="danger" onClick={confirmDeleteDocument} disabled={isDeleting}>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</Button>
					</div>
				</div>
			</Modal>

			<Modal open={showNewWorkspaceModal} onClose={() => setShowNewWorkspaceModal(false)} title="Buat Workspace">
				<div className="p-6">
					<form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createWorkspace(); }}>
						<Input label="Nama Workspace" placeholder="Mis. Product Design Squad" value={newWsName} onChange={setNewWsName} />
						<div>
							<label htmlFor="ws-desc" className="field-label">Deskripsi (opsional)</label>
							<textarea id="ws-desc" value={newWsDescription} onChange={(e) => setNewWsDescription(e.target.value)} rows={4} placeholder="Apa fungsi workspace ini?" className="field"></textarea>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="ghost" size="sm" onClick={() => setShowNewWorkspaceModal(false)}>Batal</Button>
							<Button variant="primary" size="sm" type="submit" disabled={creatingWs || !newWsName.trim()}>{creatingWs ? 'Creating...' : 'Create'}</Button>
						</div>
					</form>
				</div>
			</Modal>
		</div>
	);
}

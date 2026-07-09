'use client';

import { useEffect, useMemo, useState } from 'react';
import { currentUserStore } from '../../../lib/stores/auth.js';
import { useStore } from '../../../hooks/useStore.js';
import AppSidebar from '../../../components/layout/AppSidebar.js';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';
import Input from '../../../components/ui/Input.js';
import Modal from '../../../components/ui/Modal.js';
import { DIAGRAM_TYPES } from '../../../lib/utils/constants.js';
import { documentsApi } from '../../../lib/api/documents.js';
import { workspacesApi } from '../../../lib/api/workspaces.js';

const typeColors = { flowchart: 'indigo', erd: 'purple', usecase: 'cyan', blank: 'slate' };

function timeAgo(dateStr) {
	const now = new Date();
	const date = new Date(dateStr);
	const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
	if (diff < 60) return 'baru saja';
	if (diff < 3600) return `${Math.floor(diff / 60)} mnt yang lalu`;
	if (diff < 86400) return `${Math.floor(diff / 3600)} jam yang lalu`;
	return `${Math.floor(diff / 86400)} hari yang lalu`;
}

export default function DashboardPage() {
	const user = useStore(useMemo(() => currentUserStore(), []));
	const [searchQuery, setSearchQuery] = useState('');
	const [filterType, setFilterType] = useState('');
	
	const [showNewDiagramModal, setShowNewDiagramModal] = useState(false);
	const [showNewWorkspaceModal, setShowNewWorkspaceModal] = useState(false);
	
	// Modals for CRUD Edit/Delete
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
		if (filterType) {
			docs = docs.filter(d => d.diagram_type === filterType);
		}
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
		<div className="flex h-screen overflow-hidden bg-slate-950 text-slate-200">
			<AppSidebar />
			<main className="flex min-h-0 flex-1 flex-col overflow-hidden">
				<header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-8">
					<h1 className="text-xl font-bold text-white">Dashboard Utama</h1>
					<div className="flex w-1/2 justify-end gap-4">
						<select 
							value={filterType} 
							onChange={(e) => setFilterType(e.target.value)} 
							className="rounded-lg border border-slate-800 bg-slate-900 py-2 px-3 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"
						>
							<option value="">Semua Tipe Diagram</option>
							{DIAGRAM_TYPES.map(dt => (
								<option key={dt.id} value={dt.id}>{dt.name}</option>
							))}
						</select>
						
						<div className="relative w-64">
							<div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
								<svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
							</div>
							<input type="text" placeholder="Cari diagram..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pr-4 pl-10 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none" />
						</div>
						<Button variant="primary" size="sm" onClick={() => setShowNewDiagramModal(true)}>+ Buat Baru</Button>
					</div>
				</header>

				<div className="flex-1 overflow-y-auto p-8">
					<section className="mb-10">
						<div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-white">List Data Diagram</h2></div>
						
						<div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg">
							<div className="overflow-x-auto">
								<table className="w-full text-left text-sm text-slate-300">
									<thead className="bg-slate-900 text-xs text-slate-400 uppercase border-b border-slate-800">
										<tr>
											<th scope="col" className="px-6 py-4 font-medium">No</th>
											<th scope="col" className="px-6 py-4 font-medium">Judul Diagram</th>
											<th scope="col" className="px-6 py-4 font-medium">Tipe Diagram</th>
											<th scope="col" className="px-6 py-4 font-medium">Workspace / Project</th>
											<th scope="col" className="px-6 py-4 font-medium">Terakhir Diubah</th>
											<th scope="col" className="px-6 py-4 text-right font-medium">Aksi</th>
										</tr>
									</thead>
									<tbody className="divide-y divide-slate-800/60">
										{loading ? (
											<tr>
												<td colSpan="6" className="px-6 py-12 text-center">
													<div className="flex items-center justify-center">
														<div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-500"></div>
														<span className="ml-3 text-sm text-slate-500">Memuat data diagram...</span>
													</div>
												</td>
											</tr>
										) : filteredDocs.length === 0 ? (
											<tr>
												<td colSpan="6" className="px-6 py-12 text-center">
													<p className="text-slate-500">
														{searchQuery || filterType ? 'Tidak ada data diagram yang sesuai filter' : 'Belum ada data diagram. Silakan buat baru!'}
													</p>
												</td>
											</tr>
										) : (
											filteredDocs.map((doc, idx) => {
												const color = typeColors[doc.diagram_type] || 'slate';
												return (
													<tr key={doc.id} className="transition-colors hover:bg-slate-800/40 group">
														<td className="px-6 py-4">{idx + 1}</td>
														<td className="px-6 py-4 font-medium text-slate-200 group-hover:text-indigo-400">{doc.title}</td>
														<td className="px-6 py-4">
															<span className={`inline-flex items-center rounded-md border border-${color}-500/20 bg-${color}-500/10 px-2 py-1 text-xs font-medium text-${color}-400 uppercase tracking-wider`}>
																{doc.diagram_type}
															</span>
														</td>
														<td className="px-6 py-4 text-slate-400">
															{doc.workspace_name} {doc.project_name ? <span className="opacity-60">/ {doc.project_name}</span> : ''}
														</td>
														<td className="px-6 py-4 text-slate-400">{timeAgo(doc.updated_at)}</td>
														<td className="px-6 py-4 text-right">
															<div className="flex justify-end items-center gap-2">
																<Button variant="ghost" size="sm" className="h-8 px-3 text-emerald-400 hover:bg-emerald-400/10 hover:text-emerald-300" onClick={() => (window.location.href = `/editor/${doc.id}`)}>
																	Detail
																</Button>
																<Button variant="ghost" size="sm" className="h-8 px-3 text-indigo-400 hover:bg-indigo-400/10 hover:text-indigo-300" onClick={() => openEditModal(doc)}>
																	Edit
																</Button>
																<Button variant="ghost" size="sm" className="h-8 px-3 text-red-400 hover:bg-red-400/10 hover:text-red-300" onClick={() => setDocumentToDelete(doc)}>
																	Hapus
																</Button>
															</div>
														</td>
													</tr>
												);
											})
										)}
									</tbody>
								</table>
							</div>
						</div>
					</section>
				</div>
			</main>

			{/* Modal: Create Diagram */}
			<Modal open={showNewDiagramModal} onClose={() => setShowNewDiagramModal(false)}>
				<div className="p-6">
					<h3 className="mb-4 text-lg font-semibold text-white">Buat Diagram Baru</h3>
					{(() => {
						if (loading) return null;
						if (!user) {
							return (
								<>
									<div className="mb-4">
										<label className="mb-2 block text-sm text-slate-400">Tipe Diagram</label>
										<div className="grid grid-cols-3 gap-2">
											{DIAGRAM_TYPES.map((dt) => <button key={dt.id} className="flex flex-col items-center rounded-lg border border-slate-700 bg-slate-800 p-3 text-center transition-colors hover:border-indigo-500 hover:bg-slate-700" onClick={() => createDiagram(dt.id)}><span className="mb-1 text-xl">{dt.icon}</span><span className="text-xs text-slate-300">{dt.name}</span></button>)}
										</div>
									</div>
								</>
							);
						}
						if (workspaces.length === 0) {
							return <p className="mb-4 text-sm text-slate-400">Anda harus memiliki workspace terlebih dahulu. <button className="text-indigo-400 hover:text-indigo-300" onClick={() => { setShowNewDiagramModal(false); setShowNewWorkspaceModal(true); }}>Buat workspace</button></p>;
						}
						return (
							<>
								<div className="mb-4 space-y-3">
									<Input label="Judul Diagram" placeholder="Judul..." value={newDiagramTitle} onChange={setNewDiagramTitle} />
									<div>
										<label htmlFor="ws-select" className="mb-1 block text-sm text-slate-400">Workspace</label>
										<select id="ws-select" value={selectedWorkspaceId} onChange={(e) => setSelectedWorkspaceId(e.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none">
											{workspaces.map((ws) => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
										</select>
									</div>
								</div>
								<div className="mb-4">
									<label className="mb-2 block text-sm text-slate-400">Pilih Tipe Diagram</label>
									<div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
										<button className="flex flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-3 text-center transition-colors hover:border-indigo-500 hover:bg-slate-700" onClick={() => createDiagram('blank')} disabled={creatingDiagram}>
											<span className="mb-1 text-xl opacity-50">+</span>
											<span className="text-xs text-slate-300">Blank Diagram</span>
										</button>
										{DIAGRAM_TYPES.map((dt) => (
											<button key={dt.id} className="flex flex-col items-center rounded-lg border border-slate-700 bg-slate-800 p-3 text-center transition-colors hover:border-indigo-500 hover:bg-slate-700" onClick={() => createDiagram(dt.id)} disabled={creatingDiagram}>
												<span className="mb-1 text-xl">{dt.icon}</span>
												<span className="text-xs text-slate-300">{dt.name}</span>
											</button>
										))}
									</div>
								</div>
							</>
						);
					})()}
				</div>
			</Modal>

			{/* Modal: Edit Document */}
			<Modal open={!!documentToEdit} onClose={() => setDocumentToEdit(null)}>
				<div className="p-6">
					<h3 className="mb-4 text-lg font-semibold text-white">Edit Judul Diagram</h3>
					<form onSubmit={updateDocumentTitle} className="space-y-4">
						<Input 
							label="Judul Diagram Baru" 
							placeholder="Masukkan judul..." 
							value={editTitle} 
							onChange={setEditTitle} 
							autoFocus
						/>
						<div className="flex justify-end gap-3 pt-2">
							<Button variant="ghost" type="button" onClick={() => setDocumentToEdit(null)}>Batal</Button>
							<Button variant="primary" type="submit" disabled={isUpdating || !editTitle.trim()}>
								{isUpdating ? 'Menyimpan...' : 'Simpan Perubahan'}
							</Button>
						</div>
					</form>
				</div>
			</Modal>

			{/* Modal: Delete Confirmation */}
			<Modal open={!!documentToDelete} onClose={() => setDocumentToDelete(null)}>
				<div className="p-6">
					<h3 className="mb-2 text-lg font-semibold text-white">Konfirmasi Hapus</h3>
					<p className="mb-6 text-slate-400">
						Apakah Anda yakin ingin menghapus diagram <span className="font-semibold text-slate-200">"{documentToDelete?.title}"</span>? Tindakan ini tidak dapat dibatalkan.
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="ghost" onClick={() => setDocumentToDelete(null)}>Batal</Button>
						<Button variant="primary" className="bg-red-500 hover:bg-red-600 border-red-500" onClick={confirmDeleteDocument} disabled={isDeleting}>
							{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
						</Button>
					</div>
				</div>
			</Modal>

			{/* Modal: Create Workspace */}
			<Modal open={showNewWorkspaceModal} onClose={() => setShowNewWorkspaceModal(false)}>
				<div className="p-6">
					<h3 className="mb-4 text-lg font-semibold text-white">Buat Workspace</h3>
					<form className="space-y-3" onSubmit={(e) => { e.preventDefault(); createWorkspace(); }}>
						<Input label="Nama Workspace" placeholder="My Workspace" value={newWsName} onChange={setNewWsName} />
						<div>
							<label htmlFor="ws-desc" className="mb-1 block text-sm text-slate-400">Deskripsi (opsional)</label>
							<textarea id="ws-desc" value={newWsDescription} onChange={(e) => setNewWsDescription(e.target.value)} rows={3} placeholder="Apa fungsi workspace ini?" className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:ring-2 focus:ring-indigo-500/50 focus:outline-none"></textarea>
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

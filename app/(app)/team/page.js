'use client';

import { useEffect, useMemo, useState } from 'react';
import AppSidebar from '../../../components/layout/AppSidebar.js';
import Card from '../../../components/ui/Card.js';
import Button from '../../../components/ui/Button.js';
import Input from '../../../components/ui/Input.js';
import Modal from '../../../components/ui/Modal.js';
import Avatar from '../../../components/ui/Avatar.js';
import { workspacesApi } from '../../../lib/api/workspaces.js';
import { currentUserStore } from '../../../lib/stores/auth.js';
import { useStore } from '../../../hooks/useStore.js';

const roleBadges = {
	owner: { label: 'Owner', className: 'border-amber-400/25 bg-amber-500/12 text-amber-100' },
	editor: { label: 'Editor', className: 'border-indigo-400/25 bg-indigo-500/12 text-indigo-100' },
	viewer: { label: 'Viewer', className: 'border-slate-400/20 bg-slate-500/12 text-slate-200' }
};

function initialsOf(member) {
	const base = member.name || member.username || member.email || '?';
	return base
		.split(/[\s@.]+/)
		.filter(Boolean)
		.map((w) => w[0])
		.join('')
		.toUpperCase()
		.slice(0, 2);
}

export default function TeamPage() {
	const currentUser = useStore(useMemo(() => currentUserStore(), []));
	const me = currentUser?.data || currentUser || {};

	const [workspaces, setWorkspaces] = useState([]);
	const [selectedWsId, setSelectedWsId] = useState('');
	const [members, setMembers] = useState([]);
	const [loadingWs, setLoadingWs] = useState(true);
	const [loadingMembers, setLoadingMembers] = useState(false);
	const [error, setError] = useState(null);

	const [showInvite, setShowInvite] = useState(false);
	const [inviteIdentifier, setInviteIdentifier] = useState('');
	const [inviteRole, setInviteRole] = useState('editor');
	const [inviting, setInviting] = useState(false);

	const [memberToRemove, setMemberToRemove] = useState(null);
	const [removing, setRemoving] = useState(false);

	const selectedWs = workspaces.find((w) => w.id === selectedWsId);
	const isOwner = selectedWs?.role === 'owner';

	useEffect(() => {
		const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
		if (!token) {
			setLoadingWs(false);
			return;
		}
		workspacesApi
			.list({ per_page: 50 })
			.then((res) => {
				const list = res.data ?? [];
				setWorkspaces(list);
				if (list.length > 0) setSelectedWsId(list[0].id);
			})
			.catch(() => setError('Failed to load workspaces'))
			.finally(() => setLoadingWs(false));
	}, []);

	useEffect(() => {
		if (!selectedWsId) {
			setMembers([]);
			return;
		}
		loadMembers(selectedWsId);
	}, [selectedWsId]);

	function loadMembers(wsId) {
		setLoadingMembers(true);
		setError(null);
		workspacesApi
			.listMembers(wsId)
			.then((res) => setMembers(res.data ?? []))
			.catch((err) => setError(err.data?.message || 'Failed to load members'))
			.finally(() => setLoadingMembers(false));
	}

	async function handleInvite(e) {
		e.preventDefault();
		if (!inviteIdentifier.trim()) return;
		setInviting(true);
		try {
			await workspacesApi.addMember(selectedWsId, {
				identifier: inviteIdentifier.trim(),
				role: inviteRole
			});
			window.__gradiol_toast?.('Member added', 'success');
			setShowInvite(false);
			setInviteIdentifier('');
			setInviteRole('editor');
			loadMembers(selectedWsId);
		} catch (err) {
			window.__gradiol_toast?.(err.data?.message || 'Failed to add member', 'error');
		} finally {
			setInviting(false);
		}
	}

	async function handleRoleChange(member, role) {
		if (member.role === role) return;
		try {
			await workspacesApi.updateMemberRole(selectedWsId, member.user_id, role);
			setMembers((prev) => prev.map((m) => (m.user_id === member.user_id ? { ...m, role } : m)));
			window.__gradiol_toast?.('Role updated', 'success');
		} catch (err) {
			window.__gradiol_toast?.(err.data?.message || 'Failed to update role', 'error');
		}
	}

	async function confirmRemove() {
		if (!memberToRemove) return;
		setRemoving(true);
		try {
			await workspacesApi.removeMember(selectedWsId, memberToRemove.user_id);
			window.__gradiol_toast?.('Member removed', 'success');
			setMemberToRemove(null);
			loadMembers(selectedWsId);
		} catch (err) {
			window.__gradiol_toast?.(err.data?.message || 'Failed to remove member', 'error');
		} finally {
			setRemoving(false);
		}
	}

	return (
		<div className="page-shell">
			<AppSidebar />
			<main className="page-main">
				<header className="page-header">
					<div>
						<div className="section-kicker">
							<span className="h-2 w-2 rounded-full bg-sky-400"></span>
							Collaboration
						</div>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Team Members</h1>
						<p className="mt-2 text-sm leading-6 text-slate-400">Kelola siapa yang bisa mengakses workspace dan atur perannya.</p>
					</div>
					{isOwner && members.length > 0 ? (
						<Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
							Tambah Anggota
						</Button>
					) : null}
				</header>

				<div className="page-content space-y-6">
					{loadingWs ? (
						<Card className="p-8 text-sm text-slate-400">Memuat workspace...</Card>
					) : workspaces.length === 0 ? (
						<Card className="empty-state rounded-[1.75rem] border-dashed p-16">
							<h2 className="mb-2 text-xl font-semibold text-white">Belum ada workspace</h2>
							<p className="max-w-md text-sm leading-6 text-slate-500">
								Buat workspace terlebih dahulu di dashboard sebelum mengundang anggota tim.
							</p>
						</Card>
					) : (
						<>
							<div>
								<label htmlFor="ws-select" className="field-label">Workspace</label>
								<select
									id="ws-select"
									value={selectedWsId}
									onChange={(e) => setSelectedWsId(e.target.value)}
									className="field"
								>
									{workspaces.map((ws) => (
										<option key={ws.id} value={ws.id}>
											{ws.name}
										</option>
									))}
								</select>
							</div>

							{error ? (
								<Card className="border-red-400/20 bg-red-500/8 p-4 text-sm text-red-200">{error}</Card>
							) : null}

							<Card className="overflow-hidden">
								<div className="flex items-center justify-between border-b border-white/8 px-6 py-4">
									<div>
										<h2 className="text-sm font-semibold text-white">Anggota</h2>
										<p className="text-xs text-slate-500">
											{loadingMembers ? 'Memuat...' : `${members.length} anggota`}
										</p>
									</div>
									{!isOwner ? (
										<span className="text-xs text-slate-500">Hanya owner yang bisa mengelola anggota</span>
									) : null}
								</div>

								{loadingMembers ? (
									<div className="p-8 text-sm text-slate-400">Memuat anggota...</div>
								) : members.length === 0 ? (
									<div className="p-8 text-sm text-slate-400">Belum ada anggota.</div>
								) : (
									<ul className="divide-y divide-white/6">
										{members.map((member) => {
											const badge = roleBadges[member.role] ?? roleBadges.viewer;
											const isSelf = member.user_id === (me.id ?? '');
											return (
												<li key={member.user_id} className="flex items-center gap-4 px-6 py-4">
													<Avatar size="md" initials={initialsOf(member)} />
													<div className="min-w-0 flex-1">
														<div className="flex items-center gap-2">
															<span className="truncate text-sm font-medium text-white">
																{member.name || member.username || 'User'}
															</span>
															{isSelf ? (
																<span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[0.65rem] text-slate-400">
																	Anda
																</span>
															) : null}
														</div>
														<div className="truncate text-xs text-slate-500">
															{member.email || member.username || '—'}
														</div>
													</div>

													{isOwner && !member.is_owner ? (
														<select
															value={member.role}
															onChange={(e) => handleRoleChange(member, e.target.value)}
															className="field h-9 w-28 py-0 text-xs"
															aria-label="Ubah peran"
														>
															<option value="editor">Editor</option>
															<option value="viewer">Viewer</option>
														</select>
													) : (
														<span className={`rounded-full border px-3 py-1 text-xs font-medium ${badge.className}`}>
															{badge.label}
														</span>
													)}

													{!member.is_owner && (isOwner || isSelf) ? (
														<button
															onClick={() => setMemberToRemove(member)}
															className="rounded-lg border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-red-200 hover:border-red-300/35 hover:bg-red-500/12"
														>
															{isSelf && !isOwner ? 'Keluar' : 'Hapus'}
														</button>
													) : null}
												</li>
											);
										})}
									</ul>
								)}
							</Card>
						</>
					)}
				</div>
			</main>

			<Modal open={showInvite} onClose={() => setShowInvite(false)} title="Tambah Anggota">
				<div className="p-6">
					<form className="space-y-4" onSubmit={handleInvite}>
						<Input
							label="Username atau Email"
							placeholder="mis. rani atau rani@contoh.com"
							value={inviteIdentifier}
							onChange={setInviteIdentifier}
							autoFocus
						/>
						<div>
							<label htmlFor="invite-role" className="field-label">Peran</label>
							<select
								id="invite-role"
								value={inviteRole}
								onChange={(e) => setInviteRole(e.target.value)}
								className="field"
							>
								<option value="editor">Editor — bisa mengedit diagram</option>
								<option value="viewer">Viewer — hanya bisa melihat</option>
							</select>
						</div>
						<div className="flex justify-end gap-2 pt-2">
							<Button variant="ghost" size="sm" type="button" onClick={() => setShowInvite(false)}>
								Batal
							</Button>
							<Button variant="primary" size="sm" type="submit" disabled={inviting || !inviteIdentifier.trim()}>
								{inviting ? 'Menambahkan...' : 'Tambah'}
							</Button>
						</div>
					</form>
				</div>
			</Modal>

			<Modal open={!!memberToRemove} onClose={() => setMemberToRemove(null)} title="Konfirmasi">
				<div className="p-6">
					<p className="mb-6 text-sm leading-7 text-slate-300">
						{memberToRemove?.user_id === (me.id ?? '')
							? 'Yakin ingin keluar dari workspace ini?'
							: `Yakin ingin menghapus ${memberToRemove?.name || memberToRemove?.username || 'anggota ini'} dari workspace?`}
					</p>
					<div className="flex justify-end gap-3">
						<Button variant="ghost" onClick={() => setMemberToRemove(null)}>Batal</Button>
						<Button variant="danger" onClick={confirmRemove} disabled={removing}>
							{removing ? 'Memproses...' : 'Ya, Lanjutkan'}
						</Button>
					</div>
				</div>
			</Modal>
		</div>
	);
}

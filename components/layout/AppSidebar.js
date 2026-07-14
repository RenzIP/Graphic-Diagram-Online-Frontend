'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import Avatar from '../ui/Avatar.js';
import BrandLogo, { BrandMark } from '../ui/BrandLogo.js';
import { workspacesApi } from '../../lib/api/workspaces.js';
import { currentUserStore, logout } from '../../lib/stores/auth.js';
import { useStore } from '../../hooks/useStore.js';

const workspaceAccents = ['#818cf8', '#38bdf8', '#22c55e', '#f59e0b', '#f472b6', '#c084fc'];

function SidebarIcon({ path }) {
	return (
		<svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
			<path strokeLinecap="round" strokeLinejoin="round" d={path} />
		</svg>
	);
}

function NavLink({ href, active, icon, children }) {
	return (
		<a
			href={href}
			className={`group relative flex items-center justify-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium transition duration-200 md:justify-start ${
				active
					? 'border border-white/10 bg-white/10 text-white shadow-[0_14px_30px_rgba(15,23,42,0.24)]'
					: 'border border-transparent text-slate-300 hover:-translate-y-0.5 hover:border-white/8 hover:bg-white/6 hover:text-white'
			}`}
		>
			<span className={`absolute inset-y-2 left-1 w-1 rounded-full bg-gradient-to-b from-indigo-400 to-sky-400 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-50'}`}></span>
			<span className={`flex h-10 w-10 items-center justify-center rounded-2xl border transition ${active ? 'border-white/10 bg-white/10 text-white' : 'border-white/6 bg-slate-950/20 text-slate-400 group-hover:border-white/10 group-hover:bg-white/8 group-hover:text-slate-100'}`}>
				{icon}
			</span>
			<span className="hidden md:inline">{children}</span>
		</a>
	);
}

export default function AppSidebar() {
	const pathname = usePathname();
	const router = useRouter();
	const user = useStore(useMemo(() => currentUserStore(), []));
	const [workspaces, setWorkspaces] = useState([]);
	const [showUserMenu, setShowUserMenu] = useState(false);

	useEffect(() => {
		if (!user) return;
		workspacesApi
			.list({ per_page: 50 })
			.then((res) => setWorkspaces(res.data ?? []))
			.catch(() => setWorkspaces([]));
	}, [user]);

	useEffect(() => {
		const close = () => setShowUserMenu(false);
		window.addEventListener('click', close);
		return () => window.removeEventListener('click', close);
	}, []);

	async function handleLogout() {
		await logout();
		router.push('/login');
	}

	// Safely parse user in case it's wrapped or missing fields
	const parsedUser = user?.data || user || {};
	const displayName = parsedUser.name || parsedUser.full_name || 'User';
	const displayEmail = parsedUser.email || parsedUser.username || 'No email';
	
	const initials = parsedUser.name || parsedUser.full_name
		? (parsedUser.name || parsedUser.full_name)
				.split(' ')
				.map((n) => n[0])
				.join('')
				.toUpperCase()
				.slice(0, 2)
		: (parsedUser.email?.slice(0, 2).toUpperCase() ?? '??');

	return (
		<aside className="glass-panel flex h-screen w-[88px] flex-col border-r px-3 py-4 md:w-[288px] md:px-4">
			<div className="mb-6 rounded-[1.75rem] border border-white/8 bg-white/5 p-3 md:p-4">
				<a href="/" className="flex items-center gap-3">
					<BrandMark className="h-12 w-12" iconClassName="h-6 w-6" />
					<div className="hidden md:block">
						<BrandLogo hideMark className="gap-0" subtitle="Visual Diagram Studio" subtitleClassName="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-slate-500" nameClassName="text-xl font-semibold tracking-tight text-white" />
					</div>
				</a>
			</div>

			<div className="flex-1 space-y-6 overflow-y-auto pr-1">
				<section>
					<div className="mb-3 hidden px-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 md:block">Platform</div>
					<div className="space-y-2">
						<NavLink href="/dashboard" active={pathname === '/dashboard'} icon={<SidebarIcon path="M4 6.75A1.75 1.75 0 0 1 5.75 5h3.5A1.75 1.75 0 0 1 11 6.75v3.5A1.75 1.75 0 0 1 9.25 12h-3.5A1.75 1.75 0 0 1 4 10.25zm9 0A1.75 1.75 0 0 1 14.75 5h3.5A1.75 1.75 0 0 1 20 6.75v3.5A1.75 1.75 0 0 1 18.25 12h-3.5A1.75 1.75 0 0 1 13 10.25zM4 15.75A1.75 1.75 0 0 1 5.75 14h12.5A1.75 1.75 0 0 1 20 15.75v2.5A1.75 1.75 0 0 1 18.25 20H5.75A1.75 1.75 0 0 1 4 18.25z" />}>Dashboard</NavLink>
						<NavLink href="/team" active={pathname.startsWith('/team')} icon={<SidebarIcon path="M16 21v-1.5A3.5 3.5 0 0 0 12.5 16h-5A3.5 3.5 0 0 0 4 19.5V21m15-8.5a2.5 2.5 0 1 0-5 0 2.5 2.5 0 0 0 5 0ZM12 8.5a3.5 3.5 0 1 0-7 0 3.5 3.5 0 0 0 7 0Z" />}>Team Members</NavLink>
						<NavLink href="/settings" active={pathname.startsWith('/settings')} icon={<SidebarIcon path="M12 3v2.25m0 13.5V21m8.25-9H18m-12 0H3.75m13.16-5.41-1.6 1.59M8.69 15.31l-1.6 1.6m9.82 0-1.6-1.6m-6.62-6.62-1.6-1.59M15.5 12A3.5 3.5 0 1 1 12 8.5 3.5 3.5 0 0 1 15.5 12Z" />}>Settings</NavLink>
						{parsedUser?.role === 'admin' && (
							<NavLink href="/admin" active={pathname.startsWith('/admin')} icon={<SidebarIcon path="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />}>Admin Panel</NavLink>
						)}
					</div>
				</section>

				<section>
					<div className="mb-3 flex items-center justify-between px-2">
						<span className="hidden text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500 md:block">Workspaces</span>
						<a href="/dashboard" className="rounded-full border border-white/8 bg-white/5 px-2 py-1 text-xs text-slate-300 hover:border-white/14 hover:bg-white/10 hover:text-white" aria-label="Create Workspace">+</a>
					</div>
					<div className="space-y-2">
						{workspaces.length === 0 ? (
							<div className="hidden rounded-2xl border border-dashed border-white/10 bg-white/4 px-4 py-5 text-sm text-slate-500 md:block">
								No workspaces yet. Create your first collaborative space from the dashboard.
							</div>
						) : (
							workspaces.map((ws, i) => {
								const active = pathname === `/workspace/${ws.id}`;
								return (
									<a
										key={ws.id}
										href={`/workspace/${ws.id}`}
										className={`group flex items-center justify-center gap-3 rounded-2xl border px-3 py-3 transition duration-200 md:justify-start ${
											active
												? 'border-white/10 bg-white/10 shadow-[0_14px_30px_rgba(15,23,42,0.24)]'
												: 'border-transparent bg-transparent hover:-translate-y-0.5 hover:border-white/8 hover:bg-white/6'
										}`}
									>
										<span className="h-10 w-1 rounded-full" style={{ background: active ? 'linear-gradient(180deg, #818cf8, #38bdf8)' : 'transparent' }}></span>
										<span className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]" style={{ background: `linear-gradient(135deg, ${workspaceAccents[i % workspaceAccents.length]}33, rgba(15,23,42,0.88))` }}>
											{ws.name?.slice(0, 1)?.toUpperCase() ?? 'W'}
										</span>
										<span className="hidden min-w-0 flex-1 md:block">
											<span className={`block truncate text-sm font-medium ${active ? 'text-white' : 'text-slate-200 group-hover:text-white'}`}>{ws.name}</span>
											<span className="block truncate text-xs text-slate-500">Collaborative workspace</span>
										</span>
									</a>
								);
							})
						)}
					</div>
				</section>
			</div>

			<div className="relative mt-6 border-t border-white/8 pt-4">
				<button className="flex w-full items-center justify-center gap-3 rounded-[1.35rem] border border-white/8 bg-white/5 p-3 text-left hover:border-white/14 hover:bg-white/10 md:justify-start" onClick={(e) => { e.stopPropagation(); setShowUserMenu((v) => !v); }}>
					<Avatar size="md" initials={initials} />
					<div className="hidden min-w-0 flex-1 md:block">
						<div className="truncate text-sm font-semibold text-white">{displayName}</div>
						<div className="truncate text-xs text-slate-500">{displayEmail}</div>
					</div>
					<svg className={`hidden h-4 w-4 text-slate-500 transition-transform md:block ${showUserMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m6 9 6 6 6-6" />
					</svg>
				</button>
				{showUserMenu ? (
					<div className="glass-panel absolute bottom-full left-0 z-50 mb-3 w-full rounded-[1.35rem] p-2" onClick={(e) => e.stopPropagation()}>
						<Link href="/settings" className="block rounded-xl px-4 py-3 text-sm text-slate-200 hover:bg-white/8 hover:text-white" onClick={() => setShowUserMenu(false)}>Account settings</Link>
						<button className="mt-1 block w-full rounded-xl px-4 py-3 text-left text-sm text-red-200 hover:bg-red-500/10 hover:text-red-100" onClick={handleLogout}>Sign out</button>
					</div>
				) : null}
			</div>
		</aside>
	);
}

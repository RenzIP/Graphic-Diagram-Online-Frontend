'use client';

import { useStore } from '../../hooks/useStore.js';
import { collaborationStore } from '../../lib/stores/collaboration.js';

export default function PresenceBar() {
	const collab = useStore(collaborationStore);
	
	if (!collab.connected || collab.users.length === 0) return null;

	return (
		<div className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-3 py-2 xl:flex">
			<span className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{collab.users.length} online</span>
			<div className="flex -space-x-2 overflow-hidden">
				{collab.users.slice(0, 5).map((user) => (
					<div
						key={user.id}
						className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 text-[10px] font-bold text-white shadow-sm ring-1 ring-white/10"
						style={{ backgroundColor: user.color }}
						title={user.name || user.id}
					>
						{(user.name || user.id).substring(0, 1).toUpperCase()}
					</div>
				))}
				{collab.users.length > 5 && (
					<div className="inline-flex h-7 w-7 items-center justify-center rounded-full border-2 border-slate-900 bg-slate-800 text-[10px] font-medium text-slate-300">
						+{collab.users.length - 5}
					</div>
				)}
			</div>
		</div>
	);
}

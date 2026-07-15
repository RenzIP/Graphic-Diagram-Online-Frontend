'use client';

import { useStore } from '../../hooks/useStore.js';
import { collaborationStore } from '../../lib/stores/collaboration.js';

// Visual states for the realtime collaboration socket. `idle` means the
// document isn't a collaborative (server-backed) one, so we render nothing.
const CONFIG = {
	connecting: { label: 'Connecting', dot: 'bg-amber-400', text: 'text-amber-300', pulse: true },
	connected: { label: 'Live', dot: 'bg-emerald-400', text: 'text-emerald-300', pulse: false },
	reconnecting: { label: 'Reconnecting', dot: 'bg-amber-400', text: 'text-amber-300', pulse: true },
	error: { label: 'Offline', dot: 'bg-rose-500', text: 'text-rose-300', pulse: false }
};

export default function ConnectionStatus() {
	const collab = useStore(collaborationStore);
	const config = CONFIG[collab.status];
	if (!config) return null;

	return (
		<div
			className="hidden items-center gap-2 rounded-2xl border border-white/8 bg-white/5 px-3 py-2 md:flex"
			title={`Realtime collaboration: ${config.label}`}
		>
			<span className={`relative inline-flex h-2 w-2 rounded-full ${config.dot}`}>
				{config.pulse ? <span className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-75 ${config.dot}`} /> : null}
			</span>
			<span className={`text-xs font-semibold uppercase tracking-[0.12em] ${config.text}`}>{config.label}</span>
		</div>
	);
}

'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { documentsApi } from '../../lib/api/documents.js';
import { documentStore } from '../../lib/stores/document.js';
import Button from '../ui/Button.js';

export default function VersionHistory({ visible, onClose }) {
	const params = useParams();
	const id = params.id;

	const [versions, setVersions] = useState([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const [restoring, setRestoring] = useState(false);

	useEffect(() => {
		if (!visible || !id || id === 'demo' || id.startsWith('local-')) return;

		let isMounted = true;
		setLoading(true);

		documentsApi.listVersions(id)
			.then((res) => {
				if (isMounted) {
					setVersions(res.data?.data || []);
					setError(null);
				}
			})
			.catch((err) => {
				if (isMounted) setError(err.response?.data?.message || 'Failed to load version history');
			})
			.finally(() => {
				if (isMounted) setLoading(false);
			});

		return () => { isMounted = false; };
	}, [visible, id]);

	const handleRestore = async (versionNum) => {
		if (!confirm(`Are you sure you want to restore to version ${versionNum}? Current unsaved changes might be lost.`)) {
			return;
		}

		setRestoring(true);
		try {
			const res = await documentsApi.restoreVersion(id, versionNum);
			const restoredDoc = res.data?.data;
			if (restoredDoc) {
				// replaceDocument swaps state, resets history, and broadcasts the
				// whole doc to collaborators via replace_document.
				documentStore.replaceDocument({ nodes: restoredDoc.content.nodes || [], edges: restoredDoc.content.edges || [] });
				window.__gradiol_toast?.(`Restored to version ${versionNum}`, 'success');
				onClose();
			}
		} catch (err) {
			window.__gradiol_toast?.(err.response?.data?.message || 'Failed to restore version', 'error');
		} finally {
			setRestoring(false);
		}
	};

	if (!visible) return null;

	return (
		<div className="version-history-panel absolute top-0 right-0 z-30 flex h-full w-96 flex-col border-l">
			<div className="flex items-center justify-between border-b border-white/8 p-5">
				<div>
					<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">History</p>
					<h3 className="mt-2 text-lg font-semibold text-white">Version History</h3>
				</div>
				<button onClick={onClose} className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white" aria-label="Close">
					Close
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-5">
				{id === 'demo' || id?.startsWith('local-') ? (
					<div className="rounded-2xl border border-indigo-400/18 bg-indigo-500/10 p-4 text-sm leading-6 text-indigo-100">
						Version history is only available for cloud-saved documents. Please login and save to cloud.
					</div>
				) : loading ? (
					<div className="space-y-3 py-2">
						{Array.from({ length: 3 }).map((_, idx) => (
							<div key={idx} className="surface-panel rounded-[1.35rem] p-4">
								<div className="skeleton mb-3 h-5 w-1/3 rounded-full"></div>
								<div className="skeleton h-4 w-2/3 rounded-full"></div>
							</div>
						))}
					</div>
				) : error ? (
					<div className="rounded-2xl border border-red-400/18 bg-red-500/10 p-4 text-sm text-red-100">{error}</div>
				) : versions.length === 0 ? (
					<div className="empty-state min-h-[240px]">
						<p className="text-sm leading-6 text-slate-500">No previous versions found.</p>
					</div>
				) : (
					<div className="flex flex-col gap-4">
						{versions.map((ver) => {
							const date = new Date(ver.created_at);
							return (
								<div key={ver.id} className="surface-panel rounded-[1.35rem] p-4">
									<div className="flex items-center justify-between gap-3">
										<span className="text-sm font-semibold text-white">Version {ver.version}</span>
										<span className="text-xs text-slate-500">{date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
									</div>
									<div className="mt-3 text-xs text-slate-500">
										Nodes: {ver.content?.nodes?.length || 0} | Edges: {ver.content?.edges?.length || 0}
									</div>
									<Button variant="secondary" size="sm" className="mt-4 w-full" onClick={() => handleRestore(ver.version)} disabled={restoring}>
										Restore this version
									</Button>
								</div>
							);
						})}
					</div>
				)}
			</div>
		</div>
	);
}

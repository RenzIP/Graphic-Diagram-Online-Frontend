'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { documentsApi } from '../../lib/api/documents.js';
import { documentStore } from '../../lib/stores/document.js';
import Button from '../ui/Button.js';
import { wsClient } from '../../lib/ws/client.js';

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
			.then(res => {
				if (isMounted) {
					setVersions(res.data?.data || []);
					setError(null);
				}
			})
			.catch(err => {
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
				// We update local state directly
				documentStore.set({ nodes: restoredDoc.content.nodes || [], edges: restoredDoc.content.edges || [] });
				window.__gradiol_toast?.(`Restored to version ${versionNum}`, 'success');
				// Broadcast to other collaborators
				wsClient.send({ type: 'room_state', state: documentStore.get() });
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
		<div className="absolute top-0 right-0 z-30 flex h-full w-80 flex-col border-l border-slate-800 bg-slate-900 shadow-xl transition-transform duration-300">
			<div className="flex items-center justify-between border-b border-slate-800 p-4">
				<h3 className="font-semibold text-white">Version History</h3>
				<button 
					onClick={onClose}
					className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
					aria-label="Close"
				>
					✕
				</button>
			</div>

			<div className="flex-1 overflow-y-auto p-4">
				{id === 'demo' || id?.startsWith('local-') ? (
					<div className="rounded-md bg-indigo-500/10 p-4 text-sm text-indigo-200">
						Version history is only available for cloud-saved documents. Please login and save to cloud.
					</div>
				) : loading ? (
					<div className="py-8 text-center text-sm text-slate-500">Loading history...</div>
				) : error ? (
					<div className="rounded-md bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
				) : versions.length === 0 ? (
					<div className="py-8 text-center text-sm text-slate-500">No previous versions found.</div>
				) : (
					<div className="flex flex-col gap-4">
						{versions.map((ver, idx) => {
							const date = new Date(ver.created_at);
							return (
								<div key={ver.id} className="flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-800/50 p-4 transition-colors hover:border-slate-600">
									<div className="flex items-center justify-between">
										<span className="font-medium text-slate-200">Version {ver.version}</span>
										<span className="text-xs text-slate-400">
											{date.toLocaleDateString()} {date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
										</span>
									</div>
									<div className="text-xs text-slate-500">
										Nodes: {ver.content?.nodes?.length || 0} | Edges: {ver.content?.edges?.length || 0}
									</div>
									<Button 
										variant="secondary" 
										size="sm" 
										className="mt-2 w-full"
										onClick={() => handleRestore(ver.version)}
										disabled={restoring}
									>
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

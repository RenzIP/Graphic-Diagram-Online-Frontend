'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';
import { serializeToText } from '../../lib/dsl/serializer.js';
import { mergeDSL, computeSyncStatus } from '../../lib/dsl/merger.js';

const SYNC_DEBOUNCE_MS = 400;
const AUTO_APPLY_DEBOUNCE_MS = 800;

export default function DslEditor({ diagramType = 'flowchart', title = 'Untitled', visible = false, onToggle }) {
	const document = useStore(documentStore);
	const [dslText, setDslText] = useState('');
	const [syncStatus, setSyncStatus] = useState('synced'); // 'synced' | 'modified' | 'error'
	const [parseError, setParseError] = useState(null);
	const [autoApply, setAutoApply] = useState(false);
	const [panelHeight, setPanelHeight] = useState(250);

	// Refs for tracking who initiated the change (visual vs text)
	const isTextEditing = useRef(false);
	const syncTimer = useRef(null);
	const autoApplyTimer = useRef(null);
	const lastSerializedRef = useRef('');

	// --- Visual → DSL sync (debounced) ---
	// When the visual editor changes state, re-serialize to DSL text
	useEffect(() => {
		// Skip if the user is actively typing in the DSL editor
		if (isTextEditing.current) return;

		if (syncTimer.current) clearTimeout(syncTimer.current);
		syncTimer.current = setTimeout(() => {
			const serialized = serializeToText(document, diagramType, title);
			lastSerializedRef.current = serialized;
			setDslText(serialized);
			setSyncStatus('synced');
			setParseError(null);
		}, SYNC_DEBOUNCE_MS);

		return () => {
			if (syncTimer.current) clearTimeout(syncTimer.current);
		};
	}, [document, diagramType, title]);

	// --- DSL text change handler ---
	const handleTextChange = useCallback((e) => {
		const newText = e.target.value;
		isTextEditing.current = true;
		setDslText(newText);

		// Compute sync status
		const status = computeSyncStatus(newText, lastSerializedRef.current);
		setSyncStatus(status);
		setParseError(null);

		// Schedule auto-apply if enabled
		if (autoApply) {
			if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
			autoApplyTimer.current = setTimeout(() => {
				applyDSLInternal(newText);
			}, AUTO_APPLY_DEBOUNCE_MS);
		}

		// Reset text-editing flag after a short delay so visual sync can resume
		setTimeout(() => {
			isTextEditing.current = false;
		}, SYNC_DEBOUNCE_MS + 100);
	}, [autoApply]); // eslint-disable-line react-hooks/exhaustive-deps

	// --- Apply DSL (merge-based) ---
	function applyDSLInternal(text) {
		try {
			const currentState = documentStore.get();
			const merged = mergeDSL(text, currentState);
			documentStore.set(merged);
			setSyncStatus('synced');
			setParseError(null);

			// Update the reference so status shows as synced
			const reSerialized = serializeToText(merged, diagramType, title);
			lastSerializedRef.current = reSerialized;
		} catch (e) {
			setSyncStatus('error');
			setParseError(e.message);
			window.__gradiol_toast?.(`DSL parse error: ${e.message}`, 'error');
		}
	}

	function handleApply() {
		isTextEditing.current = false;
		applyDSLInternal(dslText);
	}

	// Cleanup timers
	useEffect(() => {
		return () => {
			if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
		};
	}, []);

	// --- Resize handle ---
	function handleResizeStart(e) {
		e.preventDefault();
		const startY = e.clientY;
		const startHeight = panelHeight;
		function onMove(ev) {
			setPanelHeight(Math.max(120, Math.min(500, startHeight - (ev.clientY - startY))));
		}
		function onUp() {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
	}

	if (!visible) return null;

	const statusConfig = {
		synced: { color: 'bg-emerald-400', label: 'Synced' },
		modified: { color: 'bg-amber-400', label: 'Modified' },
		error: { color: 'bg-red-400', label: 'Error' },
	};
	const status = statusConfig[syncStatus] || statusConfig.synced;

	return (
		<div className="flex flex-col border-t border-slate-800 bg-slate-900" style={{ height: panelHeight }}>
			{/* Resize handle */}
			<div className="flex h-1.5 cursor-ns-resize items-center justify-center bg-slate-800 hover:bg-indigo-500/30" onMouseDown={handleResizeStart}>
				<div className="h-0.5 w-8 rounded-full bg-slate-600"></div>
			</div>

			{/* Header */}
			<div className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">DSL Editor</span>
					{/* Sync status indicator */}
					<div className="flex items-center gap-1.5">
						<span className={`inline-block h-2 w-2 rounded-full ${status.color}`}></span>
						<span className="text-[10px] font-medium text-slate-500">{status.label}</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{/* Auto-apply toggle */}
					<button
						className={`rounded px-2 py-1 text-[10px] font-medium transition-colors ${
							autoApply
								? 'bg-emerald-500/15 text-emerald-400'
								: 'bg-slate-800 text-slate-500 hover:text-slate-300'
						}`}
						onClick={() => setAutoApply((v) => !v)}
						title="Auto-apply DSL changes as you type"
					>
						Auto
					</button>
					{/* Apply button */}
					<button
						className="rounded bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400 transition-colors hover:bg-indigo-500/20 disabled:opacity-40"
						onClick={handleApply}
						disabled={syncStatus === 'synced'}
					>
						Apply
					</button>
					{/* Close button */}
					<button className="rounded p-1 text-slate-500 transition-colors hover:text-white" onClick={onToggle}>×</button>
				</div>
			</div>

			{/* Parse error banner */}
			{parseError ? (
				<div className="border-b border-red-500/20 bg-red-500/10 px-4 py-1.5 text-xs text-red-400">
					⚠ {parseError}
				</div>
			) : null}

			{/* Editor */}
			<textarea
				value={dslText}
				onChange={handleTextChange}
				className="flex-1 resize-none bg-slate-950 p-4 font-mono text-sm text-slate-300 placeholder-slate-600 focus:outline-none"
				placeholder={`@${diagramType} "${title}"\n\nstart "Begin"\nprocess "Step 1"\nend "Finish"\n\n"Begin" -> "Step 1"\n"Step 1" -> "Finish"`}
				spellCheck="false"
			/>
		</div>
	);
}


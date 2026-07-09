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
	const [syncStatus, setSyncStatus] = useState('synced');
	const [parseError, setParseError] = useState(null);
	const [autoApply, setAutoApply] = useState(false);
	const [panelHeight, setPanelHeight] = useState(250);

	const isTextEditing = useRef(false);
	const syncTimer = useRef(null);
	const autoApplyTimer = useRef(null);
	const lastSerializedRef = useRef('');

	useEffect(() => {
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

	const handleTextChange = useCallback((e) => {
		const newText = e.target.value;
		isTextEditing.current = true;
		setDslText(newText);
		const status = computeSyncStatus(newText, lastSerializedRef.current);
		setSyncStatus(status);
		setParseError(null);

		if (autoApply) {
			if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
			autoApplyTimer.current = setTimeout(() => {
				applyDSLInternal(newText);
			}, AUTO_APPLY_DEBOUNCE_MS);
		}

		setTimeout(() => {
			isTextEditing.current = false;
		}, SYNC_DEBOUNCE_MS + 100);
	}, [autoApply]); // eslint-disable-line react-hooks/exhaustive-deps

	function applyDSLInternal(text) {
		try {
			const currentState = documentStore.get();
			const merged = mergeDSL(text, currentState);
			documentStore.set(merged);
			setSyncStatus('synced');
			setParseError(null);
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

	useEffect(() => {
		return () => {
			if (autoApplyTimer.current) clearTimeout(autoApplyTimer.current);
		};
	}, []);

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
		error: { color: 'bg-red-400', label: 'Error' }
	};
	const status = statusConfig[syncStatus] || statusConfig.synced;

	return (
		<div className="editor-dsl-panel flex flex-col border-t" style={{ height: panelHeight }}>
			<div className="flex h-2 cursor-ns-resize items-center justify-center bg-white/6 hover:bg-indigo-500/25" onMouseDown={handleResizeStart}>
				<div className="h-1 w-12 rounded-full bg-slate-500"></div>
			</div>

			<div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
				<div className="flex items-center gap-3">
					<span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">DSL Editor</span>
					<div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1">
						<span className={`inline-block h-2 w-2 rounded-full ${status.color}`}></span>
						<span className="text-[10px] font-medium uppercase tracking-[0.12em] text-slate-400">{status.label}</span>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button className={`rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] ${autoApply ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/6 text-slate-500 hover:text-slate-300'}`} onClick={() => setAutoApply((v) => !v)} title="Auto-apply DSL changes as you type">
						Auto apply
					</button>
					<button className="rounded-xl border border-indigo-400/20 bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-200 hover:bg-indigo-500/16 disabled:opacity-40" onClick={handleApply} disabled={syncStatus === 'synced'}>
						Apply
					</button>
					<button className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white" onClick={onToggle}>Close</button>
				</div>
			</div>

			{parseError ? (
				<div className="border-b border-red-400/18 bg-red-500/10 px-4 py-2 text-xs text-red-100">
					Parse error: {parseError}
				</div>
			) : null}

			<textarea
				value={dslText}
				onChange={handleTextChange}
				className="flex-1 resize-none bg-[#09101d] p-4 font-mono text-sm text-slate-200 placeholder-slate-600 focus:outline-none"
				placeholder={`@${diagramType} "${title}"\n\nstart "Begin"\nprocess "Step 1"\nend "Finish"\n\n"Begin" -> "Step 1"\n"Step 1" -> "Finish"`}
				spellCheck="false"
			/>
		</div>
	);
}

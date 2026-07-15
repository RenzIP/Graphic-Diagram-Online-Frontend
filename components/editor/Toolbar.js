'use client';

import { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';
import Button from '../ui/Button.js';
import Modal from '../ui/Modal.js';
import AsciiImportModal from './AsciiImportModal.js';
import ImportModal from './ImportModal.js';
import PresenceBar from '../collaboration/PresenceBar.js';
import ConnectionStatus from '../collaboration/ConnectionStatus.js';
import { canvasStore } from '../../lib/stores/canvas.js';
import { documentStore } from '../../lib/stores/document.js';
import { historyStore } from '../../lib/stores/history.js';
import { selectionStore } from '../../lib/stores/selection.js';
import { exportDSL, exportJPG, exportJSON, exportPNG, exportSVG, exportWebP } from '../../lib/utils/export.js';
import { serializeToText } from '../../lib/dsl/serializer.js';
import { alignNodes } from '../../lib/utils/layout.js';

function Icon({ path, className = 'h-4 w-4' }) {
	return (
		<svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.9">
			<path strokeLinecap="round" strokeLinejoin="round" d={path} />
		</svg>
	);
}

function IconButton({ title, onClick, disabled = false, children, className = '' }) {
	return (
		<button
			className={`rounded-xl border border-transparent bg-transparent p-2 text-slate-400 hover:border-white/8 hover:bg-white/8 hover:text-white disabled:pointer-events-none disabled:opacity-30 ${className}`}
			onClick={onClick}
			disabled={disabled}
			title={title}
		>
			{children}
		</button>
	);
}

export default function Toolbar({ title = 'Untitled', diagramType = 'flowchart', onTitleChange, svgRef, isDirty = false, isSaving = false, lastSavedAt = null, backHref = '/dashboard', onToggleVersionHistory }) {
	const canvas = useStore(canvasStore);
	const history = useStore(historyStore);
	const selection = useStore(selectionStore);
	const [editingTitle, setEditingTitle] = useState(false);
	const [titleInput, setTitleInput] = useState(title);
	const [showExportModal, setShowExportModal] = useState(false);
	const [showImportModal, setShowImportModal] = useState(false);
	const [showAsciiModal, setShowAsciiModal] = useState(false);
	const canAlign = selection.nodes.length >= 2;

	function handleUndo() {
		const state = historyStore.undo(documentStore.get());
		if (state) documentStore.set(state);
	}

	function handleRedo() {
		const state = historyStore.redo(documentStore.get());
		if (state) documentStore.set(state);
	}

	function handleSave() {
		window.dispatchEvent(new KeyboardEvent('keydown', { key: 's', ctrlKey: true }));
	}

	function handleAlign(type) {
		const currentNodes = documentStore.get().nodes.filter((n) => selection.nodes.includes(n.id));
		alignNodes(currentNodes, type).forEach((n) => documentStore.updateNode(n.id, { position: n.position }));
	}

	function handleTitleSave() {
		setEditingTitle(false);
		onTitleChange?.(titleInput);
	}

	function handleExport(format) {
		const state = documentStore.get();
		const fileTitle = titleInput || title;
		if (format === 'png' && svgRef) exportPNG(svgRef, state, `${fileTitle}.png`);
		if (format === 'jpg' && svgRef) exportJPG(svgRef, state, `${fileTitle}.jpg`);
		if (format === 'webp' && svgRef) exportWebP(svgRef, state, `${fileTitle}.webp`);
		if (format === 'svg' && svgRef) exportSVG(svgRef, state, `${fileTitle}.svg`);
		if (format === 'json') exportJSON(state, `${fileTitle}.json`);
		if (format === 'dsl') exportDSL(serializeToText(state, diagramType, fileTitle), `${fileTitle}.dsl`);
		setShowExportModal(false);
	}

	return (
		<div className="editor-toolbar-shell flex min-h-[72px] items-center justify-between gap-4 border-b px-5 py-3">
			<div className="flex min-w-0 items-center gap-3">
				<a href={backHref} className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/8 bg-white/6 text-slate-300 hover:border-white/12 hover:bg-white/10 hover:text-white" aria-label="Back to Dashboard">
					<Icon path="M15 19 8 12l7-7" />
				</a>
				<div className="min-w-0">
					<div className="flex items-center gap-3">
						{editingTitle ? (
							<input type="text" value={titleInput} onChange={(e) => setTitleInput(e.target.value)} onBlur={handleTitleSave} onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); }} className="field-sm min-w-[220px]" autoFocus />
						) : (
							<button className="rounded-xl px-2 py-1 text-left text-lg font-semibold tracking-tight text-white hover:bg-white/6" onClick={() => { setEditingTitle(true); setTitleInput(title); }}>{title}</button>
						)}
						<span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-slate-400">{diagramType}</span>
						{isSaving ? <span className="text-xs font-medium text-slate-500">Saving...</span> : isDirty ? <span className="text-xs font-semibold text-amber-300" title="Unsaved changes">Unsaved changes</span> : lastSavedAt ? <span className="text-xs text-slate-500" title={`Saved at ${lastSavedAt}`}>Saved</span> : null}
					</div>
					<div className="mt-1 text-xs text-slate-500">Canvas controls, import/export, and collaboration stay available without interrupting the editing flow.</div>
				</div>
			</div>

			<div className="hidden items-center gap-2 xl:flex">
				<div className="flex items-center gap-1 rounded-2xl border border-white/8 bg-white/5 p-1.5">
					<IconButton title="Undo (Ctrl+Z)" onClick={handleUndo} disabled={!history.canUndo}><Icon path="M9 10H5m0 0 3-3m-3 3 3 3m1 7a8 8 0 1 0 0-16h-1" /></IconButton>
					<IconButton title="Redo (Ctrl+Shift+Z)" onClick={handleRedo} disabled={!history.canRedo}><Icon path="M15 10h4m0 0-3-3m3 3-3 3m-1 7a8 8 0 1 1 0-16h1" /></IconButton>
				</div>

				<div className={`flex items-center gap-1 rounded-2xl border border-white/8 bg-white/5 p-1.5 ${!canAlign ? 'pointer-events-none opacity-35' : ''}`}>
					<IconButton title="Align Left" onClick={() => handleAlign('left')}><Icon path="M5 5v14M9 7h10M9 12h7M9 17h10" /></IconButton>
					<IconButton title="Align Center" onClick={() => handleAlign('center')}><Icon path="M12 5v14M6 7h12M8 12h8M6 17h12" /></IconButton>
					<IconButton title="Align Right" onClick={() => handleAlign('right')}><Icon path="M19 5v14M5 7h10M8 12h7M5 17h10" /></IconButton>
				</div>

				<div className="flex items-center gap-1 rounded-2xl border border-white/8 bg-white/5 p-1.5">
					<IconButton title="Zoom Out" onClick={() => canvasStore.setZoom(Math.max(canvas.k - 0.25, 0.1))}><Icon path="M6 12h12" /></IconButton>
					<button className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-white/8" onClick={() => canvasStore.setZoom(1)}>{Math.round(canvas.k * 100)}%</button>
					<IconButton title="Zoom In" onClick={() => canvasStore.setZoom(Math.min(canvas.k + 0.25, 4))}><Icon path="M12 6v12M6 12h12" /></IconButton>
				</div>
			</div>

			<div className="flex items-center gap-3">
				<ConnectionStatus />
				<PresenceBar />
				<div className="hidden items-center gap-1 rounded-2xl border border-white/8 bg-white/5 p-1.5 lg:flex">
					<IconButton title="Import ASCII Diagram" onClick={() => setShowAsciiModal(true)}><Icon path="M4 7h16M7 12h10M9 17h6" /></IconButton>
					<IconButton title="Import Diagram" onClick={() => setShowImportModal(true)}><Icon path="M12 16V4m0 0-4 4m4-4 4 4M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" /></IconButton>
					<IconButton title="Export Diagram" onClick={() => setShowExportModal(true)}><Icon path="M12 4v12m0 0-4-4m4 4 4-4M4 16v1a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-1" /></IconButton>
					<IconButton title="Version History" onClick={onToggleVersionHistory}><Icon path="M12 8v5l3 2m6-3a9 9 0 1 1-9-9" /></IconButton>
				</div>
				<Button variant="primary" size="sm" onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
			</div>

			<Modal open={showExportModal} title="Export Diagram" onClose={() => setShowExportModal(false)} size="md">
				<div className="grid grid-cols-2 gap-3 p-6">
					{['png', 'jpg', 'webp', 'svg', 'json', 'dsl'].map((format) => (
						<button key={format} className="rounded-[1.35rem] border border-white/8 bg-white/5 p-4 text-left hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/10" onClick={() => handleExport(format)}>
							<div className="text-sm font-semibold text-white">{format === 'dsl' ? 'DSL Text' : format.toUpperCase()}</div>
							<div className="mt-1 text-xs text-slate-500">Optimized export preset</div>
						</button>
					))}
				</div>
			</Modal>

			<ImportModal open={showImportModal} onClose={() => setShowImportModal(false)} />
			<AsciiImportModal open={showAsciiModal} onClose={() => setShowAsciiModal(false)} />
		</div>
	);
}

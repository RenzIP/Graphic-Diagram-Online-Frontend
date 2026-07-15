'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Canvas from '../../../../components/canvas/Canvas.js';
import Minimap from '../../../../components/canvas/Minimap.js';
import EdgeHandleRenderer from '../../../../components/edges/EdgeHandleRenderer.js';
import EdgeRenderer from '../../../../components/edges/EdgeRenderer.js';
import DslEditor from '../../../../components/editor/DslEditor.js';
import FloatingToolbar from '../../../../components/editor/FloatingToolbar.js';
import PropertyPanel from '../../../../components/editor/PropertyPanel.js';
import EditorSidebar from '../../../../components/editor/Sidebar.js';
import Toolbar from '../../../../components/editor/Toolbar.js';
import NodeRenderer from '../../../../components/nodes/NodeRenderer.js';
import VersionHistory from '../../../../components/editor/VersionHistory.js';
import { DIAGRAM_TEMPLATES } from '../../../../lib/utils/templates.js';
import { documentStore } from '../../../../lib/stores/document.js';
import { historyStore } from '../../../../lib/stores/history.js';
import { selectionStore } from '../../../../lib/stores/selection.js';
import { getPreferences } from '../../../../lib/stores/preferences.js';
import { wsClient } from '../../../../lib/ws/client.js';

function EditorPageContent() {
	const params = useParams();
	const searchParams = useSearchParams();
	const id = params.id;
	const [diagramTitle, setDiagramTitle] = useState('Untitled Diagram');
	const [diagramType, setDiagramType] = useState('flowchart');
	const [showDslEditor, setShowDslEditor] = useState(false);
	const [isLeftSidebarOpen] = useState(true);
	const [isRightSidebarOpen] = useState(true);
	const [svgRef, setSvgRef] = useState(null);
	const [isDirty, setIsDirty] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [lastSavedAt, setLastSavedAt] = useState(null);
	const [isApiDocument, setIsApiDocument] = useState(false);
	const [showVersionHistory, setShowVersionHistory] = useState(false);
	const initializedRef = useRef(false);
	const autosaveTimer = useRef(null);

	const saveContext = useRef({ diagramTitle, isApiDocument, isSaving });
	useEffect(() => {
		saveContext.current = { diagramTitle, isApiDocument, isSaving };
	}, [diagramTitle, isApiDocument, isSaving]);

	const performSave = useCallback(async (docId) => {
		const ctx = saveContext.current;
		if (ctx.isSaving) return;
		if (!ctx.isApiDocument) {
			setIsDirty(false);
			return;
		}
		setIsSaving(true);
		try {
			await documentStore.save(docId, ctx.diagramTitle);
			setIsDirty(false);
			setLastSavedAt(new Date().toLocaleTimeString());
		} catch (err) {
			console.error('[Editor] Autosave failed:', err);
		} finally {
			setIsSaving(false);
		}
	}, []);

	const scheduleAutosave = useCallback((docId) => {
		// Respect the user's Auto Save preference. Manual save (Ctrl+S) is unaffected.
		if (!getPreferences().autoSave) return;
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		autosaveTimer.current = setTimeout(() => performSave(docId), 3000);
	}, [performSave]);

	useEffect(() => {
		const type = searchParams.get('type') || 'flowchart';
		setDiagramType(type);
		if (!id) return;
		initializedRef.current = false;

		const initLocalDocument = () => {
			const localKey = `diagram-${id}`;
			const localData = localStorage.getItem(localKey);
			if (localData) {
				try {
					documentStore.set(JSON.parse(localData));
					initializedRef.current = true;
					setIsDirty(false);
					return;
				} catch (e) {
					console.error('Failed to parse local data', e);
				}
			}
			if (DIAGRAM_TEMPLATES[type]) documentStore.set(JSON.parse(JSON.stringify(DIAGRAM_TEMPLATES[type])));
			initializedRef.current = true;
			setIsDirty(false);
		};

		if (id === 'demo' || id.startsWith('local-')) {
			initLocalDocument();
			return;
		}

		documentStore.load(id).then((doc) => {
			if (doc) {
				setIsApiDocument(true);
				if (doc.title) setDiagramTitle(doc.title);
				if (doc.diagram_type) setDiagramType(doc.diagram_type);
				initializedRef.current = true;
				setIsDirty(false);
				wsClient.connect(id);
				return;
			}
			initLocalDocument();
		});
	}, [id, searchParams]);

	useEffect(() => {
		if (!id) return undefined;
		return documentStore.subscribe((state) => {
			if (!initializedRef.current) return;
			localStorage.setItem(`diagram-${id}`, JSON.stringify(state));
			setIsDirty(true);
			scheduleAutosave(id);
		});
	}, [id, scheduleAutosave]);

	useEffect(() => () => {
		if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
		wsClient.disconnect();
	}, []);

	useEffect(() => {
		function handleBeforeUnload(e) {
			if (isDirty) e.preventDefault();
		}
		function handleKeyDown(e) {
			const isCtrl = e.ctrlKey || e.metaKey;
			const key = e.key.toLowerCase();
			if (isCtrl && key === 'z') {
				e.preventDefault();
				const state = e.shiftKey ? historyStore.redo(documentStore.get()) : historyStore.undo(documentStore.get());
				if (state) documentStore.set(state);
			}
			if (isCtrl && key === 'y') {
				e.preventDefault();
				const state = historyStore.redo(documentStore.get());
				if (state) documentStore.set(state);
			}
			if (isCtrl && key === 's') {
				e.preventDefault();
				performSave(id).then(() => window.__gradiol_toast?.('Document saved', 'success')).catch(() => window.__gradiol_toast?.('Failed to save', 'error'));
			}
			if ((key === 'delete' || key === 'backspace') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
				const selection = selectionStore.get();
				selection.nodes.forEach((nodeId) => documentStore.removeNode(nodeId));
				selection.edges.forEach((edgeId) => documentStore.removeEdge(edgeId));
				selectionStore.clear();
			}
			if (isCtrl && key === 'd') {
				e.preventDefault();
				setShowDslEditor((v) => !v);
			}
		}
		window.addEventListener('beforeunload', handleBeforeUnload);
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('beforeunload', handleBeforeUnload);
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [id, isDirty, performSave]);

	function handleTitleChange(newTitle) {
		setDiagramTitle(newTitle);
		setIsDirty(true);
		if (id) scheduleAutosave(id);
	}

	return (
		<div className="editor-surface flex h-screen w-screen flex-col overflow-hidden text-slate-200">
			<Toolbar title={diagramTitle} diagramType={diagramType} onTitleChange={handleTitleChange} svgRef={svgRef} isDirty={isDirty} isSaving={isSaving} lastSavedAt={lastSavedAt} backHref={id === 'demo' || id.startsWith('local-') ? '/dashboard' : '/dashboard'} onToggleVersionHistory={() => setShowVersionHistory(v => !v)} />
			<div className="relative flex flex-1 overflow-hidden">
				{isLeftSidebarOpen ? <EditorSidebar diagramType={diagramType} /> : null}
				<main className="relative flex flex-1 flex-col">
					<div className="relative flex-1">
						<Canvas onSvgRef={setSvgRef}>
							<EdgeRenderer />
							<NodeRenderer />
							<EdgeHandleRenderer />
						</Canvas>
						<FloatingToolbar />
						<Minimap />
						<VersionHistory visible={showVersionHistory} onClose={() => setShowVersionHistory(false)} />
						{!showDslEditor ? (
							<div className="absolute right-0 bottom-0 left-0 z-20">
								<button className="glass-panel flex w-full items-center justify-between rounded-t-[1.2rem] border-x border-t px-4 py-3 text-left hover:bg-white/8" onClick={() => setShowDslEditor(true)} aria-label="Open DSL Editor">
									<div className="flex items-center gap-3">
										<span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/6 text-sm text-slate-200">DSL</span>
										<span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Text-to-Diagram panel</span>
									</div>
									<span className="text-slate-500">Open</span>
								</button>
							</div>
						) : null}
					</div>
					<DslEditor diagramType={diagramType} title={diagramTitle} visible={showDslEditor} onToggle={() => setShowDslEditor((v) => !v)} />
				</main>
				{isRightSidebarOpen ? <PropertyPanel /> : null}
			</div>
		</div>
	);
}

export default function EditorPage() {
	return (
		<Suspense fallback={null}>
			<EditorPageContent />
		</Suspense>
	);
}

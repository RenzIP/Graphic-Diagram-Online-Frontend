'use client';

import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';
import { selectionStore } from '../../lib/stores/selection.js';

const colors = [
	{ key: 'slate', swatch: '#64748b' },
	{ key: 'red', swatch: '#ef4444' },
	{ key: 'green', swatch: '#22c55e' },
	{ key: 'amber', swatch: '#f59e0b' },
	{ key: 'indigo', swatch: '#6366f1' },
	{ key: 'cyan', swatch: '#38bdf8' },
	{ key: 'white', swatch: '#ffffff' }
];

export default function FloatingToolbar() {
	const selection = useStore(selectionStore);
	const document = useStore(documentStore);
	if (selection.nodes.length === 0) return null;
	const nodes = document.nodes.filter((node) => selection.nodes.includes(node.id));
	if (nodes.length === 0) return null;

	function updateColor(color) {
		selection.nodes.forEach((id) => documentStore.updateNode(id, { color }));
	}

	function duplicateNodes() {
		nodes.forEach((node) => documentStore.addNode({ ...node, id: crypto.randomUUID(), position: { x: node.position.x + 20, y: node.position.y + 20 } }));
	}

	function deleteNodes() {
		selection.nodes.forEach((id) => documentStore.removeNode(id));
		selectionStore.clear();
	}

	return (
		<div className="glass-panel absolute top-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-[1.4rem] px-4 py-3">
			<div className="flex items-center gap-2">
				{colors.map((color) => (
					<button key={color.key} className="h-6 w-6 rounded-full border border-white/16 shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] hover:scale-105" onClick={() => updateColor(color.key)} title={color.key} style={{ background: color.swatch }}></button>
				))}
			</div>
			<div className="h-6 w-px bg-white/8"></div>
			<button className="rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-white/10" onClick={duplicateNodes}>Duplicate</button>
			<button className="rounded-xl border border-red-400/18 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-100 hover:bg-red-500/16" onClick={deleteNodes}>Delete</button>
		</div>
	);
}

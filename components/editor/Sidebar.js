'use client';

import { useEffect, useMemo, useState } from 'react';
import { NODE_SHAPES } from '../../lib/utils/constants.js';
import { documentStore } from '../../lib/stores/document.js';
import { getShapePath } from '../../lib/utils/shapes.js';

const CATEGORY_NAMES = {
	general: 'General',
	flowchart: 'Flowchart',
	arrows: 'Arrows',
	uml: 'UML / Class / Sequence',
	erd: 'Entity Relation',
	bpmn: 'BPMN 2.0',
	network: 'Cloud / Network'
};

export default function EditorSidebar({ diagramType = 'flowchart' }) {
	const [searchQuery, setSearchQuery] = useState('');
	const [expanded, setExpanded] = useState({ tools: false, general: true, [diagramType]: true });
	const categories = useMemo(() => {
		const order = ['general', 'flowchart', 'arrows', 'uml', 'erd', 'bpmn', 'network'];
		const keys = Object.keys(NODE_SHAPES).filter((k) => k !== 'all' && k !== 'blank');
		const filtered = searchQuery ? keys.filter((k) => NODE_SHAPES[k].some((s) => s.label.toLowerCase().includes(searchQuery.toLowerCase()))) : keys;
		return filtered.sort((a, b) => (order.indexOf(a) === -1 ? 99 : order.indexOf(a)) - (order.indexOf(b) === -1 ? 99 : order.indexOf(b)));
	}, [searchQuery]);

	useEffect(() => {
		if (searchQuery) setExpanded((current) => Object.fromEntries([...Object.keys(current), ...categories].map((key) => [key, true])));
	}, [categories, searchQuery]);

	function addNode(type, label) {
		// Default sizes tuned per shape so diagrams don't look squashed/odd
		const sizeByType = {
			actor: { width: 80, height: 120 },
			usecase: { width: 160, height: 80 },
			class: { width: 160, height: 100 },
			package: { width: 160, height: 100 },
			note: { width: 140, height: 80 },
			decision: { width: 120, height: 100 },
			diamond: { width: 120, height: 100 },
			gateway: { width: 80, height: 80 },
			circle: { width: 90, height: 90 },
			ellipse: { width: 140, height: 80 },
			'start-event': { width: 70, height: 70 },
			'end-event': { width: 70, height: 70 },
			'intermediate-event': { width: 70, height: 70 },
			interface: { width: 90, height: 90 },
			attribute: { width: 110, height: 60 },
			database: { width: 100, height: 90 },
			cylinder: { width: 100, height: 90 },
			cloud: { width: 140, height: 90 },
			entity: { width: 140, height: 70 },
			'weak-entity': { width: 140, height: 70 },
			relationship: { width: 120, height: 90 },
			'start-end': { width: 120, height: 56 },
			terminator: { width: 120, height: 56 }
		};
		const size = sizeByType[type] || { width: 120, height: 60 };
		documentStore.addNode({
			id: crypto.randomUUID(),
			type,
			position: { x: 200 + Math.random() * 50, y: 150 + Math.random() * 50 },
			...size,
			label: label || 'New Node'
		});
	}

	return (
		<aside className="editor-shape-sidebar z-10 flex h-full w-64 flex-col border-r select-none">
			<div className="space-y-3 border-b border-white/8 px-4 py-4">
				<h3 className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Shapes</h3>
				<div className="relative">
					<svg className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.35-4.35m1.6-5.15a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
					</svg>
					<input type="text" placeholder="Search shapes" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full py-2 pr-3 pl-9 text-xs" />
				</div>
			</div>

			<div className="custom-scrollbar flex-1 overflow-y-auto">
				<div className="border-b border-white/8">
					<button className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-white/6" onClick={() => setExpanded((s) => ({ ...s, tools: !s.tools }))}>
						<span>General</span>
						<span className="text-[10px] text-slate-500">{expanded.tools !== false ? 'v' : '>'}</span>
					</button>
					{expanded.tools !== false ? (
						<div className="grid grid-cols-2 gap-2 p-3">
							<button className="group relative flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/5 p-2 text-slate-400 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white" onClick={() => addNode('text', 'Text')} title="Text">
								<span className="text-lg font-semibold">T</span>
								<span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 group-hover:text-slate-300">Text</span>
							</button>
							<button className="group flex min-h-[72px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/5 p-2 text-slate-400 hover:border-indigo-400/30 hover:bg-indigo-500/10 hover:text-white" onClick={() => alert('Drag from any node handle to create a connection!')} title="Connection">
								<span className="text-lg">-&gt;</span>
								<span className="mt-1 text-[10px] uppercase tracking-[0.12em] text-slate-500 group-hover:text-slate-300">Connect</span>
							</button>
						</div>
					) : null}
				</div>

				{categories.map((catKey) => (
					<div key={catKey} className="border-b border-white/8">
						<button className="flex w-full items-center justify-between px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300 transition-colors hover:bg-white/6" onClick={() => setExpanded((s) => ({ ...s, [catKey]: !s[catKey] }))}>
							<span>{CATEGORY_NAMES[catKey] || catKey}</span>
							<span className="text-[10px] text-slate-500">{expanded[catKey] ? 'v' : '>'}</span>
						</button>
						{expanded[catKey] ? (
							<div className="grid grid-cols-3 gap-2 p-3">
								{(NODE_SHAPES[catKey] || []).filter((s) => !searchQuery || s.label.toLowerCase().includes(searchQuery.toLowerCase())).map((shape) => (
									<button key={`${catKey}-${shape.type}-${shape.label}`} className="group relative flex min-h-[84px] flex-col items-center justify-center rounded-2xl border border-white/8 bg-white/4 p-2 transition-all hover:-translate-y-0.5 hover:border-indigo-400/30 hover:bg-indigo-500/10" onClick={() => addNode(shape.type, shape.label)} title={shape.label} draggable onDragStart={(e) => e.dataTransfer?.setData('application/gradiol-node', JSON.stringify({ type: shape.type, label: shape.label }))}>
										<div className="flex h-9 w-9 items-center justify-center text-slate-300 transition-colors group-hover:text-white">
											{shape.type === 'text' ? <span className="font-serif text-xl font-bold">T</span> : <svg viewBox="0 0 40 40" className="h-7 w-7 fill-none stroke-current opacity-80 group-hover:opacity-100" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"><path d={getShapePath(shape.type, 40, 40)} vectorEffect="non-scaling-stroke" /></svg>}
										</div>
										<span className="mt-2 w-full truncate text-center text-[9px] font-medium uppercase tracking-[0.12em] text-slate-500 group-hover:text-slate-300">{shape.label}</span>
									</button>
								))}
							</div>
						) : null}
					</div>
				))}
			</div>
		</aside>
	);
}

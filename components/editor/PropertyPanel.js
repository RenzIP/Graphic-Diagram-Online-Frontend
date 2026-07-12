'use client';

import { useState } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';
import { selectionStore } from '../../lib/stores/selection.js';

function SectionTitle({ children }) {
	return <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{children}</label>;
}

function MiniLabel({ children }) {
	return <span className="text-xs text-slate-500">{children}</span>;
}

function ToggleButton({ active, onClick, children }) {
	return (
		<button className={`px-2 py-1.5 ${active ? 'bg-indigo-500/18 text-indigo-200' : 'text-slate-400 hover:bg-white/6 hover:text-white'}`} onClick={onClick}>
			{children}
		</button>
	);
}

export default function PropertyPanel() {
	const [activeTab, setActiveTab] = useState('style');
	const document = useStore(documentStore);
	const selection = useStore(selectionStore);
	const selectedNodeId = selection.nodes[0];
	const selectedEdgeId = selection.edges[0];
	const selectedNode = selectedNodeId ? document.nodes.find((n) => n.id === selectedNodeId) : null;
	const selectedEdge = selectedEdgeId ? document.edges.find((e) => e.id === selectedEdgeId) : null;

	const updateNode = (prop, value) => selectedNodeId && documentStore.updateNode(selectedNodeId, { [prop]: value });
	const updateNodeStyle = (prop, value) => selectedNodeId && documentStore.updateNode(selectedNodeId, { style: { ...(selectedNode?.style || {}), [prop]: value } });
	const updateEdge = (prop, value) => selectedEdgeId && documentStore.updateEdge(selectedEdgeId, { [prop]: value });
	const updateEdgeStyle = (prop, value) => selectedEdgeId && documentStore.updateEdge(selectedEdgeId, { style: { ...(selectedEdge?.style || {}), [prop]: value } });

	return (
		<div className="editor-property-panel flex h-full w-80 flex-col border-l">
			<div className="border-b border-white/8 px-5 py-4">
				<p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Inspector</p>
				<h2 className="mt-2 text-lg font-semibold text-white">Properties</h2>
			</div>
			{selectedNode ? (
				<>
					<div className="flex border-b border-white/8 px-3 pt-2">
						{['style', 'text', 'arrange'].map((tab) => (
							<button key={tab} className={`flex-1 rounded-t-2xl px-3 py-3 text-xs font-semibold uppercase tracking-[0.14em] ${activeTab === tab ? 'border border-white/8 border-b-transparent bg-white/8 text-white' : 'text-slate-500 hover:bg-white/6 hover:text-slate-300'}`} onClick={() => setActiveTab(tab)}>
								{tab}
							</button>
						))}
					</div>
					<div className="flex-1 space-y-6 overflow-y-auto p-5">
						{activeTab === 'style' ? (
							<div className="space-y-5">
								<div className="space-y-3">
									<SectionTitle>Fill</SectionTitle>
									<div className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
										<input type="color" value={selectedNode.style?.fill || '#ffffff'} onChange={(e) => updateNodeStyle('fill', e.target.value)} className="h-9 w-9 cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
										<div>
											<div className="text-sm font-medium text-white">{selectedNode.style?.fill || '#ffffff'}</div>
											<MiniLabel>Node fill color</MiniLabel>
										</div>
									</div>
									<label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={!!selectedNode.style?.gradient} onChange={(e) => updateNodeStyle('gradient', e.target.checked)} /> Enable gradient</label>
									{selectedNode.style?.gradient ? (
										<div className="space-y-3 rounded-2xl border border-white/8 bg-white/4 p-3">
											<div>
												<MiniLabel>Direction</MiniLabel>
												<select value={selectedNode.style?.gradientOrientation || 'vertical'} onChange={(e) => updateNodeStyle('gradientOrientation', e.target.value)} className="mt-2 w-full py-2 px-3 text-xs">
													<option value="vertical">Top to bottom</option>
													<option value="horizontal">Left to right</option>
													<option value="diagonal">Diagonal</option>
												</select>
											</div>
											<div className="grid grid-cols-2 gap-3">
												<div>
													<MiniLabel>Start</MiniLabel>
													<input type="color" value={selectedNode.style?.gradientStartColor || selectedNode.style?.stroke || '#000000'} onChange={(e) => updateNodeStyle('gradientStartColor', e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
												</div>
												<div>
													<MiniLabel>End</MiniLabel>
													<input type="color" value={selectedNode.style?.gradientEndColor || selectedNode.style?.fill || '#ffffff'} onChange={(e) => updateNodeStyle('gradientEndColor', e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
												</div>
											</div>
										</div>
									) : null}
								</div>

								<hr />

								<div className="space-y-3">
									<SectionTitle>Border</SectionTitle>
									<div className="grid grid-cols-2 gap-3">
										<input type="color" value={selectedNode.style?.stroke || '#000000'} onChange={(e) => updateNodeStyle('stroke', e.target.value)} className="h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
										<input type="number" min="0" max="20" value={selectedNode.style?.strokeWidth ?? 2} onChange={(e) => updateNodeStyle('strokeWidth', +e.target.value)} className="w-full px-3 py-2 text-sm" />
									</div>
									<select value={selectedNode.style?.strokeDasharray || 'none'} onChange={(e) => updateNodeStyle('strokeDasharray', e.target.value)} className="w-full px-3 py-2 text-sm">
										<option value="none">Solid</option>
										<option value="5,5">Dashed</option>
										<option value="2,2">Dotted</option>
									</select>
								</div>

								<hr />

								<div className="space-y-3">
									<SectionTitle>Shadow</SectionTitle>
									<label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={!!selectedNode.style?.shadow} onChange={(e) => updateNodeStyle('shadow', e.target.checked)} /> Enable shadow</label>
									{selectedNode.style?.shadow ? (
										<div className="space-y-3 rounded-2xl border border-white/8 bg-white/4 p-3">
											<div className="grid grid-cols-2 gap-3">
												<div>
													<MiniLabel>Color</MiniLabel>
													<input type="color" value={selectedNode.style?.shadowColor || '#000000'} onChange={(e) => updateNodeStyle('shadowColor', e.target.value)} className="mt-2 h-10 w-full cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
												</div>
												<div>
													<MiniLabel>Blur</MiniLabel>
													<input type="number" min="0" max="30" step="1" value={selectedNode.style?.shadowBlur ?? 5} onChange={(e) => updateNodeStyle('shadowBlur', +e.target.value)} className="mt-2 w-full px-3 py-2 text-sm" />
												</div>
											</div>
											<div>
												<MiniLabel>Opacity</MiniLabel>
												<input type="range" min="0" max="1" step="0.05" value={selectedNode.style?.shadowOpacity ?? 0.4} onChange={(e) => updateNodeStyle('shadowOpacity', +e.target.value)} className="mt-2 h-1.5 w-full accent-indigo-400" />
											</div>
											<div className="grid grid-cols-2 gap-3">
												<div>
													<MiniLabel>Offset X</MiniLabel>
													<input type="number" min="-20" max="20" step="1" value={selectedNode.style?.shadowOffsetX ?? 0} onChange={(e) => updateNodeStyle('shadowOffsetX', +e.target.value)} className="mt-2 w-full px-3 py-2 text-sm" />
												</div>
												<div>
													<MiniLabel>Offset Y</MiniLabel>
													<input type="number" min="-20" max="20" step="1" value={selectedNode.style?.shadowOffsetY ?? 3} onChange={(e) => updateNodeStyle('shadowOffsetY', +e.target.value)} className="mt-2 w-full px-3 py-2 text-sm" />
												</div>
											</div>
										</div>
									) : null}
								</div>

								<hr />

								<div>
									<SectionTitle>Opacity</SectionTitle>
									<div className="mt-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
										<input type="range" min="0" max="1" step="0.1" value={selectedNode.style?.opacity ?? 1} onChange={(e) => updateNodeStyle('opacity', +e.target.value)} className="h-1.5 w-full accent-indigo-400" />
										<div className="mt-2 text-xs text-slate-500">{Math.round((selectedNode.style?.opacity ?? 1) * 100)}% visibility</div>
									</div>
								</div>
							</div>
						) : activeTab === 'text' ? (
							<div className="space-y-5">
								<div>
									<SectionTitle>Label</SectionTitle>
									<textarea value={selectedNode.label || ''} onChange={(e) => updateNode('label', e.target.value)} className="mt-3 w-full p-3 text-sm" rows="3"></textarea>
								</div>
								<div>
									<SectionTitle>Font family</SectionTitle>
									<select value={selectedNode.style?.fontFamily || 'sans-serif'} onChange={(e) => updateNodeStyle('fontFamily', e.target.value)} className="mt-3 w-full px-3 py-2 text-sm">
										<option value="sans-serif">Sans Serif</option>
										<option value="serif">Serif</option>
										<option value="monospace">Monospace</option>
									</select>
								</div>
								<div className="grid grid-cols-[1fr_auto] gap-3">
									<div>
										<SectionTitle>Font size</SectionTitle>
										<input type="number" value={selectedNode.style?.fontSize || 14} onChange={(e) => updateNodeStyle('fontSize', +e.target.value)} className="mt-3 w-full px-3 py-2 text-sm" />
									</div>
									<div>
										<SectionTitle>Color</SectionTitle>
										<input type="color" value={selectedNode.style?.color || (selectedNode.color === 'white' ? '#000000' : '#ffffff')} onChange={(e) => updateNodeStyle('color', e.target.value)} className="mt-3 h-11 w-14 cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
									</div>
								</div>
								<div>
									<SectionTitle>Emphasis</SectionTitle>
									<div className="mt-3 flex overflow-hidden rounded-2xl border border-white/8 bg-white/4">
										<ToggleButton active={selectedNode.style?.fontWeight === 'bold'} onClick={() => updateNodeStyle('fontWeight', selectedNode.style?.fontWeight === 'bold' ? 'normal' : 'bold')}><strong>B</strong></ToggleButton>
										<ToggleButton active={selectedNode.style?.fontStyle === 'italic'} onClick={() => updateNodeStyle('fontStyle', selectedNode.style?.fontStyle === 'italic' ? 'normal' : 'italic')}><em>I</em></ToggleButton>
										<ToggleButton active={selectedNode.style?.textDecoration === 'underline'} onClick={() => updateNodeStyle('textDecoration', selectedNode.style?.textDecoration === 'underline' ? 'none' : 'underline')}><span className="underline">U</span></ToggleButton>
									</div>
								</div>
							</div>
						) : (
							<div className="space-y-5">
								<div className="grid grid-cols-2 gap-3">
									<div>
										<SectionTitle>X position</SectionTitle>
										<input type="number" value={Math.round(selectedNode.position.x)} onChange={(e) => documentStore.updateNode(selectedNodeId, { position: { x: +e.target.value, y: selectedNode.position.y } })} className="mt-3 w-full px-3 py-2 text-sm" />
									</div>
									<div>
										<SectionTitle>Y position</SectionTitle>
										<input type="number" value={Math.round(selectedNode.position.y)} onChange={(e) => documentStore.updateNode(selectedNodeId, { position: { x: selectedNode.position.x, y: +e.target.value } })} className="mt-3 w-full px-3 py-2 text-sm" />
									</div>
									<div>
										<SectionTitle>Width</SectionTitle>
										<input type="number" value={selectedNode.width || 120} onChange={(e) => updateNode('width', +e.target.value)} className="mt-3 w-full px-3 py-2 text-sm" />
									</div>
									<div>
										<SectionTitle>Height</SectionTitle>
										<input type="number" value={selectedNode.height || 60} onChange={(e) => updateNode('height', +e.target.value)} className="mt-3 w-full px-3 py-2 text-sm" />
									</div>
								</div>
								<div className="grid grid-cols-2 gap-2">
									<button className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-slate-200 hover:bg-white/8" onClick={() => documentStore.moveNodeOrder(selectedNodeId, 'front')}>Bring to Front</button>
									<button className="rounded-2xl border border-white/8 bg-white/5 px-3 py-3 text-sm text-slate-200 hover:bg-white/8" onClick={() => documentStore.moveNodeOrder(selectedNodeId, 'back')}>Send to Back</button>
								</div>
								<label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-300"><input type="checkbox" checked={!!selectedNode.locked} onChange={(e) => updateNode('locked', e.target.checked)} /> Lock Position</label>
							</div>
						)}
					</div>
				</>
			) : selectedEdge ? (
				<div className="space-y-5 p-5 text-slate-200">
					<div>
						<SectionTitle>Edge type</SectionTitle>
						<select value={selectedEdge.type || 'default'} onChange={(e) => updateEdge('type', e.target.value)} className="mt-3 w-full px-3 py-2 text-sm">
							<option value="default">Bezier (Smooth)</option>
							<option value="step">Step (Orthogonal)</option>
							<option value="straight">Straight</option>
						</select>
					</div>
					<div>
						<SectionTitle>Stroke color</SectionTitle>
						<div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-3 py-3">
							<input type="color" value={selectedEdge.style?.stroke || '#64748b'} onChange={(e) => updateEdgeStyle('stroke', e.target.value)} className="h-9 w-9 cursor-pointer rounded-xl border border-white/10 bg-slate-900 p-1" />
							<div>
								<div className="text-sm font-medium text-white">{selectedEdge.style?.stroke || '#64748b'}</div>
								<MiniLabel>Edge stroke color</MiniLabel>
							</div>
						</div>
					</div>
					<div className="grid grid-cols-2 gap-3">
						<div>
							<SectionTitle>Stroke width</SectionTitle>
							<input type="number" min="1" max="10" value={selectedEdge.style?.strokeWidth ?? 2} onChange={(e) => updateEdgeStyle('strokeWidth', +e.target.value)} className="mt-3 w-full px-3 py-2 text-sm" />
						</div>
						<div>
							<SectionTitle>Line style</SectionTitle>
							<select value={selectedEdge.style?.strokeDasharray || 'none'} onChange={(e) => updateEdgeStyle('strokeDasharray', e.target.value)} className="mt-3 w-full px-3 py-2 text-sm">
								<option value="none">Solid</option>
								<option value="5,5">Dashed</option>
								<option value="2,2">Dotted</option>
								<option value="10,5,2,5">Dash-dot</option>
							</select>
						</div>
					</div>
					<label className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/4 px-4 py-3 text-sm text-slate-300"><input type="checkbox" checked={!!selectedEdge.animated} onChange={(e) => updateEdge('animated', e.target.checked)} /> Animated edge</label>
				</div>
			) : (
				<div className="flex flex-1 items-center justify-center p-8 text-center text-slate-500">
					<p className="max-w-xs text-sm leading-6">Select a node or edge to reveal properties, styling controls, and arrangement tools.</p>
				</div>
			)}
		</div>
	);
}

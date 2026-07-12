'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { canvasStore } from '../../lib/stores/canvas.js';
import { documentStore } from '../../lib/stores/document.js';
import { selectionStore } from '../../lib/stores/selection.js';
import { getBestHandle, getBorderPoint, getHandlePoint, getNearestHandle, getNodeCenter, getShapeConnectionPoint, getSmoothPath } from '../../lib/utils/geometry.js';
import { collaborationStore } from '../../lib/stores/collaboration.js';
import { createNodeFromShape, getDefaultNodeSize } from '../../lib/utils/nodes.js';
import ShapeNode from '../nodes/ShapeNode.js';
import Grid from './Grid';

export default function Canvas({ children, onSvgRef }) {
	const svgRef = useRef(null);
	const canvas = useStore(canvasStore);
	const document = useStore(documentStore);
	const [isPanning, setIsPanning] = useState(false);
	const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
	const [selectionBox, setSelectionBox] = useState({ start: { x: 0, y: 0 }, current: { x: 0, y: 0 }, active: false });
	const [dragPreview, setDragPreview] = useState(null);
	const [dragItem, setDragItem] = useState(null);

	const screenToSvg = useCallback((clientX, clientY) => {
		const rect = svgRef.current?.getBoundingClientRect();
		return {
			x: (clientX - (rect?.left ?? 0) - canvas.x) / canvas.k,
			y: (clientY - (rect?.top ?? 0) - canvas.y) / canvas.k
		};
	}, [canvas.x, canvas.y, canvas.k]);

	useEffect(() => {
		onSvgRef?.(svgRef.current);
	}, [onSvgRef]);

	useEffect(() => {
		let lastCursorSent = 0;
		function onMove(event) {
			// Throttle cursor updates (50ms)
			const now = Date.now();
			if (now - lastCursorSent > 50) {
				const { x, y } = screenToSvg(event.clientX, event.clientY);
				import('../../lib/ws/client.js').then(({ wsClient }) => {
					wsClient.send({ type: 'cursor_move', x, y });
				});
				lastCursorSent = now;
			}

			if (selectionBox.active) {
				const { x, y } = screenToSvg(event.clientX, event.clientY);
				setSelectionBox((box) => ({ ...box, current: { x, y } }));
				return;
			}
			if (isPanning) {
				const dx = event.clientX - lastMousePos.x;
				const dy = event.clientY - lastMousePos.y;
				canvasStore.pan(dx, dy);
				setLastMousePos({ x: event.clientX, y: event.clientY });
			}
			if (canvas.connecting) {
				const { x, y } = screenToSvg(event.clientX, event.clientY);
				canvasStore.updateConnection({ x, y });
			}
		}
		function onUp(event) {
			if (selectionBox.active) {
				const x = Math.min(selectionBox.start.x, selectionBox.current.x);
				const y = Math.min(selectionBox.start.y, selectionBox.current.y);
				const w = Math.abs(selectionBox.current.x - selectionBox.start.x);
				const h = Math.abs(selectionBox.current.y - selectionBox.start.y);
				if (w < 2 && h < 2) {
					if (!event.shiftKey) selectionStore.clear();
				} else {
					const ids = document.nodes.filter((n) => n.position.x < x + w && n.position.x + (n.width || 120) > x && n.position.y < y + h && n.position.y + (n.height || 60) > y).map((n) => n.id);
					selectionStore.selectNodes(ids, event.shiftKey);
				}
				setSelectionBox((box) => ({ ...box, active: false }));
			}
			setIsPanning(false);
			if (canvas.connecting) canvasStore.endConnection();
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
	}, [canvas, document.nodes, isPanning, lastMousePos, selectionBox, screenToSvg]);

	function parseDragData(event) {
		try {
			const data = event.dataTransfer.getData('application/gradiol-node');
			if (!data) return null;
			return JSON.parse(data);
		} catch {
			return null;
		}
	}

	function handleDragOver(event) {
		event.preventDefault();
		if (event.dataTransfer.types.includes('application/gradiol-node')) {
			const coords = screenToSvg(event.clientX, event.clientY);
			setDragPreview(coords);
			// Only parse item data when it changes to avoid extra work
			setDragItem((prev) => {
				if (prev) return prev;
				const data = parseDragData(event);
				return data || null;
			});
		}
	}

	function handleDragLeave() {
		setDragPreview(null);
		setDragItem(null);
	}

	function handleDrop(event) {
		event.preventDefault();
		setDragPreview(null);
		setDragItem(null);
		const data = parseDragData(event);
		if (!data) return;
		try {
			const { type, label } = data;
			const coords = screenToSvg(event.clientX, event.clientY);
			const node = createNodeFromShape(type, label, coords);
			documentStore.addNode(node);
		} catch (err) {
			console.error('[Canvas] Failed to handle drop:', err);
		}
	}

	function handleWheel(event) {
		event.preventDefault();
		if (event.ctrlKey) {
			const rect = svgRef.current.getBoundingClientRect();
			const center = { x: event.clientX - rect.left, y: event.clientY - rect.top };
			const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
			canvasStore.update((t) => {
				const newK = Math.min(Math.max(t.k * zoomFactor, 0.1), 5);
				return { x: center.x - (center.x - t.x) * (newK / t.k), y: center.y - (center.y - t.y) * (newK / t.k), k: newK };
			});
		} else {
			canvasStore.pan(-event.deltaX, -event.deltaY);
		}
	}

	function handleMouseDown(event) {
		const target = event.target;
		if ((target.tagName === 'svg' || target.tagName === 'rect') && event.button === 0) {
			if (event.shiftKey) {
				const { x, y } = screenToSvg(event.clientX, event.clientY);
				setSelectionBox({ active: true, start: { x, y }, current: { x, y } });
				selectionStore.clear();
			} else {
				setIsPanning(true);
				setLastMousePos({ x: event.clientX, y: event.clientY });
			}
		} else if (event.button === 1) {
			setIsPanning(true);
			setLastMousePos({ x: event.clientX, y: event.clientY });
			event.preventDefault();
		}
	}

	const conn = canvas.connecting;
	const startNode = conn ? document.nodes.find((n) => n.id === conn.sourceNodeId) : null;
	const candidateNode = conn?.candidateNodeId ? document.nodes.find((n) => n.id === conn.candidateNodeId) : null;
	const startPos =
		startNode && conn
			? conn.sourceHandle
				? getHandlePoint(startNode, conn.sourceHandle)
				: getBorderPoint(startNode, conn.mousePos || getNodeCenter(startNode))
			: null;
	const previewTarget = candidateNode
		? getShapeConnectionPoint(candidateNode, startPos || getNodeCenter(candidateNode))
		: conn?.mousePos;
	const previewTargetHandle = candidateNode && conn?.mousePos ? getNearestHandle(candidateNode, conn.mousePos) : 'top';
	const previewSourceHandle = conn?.sourceHandle || 'bottom';
	const boxX = Math.min(selectionBox.start.x, selectionBox.current.x);
	const boxY = Math.min(selectionBox.start.y, selectionBox.current.y);
	const boxW = Math.abs(selectionBox.current.x - selectionBox.start.x);
	const boxH = Math.abs(selectionBox.current.y - selectionBox.start.y);

	const collab = useStore(collaborationStore);

	return (
		<div className="relative h-full w-full overflow-hidden bg-[#08101d]">
			<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.08),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.06),transparent_22%)]"></div>
			<svg ref={svgRef} className="block h-full w-full cursor-crosshair touch-none active:cursor-grabbing" role="application" aria-label="Diagram Canvas" onWheel={handleWheel} onMouseDown={handleMouseDown} onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
				<Grid />
				<g transform={`translate(${canvas.x} ${canvas.y}) scale(${canvas.k})`}>
					{children}
					{conn && startPos && previewTarget ? (
						<path
							d={getSmoothPath(startPos, previewTarget, previewSourceHandle, previewTargetHandle)}
							className="pointer-events-none stroke-indigo-500 stroke-2"
							strokeDasharray="6 4"
							strokeLinecap="round"
							fill="none"
						/>
					) : null}
					{selectionBox.active ? <rect x={boxX} y={boxY} width={boxW} height={boxH} className="pointer-events-none fill-indigo-500/10 stroke-indigo-500 stroke-1" /> : null}

					{/* Drop preview indicator */}
					{dragPreview ? (
						<g className="pointer-events-none" pointerEvents="none" style={{ opacity: 0.65 }}>
							{dragItem ? (
								<g transform={`translate(${dragPreview.x - (dragItem.width || 120) / 2} ${dragPreview.y - (dragItem.height || 60) / 2})`}>
									<ShapeNode
										node={{
											id: 'drag-preview',
											type: dragItem.type,
											label: dragItem.label,
											width: dragItem.width || 120,
											height: dragItem.height || 60,
											position: { x: 0, y: 0 },
											style: { stroke: '#6366f1', strokeWidth: 2, fill: 'rgba(99,102,241,0.15)' }
										}}
									/>
								</g>
							) : (
								<>
									<circle cx={dragPreview.x} cy={dragPreview.y} r={8} className="fill-indigo-500/30 stroke-indigo-400 stroke-2" strokeDasharray="4 2" />
									<circle cx={dragPreview.x} cy={dragPreview.y} r={2} className="fill-indigo-400" />
								</>
							)}
						</g>
					) : null}

					{/* Remote Cursors */}
					{Object.entries(collab?.cursors || {}).map(([userId, pos]) => {
						const user = collab.users.find(u => u.id === userId);
						if (!user) return null;
						return (
							<g key={userId} transform={`translate(${pos.x} ${pos.y})`} className="pointer-events-none transition-transform duration-75 ease-out">
								{/* Cursor SVG icon */}
								<path d="M0,0 L11,11 L4.8,11 L0,20 Z" fill={user.color} stroke="white" strokeWidth="1.5" />
								{/* Name badge */}
								<rect x="12" y="12" rx="4" width={(user.name || user.id).length * 7 + 10} height="20" fill={user.color} />
								<text x="17" y="25" fontSize="10" fill="white" fontWeight="bold">{(user.name || user.id)}</text>
							</g>
						);
					})}
				</g>
			</svg>
			<div className="glass-panel absolute right-4 bottom-4 rounded-2xl px-3 py-2 text-sm font-medium text-slate-200">{Math.round(canvas.k * 100)}%</div>
		</div>
	);
}

'use client';

import { useState } from 'react';
import { getEdgeGeometry } from '../../lib/utils/geometry.js';
import { documentStore } from '../../lib/stores/document.js';
import { selectionStore } from '../../lib/stores/selection.js';
import { canvasStore } from '../../lib/stores/canvas.js';
import { useStore } from '../../hooks/useStore.js';

const MARKER_SHAPES = {
	arrow: 'M 0 0 L 10 3.5 L 0 7 Z',
	arrowclosed: 'M 0 0 L 10 3.5 L 0 7 Z',
	arrowopen: 'M 0 0 L 10 3.5 L 0 7',
	diamond: 'M 0 3.5 L 5 0 L 10 3.5 L 5 7 Z',
	circle: 'M 5 0 A 3.5 3.5 0 1 1 5 7 A 3.5 3.5 0 1 1 5 0'
};

/** Marker viewBox and reference point so the arrow tip lands exactly on the path end. */
const MARKER_VIEWBOX = '0 0 10 7';

export default function BaseEdge({ edge, sourceNode, targetNode, bundle = { index: 0, total: 1 }, allNodes = [] }) {
	const selection = useStore(selectionStore);
	const [isEditing, setIsEditing] = useState(false);

	const { path, midPoint, source, target } = getEdgeGeometry(sourceNode, targetNode, edge, bundle, allNodes);
	const isSelected = selection.edges.includes(edge.id);
	const strokeColor = isSelected ? '#6366f1' : edge.style?.stroke || '#64748b';
	const strokeWidth = (edge.style?.strokeWidth || 2) + (isSelected ? 1 : 0);
	const strokeDasharray = edge.style?.strokeDasharray || (edge.animated ? '5,5' : 'none');

	const endMarkerType = edge.markerEnd === 'none' ? null : edge.markerEnd || 'arrow';
	const startMarkerType = edge.markerStart && edge.markerStart !== 'none' ? edge.markerStart : null;
	const markerEndId = endMarkerType ? `marker-end-${edge.id}` : null;
	const markerStartId = startMarkerType ? `marker-start-${edge.id}` : null;
	const markerEnd = markerEndId ? `url(#${markerEndId})` : undefined;
	const markerStart = markerStartId ? `url(#${markerStartId})` : undefined;

	// Unique def IDs for this edge's shadow/glow filter
	const glowId = `edge-glow-${edge.id}`;

	const label = edge.label || '';
	const labelWidth = Math.max(28, label.length * 7 + 12);

	function handleClick(e) {
		e.stopPropagation();
		selectionStore.selectEdge(edge.id, e.shiftKey);
	}

	function startReconnect(e, isSource) {
		e.stopPropagation();
		e.preventDefault();
		const handle = isSource ? edge.sourceHandle || 'bottom' : edge.targetHandle || 'top';
		const nodeId = isSource ? edge.source : edge.target;
		const pos = isSource ? source : target;
		// Drag from this end to re-attach to another node
		canvasStore.startConnection(nodeId, handle, { x: pos.x, y: pos.y }, edge.id, isSource);
	}

	return (
		<g
			className="group"
			onClick={handleClick}
			onDoubleClick={(e) => {
				e.stopPropagation();
				setIsEditing(true);
			}}
			role="button"
			tabIndex={0}
			aria-label={label ? `Edge: ${label}` : 'Connection'}
		>
			{/* Hit area */}
			<path d={path} stroke="transparent" strokeWidth="18" fill="none" className="cursor-pointer" />
			{/* Subtle glow for selected edges */}
			{isSelected ? (
				<path
					d={path}
					stroke={strokeColor}
					strokeWidth={strokeWidth + 4}
					strokeOpacity="0.25"
					strokeLinecap="round"
					strokeLinejoin="round"
					fill="none"
					filter={`url(#${glowId})`}
					className="pointer-events-none"
				/>
			) : null}

			{/* Visible edge */}
			<path
				d={path}
				stroke={strokeColor}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
				strokeLinecap="round"
				strokeLinejoin="round"
				fill="none"
				markerEnd={markerEnd}
				markerStart={markerStart}
				className={`transition-colors group-hover:stroke-indigo-400 ${edge.animated ? 'animate-[dash_1s_linear_infinite]' : ''}`}
			/>

			{/* Selection endpoints for reconnect */}
			{isSelected ? (
				<>
					<circle
						cx={source.x}
						cy={source.y}
						r={5}
						className="fill-indigo-500 stroke-white stroke-1 cursor-crosshair"
						onMouseDown={(e) => startReconnect(e, true)}
					/>
					<circle
						cx={target.x}
						cy={target.y}
						r={5}
						className="fill-indigo-500 stroke-white stroke-1 cursor-crosshair"
						onMouseDown={(e) => startReconnect(e, false)}
					/>
				</>
			) : null}

			{isEditing ? (
				<foreignObject x={midPoint.x - 48} y={midPoint.y - 14} width="96" height="28">
					<input
						autoFocus
						value={label}
						onChange={(e) => documentStore.updateEdge(edge.id, { label: e.target.value })}
						onBlur={() => setIsEditing(false)}
						onKeyDown={(e) => {
							if (e.key === 'Enter') setIsEditing(false);
						}}
						className="h-full w-full rounded border border-indigo-500 bg-slate-800 text-center text-xs text-white focus:outline-none"
					/>
				</foreignObject>
			) : label ? (
				<>
					<rect
						x={midPoint.x - labelWidth / 2}
						y={midPoint.y - 10}
						width={labelWidth}
						height="20"
						rx="4"
						fill="#0f172a"
						stroke="#334155"
						strokeWidth="1"
					/>
					<text
						x={midPoint.x}
						y={midPoint.y}
						dy="4"
						textAnchor="middle"
						className="pointer-events-none fill-slate-300 text-[10px] select-none"
					>
						{label}
					</text>
				</>
			) : null}

			{/* Per-edge markers so color matches stroke and IDs never collide */}
			<defs>
				{/* Glow filter for selected edges */}
				<filter id={glowId} x="-50%" y="-50%" width="200%" height="200%">
					<feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
					<feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 1 0" />
				</filter>

				{endMarkerType ? (
					<marker
						id={markerEndId}
						viewBox={MARKER_VIEWBOX}
						markerWidth="5"
						markerHeight="3.5"
						refX="10"
						refY="3.5"
						orient="auto"
						markerUnits="strokeWidth"
					>
						<path
							d={MARKER_SHAPES[endMarkerType] || MARKER_SHAPES.arrow}
							fill={endMarkerType === 'arrowopen' ? 'none' : strokeColor}
							stroke={strokeColor}
							strokeWidth={endMarkerType === 'arrowopen' ? 1.2 : 0}
						/>
					</marker>
				) : null}
				{startMarkerType ? (
					<marker
						id={markerStartId}
						viewBox={MARKER_VIEWBOX}
						markerWidth="5"
						markerHeight="3.5"
						refX="0"
						refY="3.5"
						orient="auto"
						markerUnits="strokeWidth"
					>
						<path
							d={MARKER_SHAPES[startMarkerType] || MARKER_SHAPES.arrow}
							fill={startMarkerType === 'arrowopen' ? 'none' : strokeColor}
							stroke={strokeColor}
							strokeWidth={startMarkerType === 'arrowopen' ? 1.2 : 0}
						/>
					</marker>
				) : null}
			</defs>
		</g>
	);
}

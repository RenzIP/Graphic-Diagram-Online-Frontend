'use client';

import { useMemo } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';
import { getEdgeGeometry } from '../../lib/utils/geometry.js';

export default function Minimap() {
	const document = useStore(documentStore);

	const bounds = useMemo(() => {
		if (!document.nodes.length) return { minX: 0, minY: 0, width: 1000, height: 700 };
		let minX = Infinity;
		let minY = Infinity;
		let maxX = -Infinity;
		let maxY = -Infinity;
		for (const node of document.nodes) {
			const w = node.width || 120;
			const h = node.height || 60;
			minX = Math.min(minX, node.position.x);
			minY = Math.min(minY, node.position.y);
			maxX = Math.max(maxX, node.position.x + w);
			maxY = Math.max(maxY, node.position.y + h);
		}
		const pad = 80;
		return {
			minX: minX - pad,
			minY: minY - pad,
			width: Math.max(200, maxX - minX + pad * 2),
			height: Math.max(150, maxY - minY + pad * 2)
		};
	}, [document.nodes]);

	const nodeMap = useMemo(() => {
		const map = new Map();
		for (const n of document.nodes) map.set(n.id, n);
		return map;
	}, [document.nodes]);

	return (
		<div className="editor-minimap pointer-events-none absolute right-4 top-4 h-32 w-44 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[#0b1220]/90 shadow-lg backdrop-blur-sm">
			<svg
				viewBox={`${bounds.minX} ${bounds.minY} ${bounds.width} ${bounds.height}`}
				className="h-full w-full"
				preserveAspectRatio="xMidYMid meet"
			>
				{/* Edges first so nodes sit on top */}
				{document.edges.map((edge) => {
					const source = nodeMap.get(edge.source);
					const target = nodeMap.get(edge.target);
					if (!source || !target) return null;
					const { path } = getEdgeGeometry(source, target, edge);
					return <path key={edge.id} d={path} fill="none" stroke="#64748b" strokeWidth="3" opacity="0.7" />;
				})}
				{document.nodes.map((node) => (
					<rect
						key={node.id}
						x={node.position.x}
						y={node.position.y}
						width={node.width || 120}
						height={node.height || 60}
						rx="6"
						fill="#6366f1"
						opacity="0.55"
					/>
				))}
			</svg>
		</div>
	);
}

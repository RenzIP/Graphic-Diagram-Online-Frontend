'use client';

import { getShapePath } from '../../lib/utils/shapes.js';

const styleMap = {
	slate: { fill: '#1e293b', stroke: '#475569' },
	red: { fill: 'rgba(127, 29, 29, 0.4)', stroke: '#ef4444' },
	green: { fill: 'rgba(20, 83, 45, 0.4)', stroke: '#22c55e' },
	amber: { fill: 'rgba(120, 53, 15, 0.4)', stroke: '#f59e0b' },
	indigo: { fill: 'rgba(49, 46, 129, 0.4)', stroke: '#6366f1' },
	cyan: { fill: 'rgba(22, 78, 99, 0.4)', stroke: '#06b6d4' },
	white: { fill: '#ffffff', stroke: '#94a3b8' }
};

export default function ShapeNode({ node }) {
	const fallback = styleMap[node.color || 'slate'] || styleMap.slate;
	const w = node.width || 120;
	const h = node.height || 60;
	const d = getShapePath(node.type, w, h);
	const fill = node.style?.fill || fallback.fill;
	const stroke = node.style?.stroke || fallback.stroke;
	const strokeWidth = node.style?.strokeWidth || 2;
	const strokeDasharray = node.style?.strokeDasharray || 'none';
	const textColor = node.style?.color || (node.color === 'white' ? '#1e293b' : '#e2e8f0');
	const fontSize = node.style?.fontSize || 14;
	const fontFamily = node.style?.fontFamily || 'sans-serif';
	const fontWeight = node.style?.fontWeight || '500';
	const opacity = node.style?.opacity ?? 1;
	const hasGradient = !!node.style?.gradient;
	const hasShadow = !!node.style?.shadow;

	// Shadow knobs (all optional, sensibly defaulted so the on/off toggle is
	// the only thing the user has to flip to see a usable shadow).
	const shadowColor = node.style?.shadowColor || '#000000';
	const shadowOpacity = node.style?.shadowOpacity ?? 0.4;
	const shadowBlur = node.style?.shadowBlur ?? 5;
	const shadowOffsetX = node.style?.shadowOffsetX ?? 0;
	const shadowOffsetY = node.style?.shadowOffsetY ?? 3;

	// Gradient orientation — linearGradient endpoints in objectBoundingBox space.
	const GRADIENT_ORIENTATIONS = {
		vertical: { x1: '0', y1: '0', x2: '0', y2: '1' }, // top → bottom
		horizontal: { x1: '0', y1: '0', x2: '1', y2: '0' }, // left → right
		diagonal: { x1: '0', y1: '0', x2: '1', y2: '1' }, // TL → BR
	};
	const gradientOrientationKey = node.style?.gradientOrientation || 'vertical';
	const gradientOrientation = GRADIENT_ORIENTATIONS[gradientOrientationKey] || GRADIENT_ORIENTATIONS.vertical;
	// Custom gradient stop colors. Defaults fall back to stroke/fill so existing
	// nodes that only toggled gradient: true still look correct.
	const gradientStartColor = node.style?.gradientStartColor || stroke;
	const gradientEndColor = node.style?.gradientEndColor || fill;
	// Linear vs radial gradient type. Radial uses default objectBoundingBox
	// positioning (center 50%,50%, radius 50%) which works well for circles,
	// clouds, and most general shape outlines.
	const gradientType = node.style?.gradientType || 'linear';

	if (node.type === 'text') {
		return (
			<foreignObject x={0} y={0} width={w} height={h} style={{ pointerEvents: 'none', opacity }}>
				<div className="flex h-full w-full items-center justify-center overflow-hidden p-2 text-center break-words" style={{ color: textColor, fontFamily, fontSize, fontWeight, lineHeight: 1.2 }}>
					{node.label}
				</div>
			</foreignObject>
		);
	}

	// Stable, node-specific IDs so defs don't collide when several nodes share
	// the same canvas.
	const gradientId = `node-grad-${node.id}`;
	const shadowId = `node-shadow-${node.id}`;
	return (
		<g className="group" style={{ opacity }}>
			{(hasGradient || hasShadow) && (
				<defs>
					{hasGradient && gradientType === 'radial' && (
						<radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
							<stop offset="0%" stopColor={gradientStartColor} stopOpacity="0.95" />
							<stop offset="100%" stopColor={gradientEndColor} stopOpacity="1" />
						</radialGradient>
					)}
					{hasGradient && gradientType !== 'radial' && (
						<linearGradient id={gradientId} x1={gradientOrientation.x1} y1={gradientOrientation.y1} x2={gradientOrientation.x2} y2={gradientOrientation.y2}>
							<stop offset="0%" stopColor={gradientStartColor} stopOpacity="0.95" />
							<stop offset="100%" stopColor={gradientEndColor} stopOpacity="1" />
						</linearGradient>
					)}
					{hasShadow && (
						<filter id={shadowId} x="-50%" y="-50%" width="200%" height="200%">
							<feDropShadow dx={shadowOffsetX} dy={shadowOffsetY} stdDeviation={shadowBlur} floodColor={shadowColor} floodOpacity={shadowOpacity} />
						</filter>
					)}
				</defs>
			)}
			<path
				d={d}
				className="transition-colors group-hover:stroke-indigo-400"
				fill={hasGradient ? `url(#${gradientId})` : fill}
				stroke={stroke}
				strokeWidth={strokeWidth}
				strokeDasharray={strokeDasharray}
				strokeLinejoin="round"
				filter={hasShadow ? `url(#${shadowId})` : undefined}
			/>
			<foreignObject x={0} y={0} width={w} height={h} style={{ pointerEvents: 'none' }}>
				<div className="flex h-full w-full items-center justify-center overflow-hidden p-2 text-center break-words" style={{ color: textColor, fontFamily, fontSize, fontWeight, lineHeight: 1.2, fontStyle: node.style?.fontStyle, textDecoration: node.style?.textDecoration }}>
					{node.label}
				</div>
			</foreignObject>
		</g>
	);
}

function screenToSVG(point, transform) {
	return {
		x: (point.x - transform.x) / transform.k,
		y: (point.y - transform.y) / transform.k
	};
}

function svgToScreen(point, transform) {
	return {
		x: point.x * transform.k + transform.x,
		y: point.y * transform.k + transform.y
	};
}

function clamp(value, min, max) {
	return Math.min(Math.max(value, min), max);
}

function getNodeSize(node) {
	return {
		width: node?.width || 120,
		height: node?.height || 60
	};
}

function getNodeCenter(node) {
	const { width, height } = getNodeSize(node);
	return {
		x: node.position.x + width / 2,
		y: node.position.y + height / 2
	};
}

/** Shapes whose visual mass is a small figure inside a larger bounding box. */
const STROKE_FIGURE_TYPES = new Set(['actor']);

/**
 * For stick-figure / open shapes, the edge should attach to the actual figure,
 * not the corners of its bounding box. Returns a point on the figure body
 * biased toward the direction of `toward`.
 */
function getStrokeFigureAnchor(node, toward) {
	const { width, height } = getNodeSize(node);
	const center = getNodeCenter(node);
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const angle = Math.atan2(dy, dx);

	if (node.type === 'actor') {
		// Actor body: vertical line at center x, from ~neck to hip.
		// Anchor on the torso, biased slightly toward the connecting direction.
		const figureH = height * 0.78;
		const headR = Math.min(width, figureH) * 0.16;
		const neckY = node.position.y + headR * 2 + 2;
		const hipY = node.position.y + (headR * 2 + 2) + figureH * 0.42;
		const torsoY = (neckY + hipY) / 2;
		// Offset a bit along the angle so edges from above/below/sides feel natural
		const offset = Math.min(width, height) * 0.12;
		return {
			x: center.x + Math.cos(angle) * offset,
			y: torsoY + Math.sin(angle) * offset
		};
	}

	// Fallback: center of the node
	return center;
}

/**
 * Get a connection point on the node's visual shape facing toward `toward`.
 * For regular shapes this is the bounding-box border; for stick-figure shapes
 * it anchors on the figure body.
 */
function getShapeConnectionPoint(node, toward, pad = 0) {
	if (STROKE_FIGURE_TYPES.has(node.type)) {
		const anchor = getStrokeFigureAnchor(node, toward);
		// Still pull the anchor to a border-like point in the direction of `toward`
		// so multiple edges don't all pile onto the torso center.
		const center = getNodeCenter(node);
		const dx = toward.x - anchor.x;
		const dy = toward.y - anchor.y;
		const dist = Math.hypot(dx, dy) || 1;
		const maxOffset = Math.min(getNodeSize(node).width, getNodeSize(node).height) * 0.35 + pad;
		return {
			x: anchor.x + (dx / dist) * maxOffset,
			y: anchor.y + (dy / dist) * maxOffset
		};
	}
	return getBorderPoint(node, toward, pad);
}

/** Point on the node's bounding box for a named handle (top/right/bottom/left). */
function getHandlePoint(node, handle) {
	const { width, height } = getNodeSize(node);
	const { x, y } = node.position;
	switch (handle) {
		case 'top':
			return { x: x + width / 2, y };
		case 'right':
			return { x: x + width, y: y + height / 2 };
		case 'bottom':
			return { x: x + width / 2, y: y + height };
		case 'left':
			return { x, y: y + height / 2 };
		default:
			return getNodeCenter(node);
	}
}

/**
 * Pick the best side of `node` facing toward `toward` (another point).
 * Prefer sides whose outward normal points toward the other node.
 */
function getBestHandle(node, toward) {
	const center = getNodeCenter(node);
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	if (Math.abs(dx) > Math.abs(dy)) {
		return dx >= 0 ? 'right' : 'left';
	}
	return dy >= 0 ? 'bottom' : 'top';
}

/**
 * Intersection of the line from node center → `toward` with the node rectangle border.
 * This makes edges stop cleanly at the shape edge instead of going through the center.
 */
function getBorderPoint(node, toward, pad = 0) {
	const center = getNodeCenter(node);
	const { width, height } = getNodeSize(node);
	const halfW = width / 2 + pad;
	const halfH = height / 2 + pad;
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;

	if (dx === 0 && dy === 0) {
		return { x: center.x, y: center.y + halfH };
	}

	// Scale so the farther axis hits the box edge first
	const sx = dx === 0 ? Infinity : halfW / Math.abs(dx);
	const sy = dy === 0 ? Infinity : halfH / Math.abs(dy);
	const t = Math.min(sx, sy);

	return {
		x: center.x + dx * t,
		y: center.y + dy * t
	};
}

/**
 * Resolve anchor for an edge endpoint.
 * Prefer explicit handle; otherwise use border point toward the other end.
 */
function getEdgeAnchor(node, handle, otherPoint) {
	if (handle && ['top', 'right', 'bottom', 'left'].includes(handle)) {
		return getHandlePoint(node, handle);
	}
	return getBorderPoint(node, otherPoint);
}

function oppositeHandle(handle) {
	switch (handle) {
		case 'top':
			return 'bottom';
		case 'bottom':
			return 'top';
		case 'left':
			return 'right';
		case 'right':
			return 'left';
		default:
			return 'top';
	}
}

function getControlPoint(pos, dir, dist) {
	switch (dir) {
		case 'top':
			return { x: pos.x, y: pos.y - dist };
		case 'right':
			return { x: pos.x + dist, y: pos.y };
		case 'bottom':
			return { x: pos.x, y: pos.y + dist };
		case 'left':
			return { x: pos.x - dist, y: pos.y };
		default:
			return { x: pos.x, y: pos.y + dist };
	}
}

function getSmoothPath(source, target, sourcePosition = 'bottom', targetPosition = 'top') {
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const distance = Math.hypot(dx, dy);

	// Control-point distance scales with the node separation but stays bounded.
	// This prevents huge loops when nodes are close and keeps curves gentle when far.
	const minDist = 24;
	const maxDist = 160;
	const controlPointDistance = Math.max(minDist, Math.min(distance * 0.45, maxDist));

	const cp1 = getControlPoint(source, sourcePosition, controlPointDistance);
	const cp2 = getControlPoint(target, targetPosition, controlPointDistance);
	return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
}

function getStraightPath(source, target) {
	return `M ${source.x} ${source.y} L ${target.x} ${target.y}`;
}

function getSmoothPolyline(points) {
	if (points.length < 2) return '';
	if (points.length === 2) return getStraightPath(points[0], points[1]);
	const path = [`M ${points[0].x} ${points[0].y}`];
	const sub = (p1, p2) => ({ x: p1.x - p2.x, y: p1.y - p2.y });
	const add = (p1, p2) => ({ x: p1.x + p2.x, y: p1.y + p2.y });
	const mul = (p, s) => ({ x: p.x * s, y: p.y * s });
	const fullPoints = [points[0], ...points, points[points.length - 1]];
	for (let i = 1; i < fullPoints.length - 2; i++) {
		const p0 = fullPoints[i - 1];
		const p1 = fullPoints[i];
		const p2 = fullPoints[i + 1];
		const p3 = fullPoints[i + 2];
		const cp1 = add(p1, mul(sub(p2, p0), 1 / 6));
		const cp2 = sub(p2, mul(sub(p3, p1), 1 / 6));
		path.push(`C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${p2.x} ${p2.y}`);
	}
	return path.join(' ');
}

/**
 * Orthogonal (step) path that exits/enters from the correct sides.
 * Avoids crossing through node boxes when source/target are offset.
 */
function getOrthogonalPath(source, target, sourcePosition = 'bottom', targetPosition = 'top') {
	const offset = 24;
	const startExit = getControlPoint(source, sourcePosition, offset);
	const endEntry = getControlPoint(target, targetPosition, offset);

	const horizontalExit = sourcePosition === 'left' || sourcePosition === 'right';
	const horizontalEntry = targetPosition === 'left' || targetPosition === 'right';

	// Simple elbow routing based on exit/entry orientation
	if (horizontalExit && horizontalEntry) {
		const midX = (startExit.x + endEntry.x) / 2;
		return `M ${source.x} ${source.y} L ${startExit.x} ${startExit.y} L ${midX} ${startExit.y} L ${midX} ${endEntry.y} L ${endEntry.x} ${endEntry.y} L ${target.x} ${target.y}`;
	}
	if (!horizontalExit && !horizontalEntry) {
		const midY = (startExit.y + endEntry.y) / 2;
		return `M ${source.x} ${source.y} L ${startExit.x} ${startExit.y} L ${startExit.x} ${midY} L ${endEntry.x} ${midY} L ${endEntry.x} ${endEntry.y} L ${target.x} ${target.y}`;
	}
	if (horizontalExit && !horizontalEntry) {
		return `M ${source.x} ${source.y} L ${startExit.x} ${startExit.y} L ${endEntry.x} ${startExit.y} L ${endEntry.x} ${endEntry.y} L ${target.x} ${target.y}`;
	}
	// vertical exit → horizontal entry
	return `M ${source.x} ${source.y} L ${startExit.x} ${startExit.y} L ${startExit.x} ${endEntry.y} L ${endEntry.x} ${endEntry.y} L ${target.x} ${target.y}`;
}

/**
 * Midpoint along a cubic bezier (t=0.5) for label placement.
 */
function getBezierMidpoint(source, target, sourcePosition, targetPosition) {
	const distance = Math.hypot(target.x - source.x, target.y - source.y);
	const dist = Math.max(24, Math.min(distance * 0.45, 160));
	const cp1 = getControlPoint(source, sourcePosition, dist);
	const cp2 = getControlPoint(target, targetPosition, dist);
	const t = 0.5;
	const mt = 1 - t;
	return {
		x: mt * mt * mt * source.x + 3 * mt * mt * t * cp1.x + 3 * mt * t * t * cp2.x + t * t * t * target.x,
		y: mt * mt * mt * source.y + 3 * mt * mt * t * cp1.y + 3 * mt * t * t * cp2.y + t * t * t * target.y
	};
}

function getStraightMidpoint(source, target) {
	return { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 };
}

/**
 * Compute full edge geometry: anchors, path d, and label mid-point.
 */
function getEdgeGeometry(sourceNode, targetNode, edge = {}) {
	const sourceCenter = getNodeCenter(sourceNode);
	const targetCenter = getNodeCenter(targetNode);

	const sourceHandle = edge.sourceHandle || getBestHandle(sourceNode, targetCenter);
	const targetHandle = edge.targetHandle || getBestHandle(targetNode, sourceCenter);

	// Border anchors (slight pad so arrow tips don't bury into stroke).
	// For stick-figure shapes, anchor on the figure body instead of the bbox.
	const source =
		edge.sourceHandle
			? getHandlePoint(sourceNode, sourceHandle)
			: getShapeConnectionPoint(sourceNode, targetCenter, 0);
	const target =
		edge.targetHandle
			? getHandlePoint(targetNode, targetHandle)
			: getShapeConnectionPoint(targetNode, sourceCenter, 0);

	// Pull target slightly inward offset for arrowhead clearance.
	// Use a larger pad so the arrowhead doesn't visually bury into the shape stroke.
	const tdx = target.x - source.x;
	const tdy = target.y - source.y;
	const tlen = Math.hypot(tdx, tdy) || 1;
	const arrowPad = edge.markerEnd === 'none' ? 0 : 6;
	const targetPadded = {
		x: target.x - (tdx / tlen) * arrowPad,
		y: target.y - (tdy / tlen) * arrowPad
	};

	const type = edge.type || 'default';
	let path;
	let midPoint;

	if (edge.waypoints?.length) {
		const pts = [source, ...edge.waypoints, targetPadded];
		path =
			type === 'straight'
				? [`M ${source.x} ${source.y}`, ...edge.waypoints.map((p) => `L ${p.x} ${p.y}`), `L ${targetPadded.x} ${targetPadded.y}`].join(' ')
				: getSmoothPolyline(pts);
		const mid = pts[Math.floor(pts.length / 2)];
		midPoint = { x: mid.x, y: mid.y };
	} else if (type === 'step') {
		path = getOrthogonalPath(source, targetPadded, sourceHandle, targetHandle);
		midPoint = getStraightMidpoint(source, targetPadded);
	} else if (type === 'straight') {
		path = getStraightPath(source, targetPadded);
		midPoint = getStraightMidpoint(source, targetPadded);
	} else {
		path = getSmoothPath(source, targetPadded, sourceHandle, targetHandle);
		midPoint = getBezierMidpoint(source, targetPadded, sourceHandle, targetHandle);
	}

	return { source, target: targetPadded, sourceHandle, targetHandle, path, midPoint };
}

export {
	clamp,
	getBestHandle,
	getBezierMidpoint,
	getBorderPoint,
	getEdgeAnchor,
	getEdgeGeometry,
	getHandlePoint,
	getNodeCenter,
	getNodeSize,
	getOrthogonalPath,
	getSmoothPath,
	getSmoothPolyline,
	getStraightMidpoint,
	getStraightPath,
	oppositeHandle,
	screenToSVG,
	svgToScreen
};

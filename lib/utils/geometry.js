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
 * Pick the handle of `node` that is closest to `point`.
 * Useful during drag-to-connect so the edge lands on the side where
 * the user actually dropped.
 */
function getNearestHandle(node, point) {
	const { width, height } = getNodeSize(node);
	const localX = point.x - node.position.x;
	const localY = point.y - node.position.y;
	const dist = {
		top: Math.hypot(localX - width / 2, localY - 0),
		right: Math.hypot(localX - width, localY - height / 2),
		bottom: Math.hypot(localX - width / 2, localY - height),
		left: Math.hypot(localX - 0, localY - height / 2)
	};
	return Object.entries(dist).sort((a, b) => a[1] - b[1])[0][0];
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

function getSmoothPath(source, target, sourcePosition = 'bottom', targetPosition = 'top', bundle = { index: 0, total: 1 }) {
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const distance = Math.hypot(dx, dy);

	// Control-point distance scales with the node separation but stays bounded.
	// This prevents huge loops when nodes are close and keeps curves gentle when far.
	const minDist = 24;
	const maxDist = 160;
	const controlPointDistance = Math.max(minDist, Math.min(distance * 0.45, maxDist));

	let cp1 = getControlPoint(source, sourcePosition, controlPointDistance);

	// For the target control point, approach from the opposite of the entry side
	// so the curve flows naturally into the target handle.
	const entryDir = oppositeHandle(targetPosition);
	let cp2 = getControlPoint(target, entryDir, controlPointDistance);

	// Spread parallel edges (same source/target pair) so they don't overlap.
	if (bundle.total > 1) {
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const len = Math.hypot(dx, dy) || 1;
		// Perpendicular vector to the source->target direction
		const px = -dy / len;
		const py = dx / len;
		const spacing = 28;
		const offset = (bundle.index - (bundle.total - 1) / 2) * spacing;
		cp1 = { x: cp1.x + px * offset, y: cp1.y + py * offset };
		cp2 = { x: cp2.x + px * offset, y: cp2.y + py * offset };
	}

	// Clamp control points to avoid loops when nodes are close or misaligned.
	// The control point should not cross beyond the midpoint in the wrong direction.
	const midX = (source.x + target.x) / 2;
	const midY = (source.y + target.y) / 2;

	function clampControl(point, anchor, toward) {
		// If the control point goes past the anchor away from the target, pull it back.
		const px = point.x;
		const py = point.y;
		// Project control vector onto source->target direction
		const ax = anchor.x;
		const ay = anchor.y;
		const tx = toward.x;
		const ty = toward.y;
		const ddx = tx - ax;
		const ddy = ty - ay;
		const len = Math.hypot(ddx, ddy) || 1;
		const proj = ((px - ax) * ddx + (py - ay) * ddy) / len;
		if (proj < 0) {
			// Control point is behind the anchor, clamp to anchor
			return { x: ax, y: ay };
		}
		return point;
	}

	const clampedCp1 = clampControl(cp1, source, target);
	const clampedCp2 = clampControl(cp2, target, source);

	return `M ${source.x} ${source.y} C ${clampedCp1.x} ${clampedCp1.y}, ${clampedCp2.x} ${clampedCp2.y}, ${target.x} ${target.y}`;
}

function getStraightPath(source, target, bundle = { index: 0, total: 1 }) {
	let s = source;
	let t = target;

	// Spread parallel edges by offsetting the whole line perpendicular to itself.
	if (bundle.total > 1) {
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;
		const spacing = 14;
		const offset = (bundle.index - (bundle.total - 1) / 2) * spacing;
		s = { x: source.x + px * offset, y: source.y + py * offset };
		t = { x: target.x + px * offset, y: target.y + py * offset };
	}

	return `M ${s.x} ${s.y} L ${t.x} ${t.y}`;
}

/**
 * Build a straight polyline through a sequence of points.
 */
function getStraightPolyline(points) {
	if (points.length < 2) return '';
	return points.slice(1).reduce((d, p) => `${d} L ${p.x} ${p.y}`, `M ${points[0].x} ${points[0].y}`);
}

/**
 * Check if the line segment p1-p2 intersects an axis-aligned bounding box.
 * Also returns true if either endpoint is inside the box.
 */
function segmentIntersectsBBox(p1, p2, bbox) {
	if (p1.x >= bbox.left && p1.x <= bbox.right && p1.y >= bbox.top && p1.y <= bbox.bottom) return true;
	if (p2.x >= bbox.left && p2.x <= bbox.right && p2.y >= bbox.top && p2.y <= bbox.bottom) return true;

	const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
	const intersect = (a, b, c, d) => ccw(a, c, d) !== ccw(b, c, d) && ccw(a, b, c) !== ccw(a, b, d);

	const tl = { x: bbox.left, y: bbox.top };
	const tr = { x: bbox.right, y: bbox.top };
	const bl = { x: bbox.left, y: bbox.bottom };
	const br = { x: bbox.right, y: bbox.bottom };

	return intersect(p1, p2, tl, tr) || intersect(p1, p2, tr, br) || intersect(p1, p2, br, bl) || intersect(p1, p2, bl, tl);
}

/** Distance from point p to the rectangle bbox. */
function pointRectDistance(p, bbox) {
	const dx = Math.max(bbox.left - p.x, 0, p.x - bbox.right);
	const dy = Math.max(bbox.top - p.y, 0, p.y - bbox.bottom);
	return Math.hypot(dx, dy);
}

/** Check whether the segment p1-p2 is clear of all obstacles. */
function segmentIsClear(p1, p2, obstacles) {
	return !obstacles.some((obs) => segmentIntersectsBBox(p1, p2, obs));
}

/**
 * Find a short polyline path from p1 to p2 that avoids axis-aligned bounding boxes.
 * Uses a visibility-graph-like search over obstacle corners plus start/target.
 * Returns an array of intermediate waypoints (not including p1 and p2).
 */
function routeAroundObstacles(p1, p2, obstacles, depth = 0) {
	if (depth > 4 || obstacles.length === 0) return [];

	// Fast path: direct line is clear
	if (segmentIsClear(p1, p2, obstacles)) return [];

	// Build candidate points: obstacle corners plus small margins
	const candidates = [];
	for (const obs of obstacles) {
		const margin = 16;
		candidates.push(
			{ x: obs.left - margin, y: obs.top - margin },
			{ x: obs.right + margin, y: obs.top - margin },
			{ x: obs.left - margin, y: obs.bottom + margin },
			{ x: obs.right + margin, y: obs.bottom + margin }
		);
	}

	// A* over the visibility graph
	const start = p1;
	const goal = p2;
	const open = [{ point: start, g: 0, f: Math.hypot(start.x - goal.x, start.y - goal.y), parent: null }];
	const closed = new Map();
	const key = (p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;

	while (open.length > 0) {
		open.sort((a, b) => a.f - b.f);
		const current = open.shift();
		const k = key(current.point);
		if (closed.has(k)) continue;
		closed.set(k, current);

		if (current.point === goal || (Math.abs(current.point.x - goal.x) < 1 && Math.abs(current.point.y - goal.y) < 1)) {
			// Reconstruct path, excluding start and goal
			const waypoints = [];
			let node = current;
			while (node.parent) {
				// Don't include the goal point as a waypoint
				if (node.point !== goal) {
					waypoints.unshift(node.point);
				}
				node = node.parent;
			}
			return waypoints;
		}

		// Neighbors: goal and all candidate corners visible from current point
		const neighbors = [goal, ...candidates];
		for (const neighbor of neighbors) {
			if (current.point === neighbor) continue;
			if (!segmentIsClear(current.point, neighbor, obstacles)) continue;
			const g = current.g + Math.hypot(neighbor.x - current.point.x, neighbor.y - current.point.y);
			const h = Math.hypot(neighbor.x - goal.x, neighbor.y - goal.y);
			open.push({ point: neighbor, g, f: g + h, parent: current });
		}
	}

	// Fallback: route around the closest obstacle corner recursively
	let closest = null;
	let minDist = Infinity;
	for (const obs of obstacles) {
		const center = { x: (obs.left + obs.right) / 2, y: (obs.top + obs.bottom) / 2 };
		const dist = Math.hypot(p1.x - center.x, p1.y - center.y);
		if (dist < minDist) {
			minDist = dist;
			closest = obs;
		}
	}
	if (!closest) return [];
	const corners = [
		{ x: closest.left, y: closest.top },
		{ x: closest.right, y: closest.top },
		{ x: closest.left, y: closest.bottom },
		{ x: closest.right, y: closest.bottom }
	];
	let bestCorner = corners[0];
	let bestScore = Infinity;
	for (const c of corners) {
		const score = Math.hypot(p1.x - c.x, p1.y - c.y) + Math.hypot(c.x - p2.x, c.y - p2.y);
		if (score < bestScore) {
			bestScore = score;
			bestCorner = c;
		}
	}
	const left = routeAroundObstacles(p1, bestCorner, obstacles, depth + 1);
	const right = routeAroundObstacles(bestCorner, p2, obstacles, depth + 1);
	return [...left, bestCorner, ...right];
}

function getSmoothPolyline(points) {
	if (points.length < 2) return '';
	if (points.length === 2) return getStraightPath(points[0], points[1]);

	// Build a smooth cubic bezier spline through the points.
	// For each interior point we compute a tangent based on the previous and
	// next segments, then derive control points that keep the curve close to the
	// waypoint polyline without overshooting.
	const path = [`M ${points[0].x} ${points[0].y}`];
	const tension = 0.25;

	for (let i = 0; i < points.length - 1; i++) {
		const p0 = points[i === 0 ? 0 : i - 1];
		const p1 = points[i];
		const p2 = points[i + 1];
		const p3 = points[i + 2 >= points.length ? points.length - 1 : i + 2];

		const d1 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
		const d2 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
		const d3 = Math.hypot(p3.x - p2.x, p3.y - p2.y);

		// Tangent at p1: weighted average of incoming and outgoing segments.
		const t1x = d1 === 0 ? 0 : (p1.x - p0.x) / d1;
		const t1y = d1 === 0 ? 0 : (p1.y - p0.y) / d1;
		const t2x = d2 === 0 ? 0 : (p2.x - p1.x) / d2;
		const t2y = d2 === 0 ? 0 : (p2.y - p1.y) / d2;

		const tan1Len = d1 + d2;
		let tan1x = tan1Len === 0 ? 0 : (t1x * d2 + t2x * d1) / tan1Len;
		let tan1y = tan1Len === 0 ? 0 : (t1y * d2 + t2y * d1) / tan1Len;

		// Tangent at p2
		const t3x = d3 === 0 ? 0 : (p3.x - p2.x) / d3;
		const t3y = d3 === 0 ? 0 : (p3.y - p2.y) / d3;
		const tan2Len = d2 + d3;
		let tan2x = tan2Len === 0 ? 0 : (t2x * d3 + t3x * d2) / tan2Len;
		let tan2y = tan2Len === 0 ? 0 : (t2y * d3 + t3y * d2) / tan2Len;

		// Scale control-point arms by segment length, clamped to avoid overshoot.
		const arm1 = Math.min(d2 * tension, d2 * 0.5);
		const arm2 = Math.min(d2 * tension, d2 * 0.5);

		const cp1x = p1.x + tan1x * arm1;
		const cp1y = p1.y + tan1y * arm1;
		const cp2x = p2.x - tan2x * arm2;
		const cp2y = p2.y - tan2y * arm2;

		path.push(`C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x} ${p2.y}`);
	}

	return path.join(' ');
}

/**
 * Build an orthogonal (Manhattan) path through a sequence of points.
 * Each segment is either horizontal or vertical, with small rounded
 * corners where the direction changes.
 */
function buildOrthogonalPath(points, radius = 8) {
	if (points.length < 2) return '';

	// Convert input points into a sequence of axis-aligned segments.
	// We alternate horizontal/vertical directions so the path is truly orthogonal.
	const segments = [];
	for (let i = 0; i < points.length - 1; i++) {
		const a = points[i];
		const b = points[i + 1];
		const dx = b.x - a.x;
		const dy = b.y - a.y;

		if (i === 0) {
			// First segment: choose the longer axis as the initial direction
			segments.push({ from: { ...a }, to: { ...b }, dir: Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v' });
		} else {
			// Alternate direction from previous segment
			const prev = segments[segments.length - 1];
			const nextDir = prev.dir === 'h' ? 'v' : 'h';
			segments.push({ from: { ...a }, to: { ...b }, dir: nextDir });
		}
	}

	let d = `M ${points[0].x} ${points[0].y}`;
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		const next = segments[i + 1];

		if (!next) {
			// Last segment: draw to the final point
			if (seg.dir === 'h') {
				d += ` L ${seg.to.x} ${seg.from.y}`;
			} else {
				d += ` L ${seg.from.x} ${seg.to.y}`;
			}
			continue;
		}

		// Elbow point between this segment and the next
		const elbowX = seg.dir === 'h' ? seg.to.x : seg.from.x;
		const elbowY = seg.dir === 'h' ? seg.from.y : seg.to.y;
		const nextX = next.dir === 'h' ? next.to.x : elbowX;
		const nextY = next.dir === 'h' ? elbowY : next.to.y;

		const dx = nextX - elbowX;
		const dy = nextY - elbowY;
		const r = Math.min(radius, Math.max(0, Math.hypot(dx, dy) / 2));

		if (seg.dir === 'h') {
			// Horizontal then vertical
			const cornerX = elbowX + (dx > 0 ? -r : r);
			const cornerY = elbowY + (dy > 0 ? r : -r);
			d += ` L ${cornerX} ${elbowY}`;
			d += ` Q ${elbowX} ${elbowY} ${elbowX} ${cornerY}`;
		} else {
			// Vertical then horizontal
			const cornerX = elbowX + (dx > 0 ? r : -r);
			const cornerY = elbowY + (dy > 0 ? -r : r);
			d += ` L ${elbowX} ${cornerY}`;
			d += ` Q ${elbowX} ${elbowY} ${cornerX} ${elbowY}`;
		}
	}

	return d;
}

/**
 * Orthogonal (step) path that exits/enters from the correct sides.
 * Avoids crossing through node boxes when source/target are offset.
 * If waypoints are provided, routes through them orthogonally.
 */
function getOrthogonalPath(source, target, sourcePosition = 'bottom', targetPosition = 'top', waypoints = [], bundle = { index: 0, total: 1 }) {
	const offset = 24;
	const startExit = getControlPoint(source, sourcePosition, offset);
	const endEntry = getControlPoint(target, targetPosition, offset);

	// Spread parallel step edges by offsetting the intermediate waypoints
	// perpendicular to the overall source→target direction.
	let perpOffset = null;
	if (bundle.total > 1) {
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;
		const spacing = 14;
		perpOffset = { x: px * ((bundle.index - (bundle.total - 1) / 2) * spacing), y: py * ((bundle.index - (bundle.total - 1) / 2) * spacing) };
	}

	if (waypoints.length > 0) {
		const shiftedWaypoints = perpOffset ? waypoints.map((p) => ({ x: p.x + perpOffset.x, y: p.y + perpOffset.y })) : waypoints;
		return buildOrthogonalPath([source, startExit, ...shiftedWaypoints, endEntry, target]);
	}

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
function getBezierMidpoint(source, target, sourcePosition, targetPosition, bundle = { index: 0, total: 1 }) {
	const distance = Math.hypot(target.x - source.x, target.y - source.y);
	const dist = Math.max(24, Math.min(distance * 0.45, 160));
	let cp1 = getControlPoint(source, sourcePosition, dist);
	let cp2 = getControlPoint(target, oppositeHandle(targetPosition), dist);

	if (bundle.total > 1) {
		const dx = target.x - source.x;
		const dy = target.y - source.y;
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;
		const spacing = 28;
		const offset = (bundle.index - (bundle.total - 1) / 2) * spacing;
		cp1 = { x: cp1.x + px * offset, y: cp1.y + py * offset };
		cp2 = { x: cp2.x + px * offset, y: cp2.y + py * offset };
	}
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
/**
 * Compute bundle index/total for parallel edges between the same source/target pair.
 * Used to spread overlapping edges apart.
 */
function getEdgeBundleIndex(edges, edge) {
	const same = edges.filter((e) => e.source === edge.source && e.target === edge.target);
	const index = same.findIndex((e) => e.id === edge.id);
	return { index: index === -1 ? 0 : index, total: same.length };
}

function getEdgeGeometry(sourceNode, targetNode, edge = {}, bundle = { index: 0, total: 1 }, allNodes = []) {
	const sourceCenter = getNodeCenter(sourceNode);
	const targetCenter = getNodeCenter(targetNode);

	const sourceHandle = edge.sourceHandle || getBestHandle(sourceNode, targetCenter);
	const targetHandle = edge.targetHandle || getBestHandle(targetNode, sourceCenter);

	// Bundle offset for spreading parallel edges apart.
	const dx = targetCenter.x - sourceCenter.x;
	const dy = targetCenter.y - sourceCenter.y;
	const len = Math.hypot(dx, dy) || 1;
	const px = -dy / len;
	const py = dx / len;
	const spacing = 20;
	const offset = (bundle.index - (bundle.total - 1) / 2) * spacing;

	// For non-explicit handles, shift the aim point perpendicular to the edge direction
	// so border points spread along the node edge.
	const sourceAim = { x: targetCenter.x + px * offset, y: targetCenter.y + py * offset };
	const targetAim = { x: sourceCenter.x + px * offset, y: sourceCenter.y + py * offset };

	let source = edge.sourceHandle
		? getHandlePoint(sourceNode, sourceHandle)
		: getShapeConnectionPoint(sourceNode, sourceAim, 0);
	let target = edge.targetHandle
		? getHandlePoint(targetNode, targetHandle)
		: getShapeConnectionPoint(targetNode, targetAim, 0);

	// For explicit handles, slide the anchor along the node boundary so parallel
	// edges don't pile onto the same point.
	if (bundle.total > 1) {
		const sourceSize = getNodeSize(sourceNode);
		const targetSize = getNodeSize(targetNode);
		if (edge.sourceHandle) {
			if (sourceHandle === 'top' || sourceHandle === 'bottom') {
				source.x = clamp(source.x + offset, sourceNode.position.x, sourceNode.position.x + sourceSize.width);
			} else {
				source.y = clamp(source.y + offset, sourceNode.position.y, sourceNode.position.y + sourceSize.height);
			}
		}
		if (edge.targetHandle) {
			if (targetHandle === 'top' || targetHandle === "bottom") {
				target.x = clamp(target.x + offset, targetNode.position.x, targetNode.position.x + targetSize.width);
			} else {
				target.y = clamp(target.y + offset, targetNode.position.y, targetNode.position.y + targetSize.height);
			}
		}
	}

	// Nodes render on top of edges, so the arrow body inside the node is hidden
	// and the arrow tip sits exactly on the border.
	const targetPadded = target;

	const type = edge.type || 'default';

	// Automatic obstacle avoidance: if the direct path crosses another node,
	// generate intermediate waypoints that route around it.
	let currentWaypoints = edge.waypoints;
	if (!currentWaypoints?.length && allNodes.length > 0) {
		const padding = 28;
		const obstacles = allNodes
			.filter((n) => n.id !== sourceNode.id && n.id !== targetNode.id)
			.map((n) => {
				const size = getNodeSize(n);
				return {
					left: n.position.x - padding,
					top: n.position.y - padding,
					right: n.position.x + size.width + padding,
					bottom: n.position.y + size.height + padding
				};
			});
		const autoWaypoints = routeAroundObstacles(source, targetPadded, obstacles);
		if (autoWaypoints.length > 0) currentWaypoints = autoWaypoints;
	}

	let path;
	let midPoint;

	if (currentWaypoints?.length) {
		const pts = [source, ...currentWaypoints, targetPadded];
		if (type === 'straight') {
			path = getStraightPolyline(pts);
		} else if (type === 'step') {
			path = getOrthogonalPath(source, targetPadded, sourceHandle, targetHandle, currentWaypoints);
		} else {
			path = getSmoothPolyline(pts);
		}
		const mid = pts[Math.floor(pts.length / 2)];
		midPoint = { x: mid.x, y: mid.y };
	} else if (type === 'step') {
		path = getOrthogonalPath(source, targetPadded, sourceHandle, targetHandle, [], bundle);
		midPoint = getStraightMidpoint(source, targetPadded);
	} else if (type === 'straight') {
		path = getStraightPath(source, targetPadded, bundle);
		midPoint = getStraightMidpoint(source, targetPadded);
	} else {
		path = getSmoothPath(source, targetPadded, sourceHandle, targetHandle, bundle);
		midPoint = getBezierMidpoint(source, targetPadded, sourceHandle, targetHandle, bundle);
	}

	return { source, target: targetPadded, sourceHandle, targetHandle, path, midPoint };
}

export {
	clamp,
	getBestHandle,
	getBezierMidpoint,
	getBorderPoint,
	getEdgeAnchor,
	getEdgeBundleIndex,
	getEdgeGeometry,
	getHandlePoint,
	getNearestHandle,
	getNodeCenter,
	getNodeSize,
	getOrthogonalPath,
	getShapeConnectionPoint,
	getSmoothPath,
	getSmoothPolyline,
	getStraightMidpoint,
	getStraightPath,
	oppositeHandle,
	screenToSVG,
	svgToScreen
};

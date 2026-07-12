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
 * Get a point on the ellipse perimeter of a node in the direction of `toward`.
 * Used for circle/ellipse shapes so edges attach to the actual visual border.
 */
function getEllipseBorderPoint(node, toward, pad = 0) {
	const center = getNodeCenter(node);
	const { width, height } = getNodeSize(node);
	const rx = width / 2 + pad;
	const ry = height / 2 + pad;
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const angle = Math.atan2(dy, dx);
	return {
		x: center.x + rx * Math.cos(angle),
		y: center.y + ry * Math.sin(angle)
	};
}

/**
 * Get a point on the diamond (rhombus) perimeter in the direction of `toward`.
 * The rhombus has vertices at (±width/2, 0) and (0, ±height/2).
 */
function getDiamondBorderPoint(node, toward, pad = 0) {
	const center = getNodeCenter(node);
	const { width, height } = getNodeSize(node);
	const a = width / 2 + pad;
	const b = height / 2 + pad;
	const dx = toward.x - center.x;
	const dy = toward.y - center.y;
	const angle = Math.atan2(dy, dx);
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	// Distance to rhombus boundary along this ray: t = 1 / (|cos|/a + |sin|/b)
	const t = 1 / (Math.abs(cos) / a + Math.abs(sin) / b);
	return {
		x: center.x + t * cos,
		y: center.y + t * sin
	};
}

/**
 * Get a connection point on the node's visual shape facing toward `toward`.
 * For regular shapes this is the bounding-box border; for stick-figure shapes
 * it anchors on the figure body. Circle/ellipse and diamond shapes use their
 * actual perimeters so edges attach cleanly instead of at the bounding box.
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

	const CIRCLE_TYPES = new Set(['circle', 'ellipse', 'start', 'end']);
	const DIAMOND_TYPES = new Set(['diamond', 'decision']);
	if (CIRCLE_TYPES.has(node.type)) {
		return getEllipseBorderPoint(node, toward, pad);
	}
	if (DIAMOND_TYPES.has(node.type)) {
		return getDiamondBorderPoint(node, toward, pad);
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

	// Draw.io-style control points: exit/enter from the node side and pull
	// along the same axis. The control distance is based on the larger of the
	// horizontal/vertical gap, which keeps curves flat and avoids loops.
	const minDist = 24;
	const maxDist = 160;
	const axisDist = Math.max(Math.abs(dx), Math.abs(dy));
	const controlDist = Math.max(minDist, Math.min(axisDist * 0.5, maxDist));

	function controlPoint(pos, dir, dist) {
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

	let cp1 = controlPoint(source, sourcePosition, controlDist);
	let cp2 = controlPoint(target, targetPosition, controlDist);

	// Spread parallel edges (same source/target pair) so they don't overlap.
	if (bundle.total > 1) {
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;
		const spacing = 28;
		const offset = (bundle.index - (bundle.total - 1) / 2) * spacing;
		cp1 = { x: cp1.x + px * offset, y: cp1.y + py * offset };
		cp2 = { x: cp2.x + px * offset, y: cp2.y + py * offset };
	}

	return `M ${source.x} ${source.y} C ${cp1.x} ${cp1.y}, ${cp2.x} ${cp2.y}, ${target.x} ${target.y}`;
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
 * Redundant collinear intermediate points are removed so the path stays clean.
 */
function getStraightPolyline(points) {
	if (points.length < 2) return '';

	// Simplify collinear intermediate points. Normalize the cross product by
	// the distance between the endpoints so long segments are simplified too.
	const simplified = [points[0]];
	for (let i = 1; i < points.length - 1; i++) {
		const a = simplified[simplified.length - 1];
		const b = points[i];
		const c = points[i + 1];
		const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
		const dist = Math.hypot(c.x - a.x, c.y - a.y) || 1;
		if (Math.abs(cross) / dist < 0.8) {
			continue;
		}
		simplified.push(b);
	}
	simplified.push(points[points.length - 1]);

	return simplified.slice(1).reduce((d, p) => `${d} L ${p.x} ${p.y}`, `M ${simplified[0].x} ${simplified[0].y}`);
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
 *
 * When `orthogonal` is true, the search uses Manhattan distance and prefers
 * axis-aligned paths, which produces much cleaner waypoints for step edges.
 */
function routeAroundObstacles(p1, p2, obstacles, depth = 0, orthogonal = false, margin = 32) {
	if (depth > 4 || obstacles.length === 0) return [];

	// Fast path: direct line is clear
	if (segmentIsClear(p1, p2, obstacles)) return [];

	// Build candidate points: obstacle corners plus margins so the smoothed
	// curve has room to bend without clipping the obstacle. The margin can be
	// reduced to 0 for straight edges since they do not need extra bend room.
	const candidates = [];
	for (const obs of obstacles) {
		candidates.push(
			{ x: obs.left - margin, y: obs.top - margin },
			{ x: obs.right + margin, y: obs.top - margin },
			{ x: obs.left - margin, y: obs.bottom + margin },
			{ x: obs.right + margin, y: obs.bottom + margin }
		);
	}

	// Distance helpers
	const dist = (a, b) => (orthogonal ? Math.abs(a.x - b.x) + Math.abs(a.y - b.y) : Math.hypot(a.x - b.x, a.y - b.y));

	// A* over the visibility graph
	const start = p1;
	const goal = p2;
	const open = [{ point: start, g: 0, f: dist(start, goal), parent: null }];
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
			return simplifyWaypoints(waypoints, obstacles);
		}

		// Neighbors: goal and all candidate corners visible from current point
		const neighbors = [goal, ...candidates];
		for (const neighbor of neighbors) {
			if (current.point === neighbor) continue;
			if (!segmentIsClear(current.point, neighbor, obstacles)) continue;
			const g = current.g + dist(current.point, neighbor);
			const h = dist(neighbor, goal);
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
	const left = routeAroundObstacles(p1, bestCorner, obstacles, depth + 1, orthogonal);
	const right = routeAroundObstacles(bestCorner, p2, obstacles, depth + 1, orthogonal);
	return [...left, bestCorner, ...right];
}

/**
 * Simplify a polyline by removing intermediate waypoints that are visible
 * from the previous point. This removes zig-zags produced by A* and yields
 * longer, straighter corridors that are easier to smooth.
 */
function simplifyWaypoints(waypoints, obstacles) {
	if (waypoints.length < 3) return waypoints;

	const simplified = [waypoints[0]];
	let i = 0;
	while (i < waypoints.length - 1) {
		// Find the farthest point visible from the current point.
		let j = waypoints.length - 1;
		while (j > i && !segmentIsClear(waypoints[i], waypoints[j], obstacles)) {
			j--;
		}
		simplified.push(waypoints[j]);
		i = j;
	}

	return simplified;
}

/**
 * Build a smooth bezier path through a sequence of points by rounding
 * every interior corner. This keeps the curve inside the polyline corridor,
 * avoiding the loops and overshoot that unconstrained splines can create.
 */
function getSmoothPolyline(points, maxRadius = 32) {
	if (points.length < 2) return '';
	if (points.length === 2) return getStraightPath(points[0], points[1]);

	// Direction and length of each straight segment.
	const segments = [];
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i];
		const p2 = points[i + 1];
		const dx = p2.x - p1.x;
		const dy = p2.y - p1.y;
		const len = Math.hypot(dx, dy);
		segments.push({ dx, dy, len, p1, p2, ux: len === 0 ? 0 : dx / len, uy: len === 0 ? 0 : dy / len });
	}

	let d = `M ${points[0].x} ${points[0].y}`;

	for (let i = 1; i < points.length - 1; i++) {
		const prev = points[i - 1];
		const curr = points[i];
		const next = points[i + 1];

		const inSeg = segments[i - 1];
		const outSeg = segments[i];

		// Clamp corner radius to half of each adjacent segment so the curve
		// never leaves the corridor formed by the three points.
		const r = Math.min(maxRadius, inSeg.len / 2, outSeg.len / 2);

		if (r < 1) {
			// Segments are too short; just draw a straight line through the corner.
			d += ` L ${curr.x} ${curr.y}`;
			continue;
		}

		// Points just before and just after the corner.
		const before = {
			x: curr.x - inSeg.ux * r,
			y: curr.y - inSeg.uy * r
		};
		const after = {
			x: curr.x + outSeg.ux * r,
			y: curr.y + outSeg.uy * r
		};

		// Cubic control points pulled back from the corner for a smoother,
		// continuous bend than a single quadratic curve.
		const cp1 = {
			x: curr.x - inSeg.ux * (r * 0.45),
			y: curr.y - inSeg.uy * (r * 0.45)
		};
		const cp2 = {
			x: curr.x + outSeg.ux * (r * 0.45),
			y: curr.y + outSeg.uy * (r * 0.45)
		};

		d += ` L ${before.x.toFixed(2)} ${before.y.toFixed(2)}`;
		d += ` C ${cp1.x.toFixed(2)} ${cp1.y.toFixed(2)}, ${cp2.x.toFixed(2)} ${cp2.y.toFixed(2)}, ${after.x.toFixed(2)} ${after.y.toFixed(2)}`;
	}

	// Last segment: straight line to the final point.
	const last = points[points.length - 1];
	d += ` L ${last.x} ${last.y}`;

	return d;
}

/**
 * Find the point halfway along a polyline (by total length).
 * Used for placing edge labels accurately on routed paths.
 */
function getPolylineMidpoint(points) {
	if (points.length === 0) return { x: 0, y: 0 };
	if (points.length === 1) return { x: points[0].x, y: points[0].y };

	const lengths = [];
	let total = 0;
	for (let i = 0; i < points.length - 1; i++) {
		const len = Math.hypot(points[i + 1].x - points[i].x, points[i + 1].y - points[i].y);
		lengths.push(len);
		total += len;
	}

	if (total === 0) return { x: points[0].x, y: points[0].y };

	const target = total / 2;
	let accumulated = 0;
	for (let i = 0; i < lengths.length; i++) {
		const len = lengths[i];
		if (accumulated + len >= target) {
			const t = (target - accumulated) / len;
			const p1 = points[i];
			const p2 = points[i + 1];
			return {
				x: p1.x + (p2.x - p1.x) * t,
				y: p1.y + (p2.y - p1.y) * t
			};
		}
		accumulated += len;
	}

	return { x: points[points.length - 1].x, y: points[points.length - 1].y };
}

/**
 * Build an orthogonal (Manhattan) path through a sequence of points.
 * Each segment is either horizontal or vertical, with small rounded
 * corners where the direction changes.
 *
 * The path is built by:
 * 1. Converting diagonal segments into axis-aligned elbows segments.
 * 2. Choosing the elbow direction to continue the previous segment,
 *    which avoids unnecessary direction changes (zig-zags).
 * 3. Simplifying collinear intermediate points.
 */
function buildOrthogonalPath(points, radius = 8) {
	if (points.length < 2) return '';

	// Step 1: convert the polyline into an axis-aligned polyline.
	// For each diagonal segment, insert an elbow point. The elbow direction
	// is chosen to continue the previous segment's direction, minimizing bends.
	const ortho = [points[0]];
	for (let i = 1; i < points.length; i++) {
		const prev = ortho[ortho.length - 1];
		const curr = points[i];
		const dx = curr.x - prev.x;
		const dy = curr.y - prev.y;

		if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;

		const isDiagonal = Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5;

		if (!isDiagonal) {
			ortho.push(curr);
			continue;
		}

		// Choose elbow direction to continue the previous segment if possible.
		let horizontalFirst;
		if (ortho.length >= 2) {
			const p0 = ortho[ortho.length - 2];
			const prevDx = prev.x - p0.x;
			const prevDy = prev.y - p0.y;
			const wasHorizontal = Math.abs(prevDx) >= Math.abs(prevDy);
			horizontalFirst = wasHorizontal;
		} else {
			// First segment: prefer the axis with the larger delta.
			horizontalFirst = Math.abs(dx) >= Math.abs(dy);
		}

		if (horizontalFirst) {
			ortho.push({ x: curr.x, y: prev.y });
		} else {
			ortho.push({ x: prev.x, y: curr.y });
		}
		ortho.push(curr);
	}

	// Step 2: simplify collinear intermediate points.
	const simplified = [ortho[0]];
	for (let i = 1; i < ortho.length - 1; i++) {
		const a = simplified[simplified.length - 1];
		const b = ortho[i];
		const c = ortho[i + 1];
		const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
		if (Math.abs(cross) < 0.5) {
			// Points are collinear; skip the middle one.
			continue;
		}
		simplified.push(b);
	}
	if (ortho.length > 1) {
		simplified.push(ortho[ortho.length - 1]);
	}

	// Step 3: build the SVG path with rounded corners.
	if (simplified.length < 2) return '';

	let d = `M ${simplified[0].x} ${simplified[0].y}`;
	for (let i = 1; i < simplified.length; i++) {
		const prev = simplified[i - 1];
		const curr = simplified[i];
		const next = simplified[i + 1];

		if (!next) {
			// Last segment: draw straight to the final point.
			d += ` L ${curr.x} ${curr.y}`;
			continue;
		}

		const inDx = curr.x - prev.x;
		const inDy = curr.y - prev.y;
		const outDx = next.x - curr.x;
		const outDy = next.y - curr.y;

		const inHorizontal = Math.abs(inDx) > Math.abs(inDy);
		const outHorizontal = Math.abs(outDx) > Math.abs(outDy);

		if (inHorizontal === outHorizontal) {
			// No turn at this point.
			d += ` L ${curr.x} ${curr.y}`;
			continue;
		}

		// Rounded corner. Clamp radius to half of each adjacent segment.
		const r = Math.min(
			radius,
			Math.max(1, Math.abs(inDx) / 2),
			Math.max(1, Math.abs(inDy) / 2),
			Math.max(1, Math.abs(outDx) / 2),
			Math.max(1, Math.abs(outDy) / 2)
		);

		// Determine turn direction.
		const inRight = inDx > 0;
		const inDown = inDy > 0;
		const outRight = outDx > 0;
		const outDown = outDy > 0;

		if (inHorizontal && !outHorizontal) {
			// Horizontal in, vertical out.
			const beforeX = curr.x + (inRight ? -r : r);
			const afterY = curr.y + (outDown ? r : -r);
			d += ` L ${beforeX} ${curr.y}`;
			d += ` Q ${curr.x} ${curr.y} ${curr.x} ${afterY}`;
		} else if (!inHorizontal && outHorizontal) {
			// Vertical in, horizontal out.
			const beforeY = curr.y + (inDown ? -r : r);
			const afterX = curr.x + (outRight ? r : -r);
			d += ` L ${curr.x} ${beforeY}`;
			d += ` Q ${curr.x} ${curr.y} ${afterX} ${curr.y}`;
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
	let cp2 = getControlPoint(target, targetPosition, dist);

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

	// Nodes render on top of edges, so any part of a marker that falls inside
	// a shape would be hidden. Push both the source and target anchors outward
	// by the marker length (marker is 5 units wide, scaled by strokeWidth) plus
	// a tiny buffer so the entire marker stays outside the shape, even when the
	// edge is selected and its stroke width grows by 1px. A large buffer makes
	// the arrow look like it is floating, so keep it just large enough to avoid
	// clipping.
	const strokeWidth = edge.style?.strokeWidth || 2;
	const markerPad = 5 * strokeWidth + 3;
	const arrowPad = edge.markerEnd === 'none' ? 0 : markerPad;
	const startPad = edge.markerStart && edge.markerStart !== 'none' ? markerPad : 0;

	if (startPad > 0) {
		const sourceCenter = getNodeCenter(sourceNode);
		const dx = source.x - sourceCenter.x;
		const dy = source.y - sourceCenter.y;
		const len = Math.hypot(dx, dy) || 1;
		source = {
			x: source.x + (dx / len) * startPad,
			y: source.y + (dy / len) * startPad
		};
	}

	if (arrowPad > 0) {
		const targetCenter = getNodeCenter(targetNode);
		const dx = target.x - targetCenter.x;
		const dy = target.y - targetCenter.y;
		const len = Math.hypot(dx, dy) || 1;
		target = {
			x: target.x + (dx / len) * arrowPad,
			y: target.y + (dy / len) * arrowPad
		};
	}

	const targetPadded = target;

	const type = edge.type || 'default';

	// Automatic obstacle avoidance: if the direct path crosses another node,
	// generate intermediate waypoints that route around it.
	// For step edges we use Manhattan-distance routing to keep waypoints grid-aligned.
	let currentWaypoints = edge.waypoints;
	// Routing endpoints may be shifted (e.g. for bundle offset) and should be
	// reused when building the final path so waypoints and endpoints line up.
	let routeStart = source;
	let routeGoal = targetPadded;
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

		// For straight edges, route directly from source to target so the path
		// doesn't pick up artificial orthogonal exit/entry steps. For bezier
		// and step edges, use the control-point offsets to keep curves smooth.
		routeStart = source;
		routeGoal = targetPadded;
		if (type !== 'straight') {
			const offset = 24;
			routeStart = getControlPoint(source, sourceHandle, offset);
			routeGoal = getControlPoint(targetPadded, targetHandle, offset);
		}

		// Apply bundle offset to the routing endpoints so parallel straight edges
		// route around obstacles independently instead of overlapping.
		if (type === 'straight' && bundle.total > 1) {
			const spacing = 14;
			const offset = (bundle.index - (bundle.total - 1) / 2) * spacing;
			const dx = targetPadded.x - source.x;
			const dy = targetPadded.y - source.y;
			const len = Math.hypot(dx, dy) || 1;
			const px = -dy / len;
			const py = dx / len;
			routeStart = { x: routeStart.x + px * offset, y: routeStart.y + py * offset };
			routeGoal = { x: routeGoal.x + px * offset, y: routeGoal.y + py * offset };
		}

		const autoWaypoints = routeAroundObstacles(routeStart, routeGoal, obstacles, 0, type === 'step', type === 'straight' ? 0 : 32);
		if (autoWaypoints.length > 0) currentWaypoints = autoWaypoints;
	}

	let path;
	let midPoint;

	if (currentWaypoints?.length) {
		let pts;
		if (type === 'straight') {
			// Reuse the same routing endpoints so waypoints line up with the
			// endpoints used during obstacle avoidance (including bundle offset).
			pts = [routeStart, ...currentWaypoints, routeGoal];
			path = getStraightPolyline(pts);
		} else if (type === 'step') {
			path = getOrthogonalPath(source, targetPadded, sourceHandle, targetHandle, currentWaypoints);
			pts = [source, ...currentWaypoints, targetPadded];
		} else {
			pts = [source, ...currentWaypoints, targetPadded];
			path = getSmoothPolyline(pts);
		}
		midPoint = getPolylineMidpoint(pts);
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

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

/**
 * Module-level cache for A* obstacle-avoidance results.
 * Keyed by a hash of the source/target routing endpoints + obstacle layout.
 * Avoids recomputing the (relatively expensive) A* pass on every render —
 * it only reruns when an endpoint or an obstacle actually moves.
 */
const _routeCache = new Map();
const ROUTE_CACHE_MAX = 500;

function hashRoute(routeStart, routeGoal, obstacles) {
	let h = `${routeStart.x.toFixed(1)},${routeStart.y.toFixed(1)}|${routeGoal.x.toFixed(1)},${routeGoal.y.toFixed(1)}|`;
	for (const o of obstacles) {
		h += `${o.left},${o.top},${o.right},${o.bottom};`;
	}
	return h;
}

function getCachedRoute(routeStart, routeGoal, obstacles, orthogonal, maxRadius) {
	const key = hashRoute(routeStart, routeGoal, obstacles);
	const cached = _routeCache.get(key);
	if (cached) return cached;
	const result = orthogonal
		? routeOrthogonalGrid(routeStart, routeGoal, obstacles, maxRadius)
		: routeAroundObstacles(routeStart, routeGoal, obstacles, 0, false, maxRadius);
	if (_routeCache.size >= ROUTE_CACHE_MAX) _routeCache.clear();
	_routeCache.set(key, result);
	return result;
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

	// draw.io-style control points: a SHORT, FIXED exit/entry distance (not
	// proportional to the gap). This keeps the curve flat and predictable — the
	// line leaves the node perpendicular to its side and eases into the target,
	// instead of bowing into a huge arc when nodes are far apart.
	const minDist = 20;
	const maxDist = 60;
	const axisDist = Math.max(Math.abs(dx), Math.abs(dy));
	const controlDist = Math.max(minDist, Math.min(axisDist * 0.35, maxDist));

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
		const spacing = 24;
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
 * Orthogonal (Manhattan) grid-based A* router.
 *
 * Instead of routing through a diagonal visibility graph (whose waypoints
 * produce obstacle crossings when converted to axis-aligned segments), this
 * builds a grid of horizontal/vertical scan lines from obstacle edges and
 * runs A* over axis-aligned connections only.  The result is a clean
 * right-angle path that never clips through obstacles.
 */
function routeOrthogonalGrid(start, goal, obstacles, margin = 6) {
	if (obstacles.length === 0) return [];

	// Fast path: direct line is clear.
	if (segmentIsClear(start, goal, obstacles)) return [];

	// Fast path: simple L-bend.
	const bend1 = { x: goal.x, y: start.y };
	if (segmentIsClear(start, bend1, obstacles) && segmentIsClear(bend1, goal, obstacles)) {
		return [bend1];
	}
	const bend2 = { x: start.x, y: goal.y };
	if (segmentIsClear(start, bend2, obstacles) && segmentIsClear(bend2, goal, obstacles)) {
		return [bend2];
	}

	// ---- Build scan-line grid ----
	const xSet = new Set();
	const ySet = new Set();
	xSet.add(start.x);
	xSet.add(goal.x);
	ySet.add(start.y);
	ySet.add(goal.y);
	for (const obs of obstacles) {
		xSet.add(obs.left - margin);
		xSet.add(obs.right + margin);
		ySet.add(obs.top - margin);
		ySet.add(obs.bottom + margin);
	}
	const xs = [...xSet].sort((a, b) => a - b);
	const ys = [...ySet].sort((a, b) => a - b);

	// Grid points at every scan-line intersection, skipping those inside obstacles.
	const pts = [];
	const pIdx = new Map();
	const pk = (x, y) => `${x.toFixed(1)},${y.toFixed(1)}`;
	const isBlocked = (x, y) => obstacles.some((o) => x > o.left && x < o.right && y > o.top && y < o.bottom);

	for (const x of xs) {
		for (const y of ys) {
			if (isBlocked(x, y)) continue;
			pIdx.set(pk(x, y), pts.length);
			pts.push({ x, y });
		}
	}

	const si = pIdx.get(pk(start.x, start.y));
	const gi = pIdx.get(pk(goal.x, goal.y));
	if (si === undefined || gi === undefined) return [];

	// ---- Adjacency: neighbouring points on the same scan line ----
	const byX = new Map();
	const byY = new Map();
	for (let i = 0; i < pts.length; i++) {
		const xk = pts[i].x.toFixed(1);
		const yk = pts[i].y.toFixed(1);
		if (!byX.has(xk)) byX.set(xk, []);
		if (!byY.has(yk)) byY.set(yk, []);
		byX.get(xk).push(i);
		byY.get(yk).push(i);
	}

	const adj = Array.from({ length: pts.length }, () => []);
	for (const [, col] of byX) {
		col.sort((a, b) => pts[a].y - pts[b].y);
		for (let j = 0; j < col.length - 1; j++) {
			const a = col[j], b = col[j + 1];
			if (segmentIsClear(pts[a], pts[b], obstacles)) {
				const d = Math.abs(pts[b].y - pts[a].y);
				adj[a].push({ to: b, cost: d });
				adj[b].push({ to: a, cost: d });
			}
		}
	}
	for (const [, row] of byY) {
		row.sort((a, b) => pts[a].x - pts[b].x);
		for (let j = 0; j < row.length - 1; j++) {
			const a = row[j], b = row[j + 1];
			if (segmentIsClear(pts[a], pts[b], obstacles)) {
				const d = Math.abs(pts[b].x - pts[a].x);
				adj[a].push({ to: b, cost: d });
				adj[b].push({ to: a, cost: d });
			}
		}
	}

	// ---- A* with Manhattan heuristic ----
	const h = (i) => Math.abs(pts[i].x - pts[gi].x) + Math.abs(pts[i].y - pts[gi].y);
	const gCost = new Array(pts.length).fill(Infinity);
	const parent = new Int32Array(pts.length).fill(-1);
	gCost[si] = 0;
	const open = [{ i: si, f: h(si) }];
	const closed = new Uint8Array(pts.length);

	while (open.length > 0) {
		// Pop cheapest (linear scan — faster than sort for small grids).
		let best = 0;
		for (let j = 1; j < open.length; j++) {
			if (open[j].f < open[best].f) best = j;
		}
		const cur = open[best];
		open[best] = open[open.length - 1];
		open.pop();

		if (closed[cur.i]) continue;
		closed[cur.i] = 1;

		if (cur.i === gi) {
			// Reconstruct full path.
			const raw = [];
			let n = gi;
			while (n !== -1) {
				raw.unshift(pts[n]);
				n = parent[n];
			}
			// Return only corner waypoints (where direction changes),
			// excluding start and goal.
			const corners = [];
			for (let j = 1; j < raw.length - 1; j++) {
				const p = raw[j - 1], c = raw[j], nx = raw[j + 1];
				const inH = Math.abs(c.x - p.x) > 0.5;
				const outH = Math.abs(nx.x - c.x) > 0.5;
				if (inH !== outH) corners.push(c);
			}
			return corners;
		}

		for (const { to, cost } of adj[cur.i]) {
			if (closed[to]) continue;
			const ng = gCost[cur.i] + cost;
			if (ng < gCost[to]) {
				gCost[to] = ng;
				parent[to] = cur.i;
				open.push({ i: to, f: ng + h(to) });
			}
		}
	}

	return []; // No path found; fall back to simple elbow.
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

	// Build intermediate elbow points based on exit/entry orientation,
	// then route through buildOrthogonalPath for proper rounded corners.
	let elbowPoints;
	if (horizontalExit && horizontalEntry) {
		const midX = (startExit.x + endEntry.x) / 2;
		let mx = perpOffset ? midX + perpOffset.x : midX;
		elbowPoints = [source, startExit, { x: mx, y: startExit.y }, { x: mx, y: endEntry.y }, endEntry, target];
	} else if (!horizontalExit && !horizontalEntry) {
		const midY = (startExit.y + endEntry.y) / 2;
		let my = perpOffset ? midY + perpOffset.y : midY;
		elbowPoints = [source, startExit, { x: startExit.x, y: my }, { x: endEntry.x, y: my }, endEntry, target];
	} else if (horizontalExit && !horizontalEntry) {
		elbowPoints = [source, startExit, { x: endEntry.x, y: startExit.y }, endEntry, target];
	} else {
		// vertical exit → horizontal entry
		elbowPoints = [source, startExit, { x: startExit.x, y: endEntry.y }, endEntry, target];
	}

	return buildOrthogonalPath(elbowPoints);
}

/**
 * Midpoint along a cubic bezier (t=0.5) for label placement.
 */
function getBezierMidpoint(source, target, sourcePosition, targetPosition, bundle = { index: 0, total: 1 }) {
	const dx = target.x - source.x;
	const dy = target.y - source.y;
	const axisDist = Math.max(Math.abs(dx), Math.abs(dy));
	const dist = Math.max(20, Math.min(axisDist * 0.35, 60));
	let cp1 = getControlPoint(source, sourcePosition, dist);
	let cp2 = getControlPoint(target, targetPosition, dist);

	if (bundle.total > 1) {
		const len = Math.hypot(dx, dy) || 1;
		const px = -dy / len;
		const py = dx / len;
		const spacing = 24;
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

/** Perimeter functions (draw.io mxPerimeter style).
 *  Given a node and a direction we want to aim toward, return the point on the
 *  node's ACTUAL visual outline (not just the bounding box) where an edge should
 *  attach. This keeps curved edges from piercing ellipses/diamonds/triangles.
 */
function getShapePerimeterPoint(node, aim, pad = 0) {
	const { width, height } = getNodeSize(node);
	const center = getNodeCenter(node);
	const hw = width / 2 + pad;
	const hh = height / 2 + pad;
	const dx = aim.x - center.x;
	const dy = aim.y - center.y;

	// Fallback: bounding-box border (rectangles).
	const rectPoint = getBorderPoint(node, aim, pad);

	switch (node.type) {
		case 'ellipse':
		case 'circle':
		case 'start-event':
		case 'end-event':
		case 'intermediate-event':
		case 'attribute':
		case 'interface':
		case 'usecase':
		case 'connector': {
			// Ray–ellipse intersection: x²/a² + y²/b² = 1
			if (dx === 0 && dy === 0) return { x: center.x, y: center.y - hh };
			const a = hw;
			const b = hh;
			// Direction unit vector
			const len = Math.hypot(dx, dy);
			const ux = dx / len;
			const uy = dy / len;
			// Solve (t*ux)²/a² + (t*uy)²/b² = 1  →  t = 1/sqrt((ux/a)²+(uy/b)²)
			const t = 1 / Math.sqrt((ux * ux) / (a * a) + (uy * uy) / (b * b));
			return { x: center.x + ux * t, y: center.y + uy * t };
		}
		case 'diamond':
		case 'decision':
		case 'relationship':
		case 'gateway': {
			// Diamond edges: top(cx,0) right(w,cy) bottom(cx,h) left(0,cy)
			// Intersect ray center→aim with the 4 diamond sides.
			const pts = [
				{ x: center.x, y: center.y - hh },
				{ x: center.x + hw, y: center.y },
				{ x: center.x, y: center.y + hh },
				{ x: center.x - hw, y: center.y }
			];
			const hit = rayPolygonIntersection(center, aim, pts);
			return hit || rectPoint;
		}
		case 'triangle': {
			const pts = [
				{ x: center.x, y: center.y - hh },
				{ x: center.x + hw, y: center.y + hh },
				{ x: center.x - hw, y: center.y + hh }
			];
			const hit = rayPolygonIntersection(center, aim, pts);
			return hit || rectPoint;
		}
		case 'hexagon':
		case 'preparation': {
			const pts = [
				{ x: center.x - hw * 0.5, y: center.y - hh },
				{ x: center.x + hw * 0.5, y: center.y - hh },
				{ x: center.x + hw, y: center.y },
				{ x: center.x + hw * 0.5, y: center.y + hh },
				{ x: center.x - hw * 0.5, y: center.y + hh },
				{ x: center.x - hw, y: center.y }
			];
			const hit = rayPolygonIntersection(center, aim, pts);
			return hit || rectPoint;
		}
		case 'octagon': {
			const ox = Math.min(width, height) * 0.3 + pad;
			const pts = [
				{ x: center.x - hw + ox, y: center.y - hh },
				{ x: center.x + hw - ox, y: center.y - hh },
				{ x: center.x + hw, y: center.y - hh + ox },
				{ x: center.x + hw, y: center.y + hh - ox },
				{ x: center.x + hw - ox, y: center.y + hh },
				{ x: center.x - hw + ox, y: center.y + hh },
				{ x: center.x - hw, y: center.y + hh - ox },
				{ x: center.x - hw, y: center.y - hh + ox }
			];
			const hit = rayPolygonIntersection(center, aim, pts);
			return hit || rectPoint;
		}
		case 'parallelogram':
		case 'input-output': {
			const p = width * 0.2;
			const pts = [
				{ x: center.x - hw + p, y: center.y - hh },
				{ x: center.x + hw, y: center.y - hh },
				{ x: center.x + hw - p, y: center.y + hh },
				{ x: center.x - hw, y: center.y + hh }
			];
			const hit = rayPolygonIntersection(center, aim, pts);
			return hit || rectPoint;
		}
		case 'trapezoid':
		case 'manual-operation': {
			const t = width * 0.2;
			const pts = [
				{ x: center.x - hw + t, y: center.y - hh },
				{ x: center.x + hw - t, y: center.y - hh },
				{ x: center.x + hw, y: center.y + hh },
				{ x: center.x - hw, y: center.y + hh }
			];
			const hit = rayPolygonIntersection(center, aim, pts);
			return hit || rectPoint;
		}
		default:
			return rectPoint;
	}
}

/** Intersect the ray from `origin` toward `aim` with a convex polygon.
 *  Returns the first intersection point, or null if none.
 */
function rayPolygonIntersection(origin, aim, polygon) {
	const dx = aim.x - origin.x;
	const dy = aim.y - origin.y;
	let best = null;
	let bestT = Infinity;
	for (let i = 0; i < polygon.length; i++) {
		const a = polygon[i];
		const b = polygon[(i + 1) % polygon.length];
		// Solve origin + t*(dx,dy) = a + s*(b-a), 0<=s<=1, t>=0
		const ex = b.x - a.x;
		const ey = b.y - a.y;
		const denom = dx * ey - dy * ex;
		if (Math.abs(denom) < 1e-9) continue;
		const t = ((a.x - origin.x) * ey - (a.y - origin.y) * ex) / denom;
		const s = ((a.x - origin.x) * dy - (a.y - origin.y) * dx) / denom;
		if (t >= 0 && s >= 0 && s <= 1 && t < bestT) {
			bestT = t;
			best = { x: origin.x + dx * t, y: origin.y + dy * t };
		}
	}
	return best;
}

/** Compute stable edge anchors (draw.io connection-constraint style).
 *  - If an explicit handle is set, pin the anchor to that side's fixed point.
 *  - Otherwise auto-pick the best side but keep it STABLE per render by aiming at
 *    the OTHER endpoint's current anchor (not recomputed from center each time).
 */
function getStableEdgeAnchors(sourceNode, targetNode, edge, bundle) {
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

	// Aim points: for explicit handles the aim is irrelevant (pinned); for
	// auto handles, aim across at the other node's center shifted by bundle offset
	// so parallel edges leave from different points along the side.
	const sourceAim = { x: targetCenter.x + px * offset, y: targetCenter.y + py * offset };
	const targetAim = { x: sourceCenter.x + px * offset, y: sourceCenter.y + py * offset };

	let source;
	let target;

	if (edge.sourceHandle) {
		// Pinned: use the exact handle point (no perimeter recompute).
		source = getHandlePoint(sourceNode, sourceHandle);
	} else if (STROKE_FIGURE_TYPES.has(sourceNode.type)) {
		source = getShapeConnectionPoint(sourceNode, sourceAim, 0);
	} else {
		source = getShapePerimeterPoint(sourceNode, sourceAim, 0);
	}

	if (edge.targetHandle) {
		target = getHandlePoint(targetNode, targetHandle);
	} else if (STROKE_FIGURE_TYPES.has(targetNode.type)) {
		target = getShapeConnectionPoint(targetNode, targetAim, 0);
	} else {
		target = getShapePerimeterPoint(targetNode, targetAim, 0);
	}

	// Spread parallel edges along the boundary when both ends use explicit handles.
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
			if (targetHandle === 'top' || targetHandle === 'bottom') {
				target.x = clamp(target.x + offset, targetNode.position.x, targetNode.position.x + targetSize.width);
			} else {
				target.y = clamp(target.y + offset, targetNode.position.y, targetNode.position.y + targetSize.height);
			}
		}
	}

	return { source, target, sourceHandle, targetHandle };
}

function getEdgeGeometry(sourceNode, targetNode, edge = {}, bundle = { index: 0, total: 1 }, allNodes = []) {
	const sourceCenter = getNodeCenter(sourceNode);
	const targetCenter = getNodeCenter(targetNode);

	// Self-loop: edge connects a node to itself (draw.io "loop" style).
	// Route a smooth arc that leaves the right side, bows out, and re-enters
	// the bottom so it never collapses to a zero-length line.
	if (sourceNode.id === targetNode.id) {
		const { width, height } = getNodeSize(sourceNode);
		const right = { x: sourceNode.position.x + width, y: sourceNode.position.y + height / 2 };
		const bottom = { x: sourceNode.position.x + width / 2, y: sourceNode.position.y + height };
		const loopSize = Math.max(40, Math.min(width, height) * 0.8);
		const c1 = { x: right.x + loopSize, y: right.y };
		const c2 = { x: bottom.x, y: bottom.y + loopSize };
		const path = `M ${right.x} ${right.y} C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${bottom.x} ${bottom.y}`;
		const midPoint = { x: right.x + loopSize * 0.6, y: bottom.y + loopSize * 0.6 };
		return {
			source: right,
			target: bottom,
			sourceHandle: 'right',
			targetHandle: 'bottom',
			path,
			midPoint
		};
	}

	const { source: srcInit, target: tgtInit, sourceHandle, targetHandle } = getStableEdgeAnchors(sourceNode, targetNode, edge, bundle);
	let source = srcInit;
	let target = tgtInit;

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

	// Obstacle avoidance (A*) is only useful for orthogonal/step edges, where
	// the path is supposed to hug a grid and detour around boxes. For default
	// (bezier) and straight edges we route directly between anchors — running
	// A* on them produced random curved detours that looked broken. This matches
	// draw.io, where orthogonal routing is the only mode that bends around shapes.
	let currentWaypoints = edge.waypoints;
	let routeStart = source;
	let routeGoal = targetPadded;
	if (type === 'step' && allNodes.length > 0) {
		// For step edges only: route around obstacles.
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

		routeStart = source;
		routeGoal = targetPadded;
		const offset = 24;
		routeStart = getControlPoint(source, sourceHandle, offset);
		routeGoal = getControlPoint(targetPadded, targetHandle, offset);

		// Apply bundle offset to the routing endpoints so parallel straight edges
		// route around obstacles independently instead of overlapping.
		if (bundle.total > 1) {
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

		const autoWaypoints = getCachedRoute(routeStart, routeGoal, obstacles, true, 32);
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
		const offset = 24;
		const startExit = getControlPoint(source, sourceHandle, offset);
		const endEntry = getControlPoint(targetPadded, targetHandle, offset);
		const horizontalExit = sourceHandle === 'left' || sourceHandle === 'right';
		const horizontalEntry = targetHandle === 'left' || targetHandle === 'right';
		let elbowPts;
		if (horizontalExit && horizontalEntry) {
			const mx = (startExit.x + endEntry.x) / 2;
			elbowPts = [source, startExit, { x: mx, y: startExit.y }, { x: mx, y: endEntry.y }, endEntry, targetPadded];
		} else if (!horizontalExit && !horizontalEntry) {
			const my = (startExit.y + endEntry.y) / 2;
			elbowPts = [source, startExit, { x: startExit.x, y: my }, { x: endEntry.x, y: my }, endEntry, targetPadded];
		} else if (horizontalExit && !horizontalEntry) {
			elbowPts = [source, startExit, { x: endEntry.x, y: startExit.y }, endEntry, targetPadded];
		} else {
			elbowPts = [source, startExit, { x: startExit.x, y: endEntry.y }, endEntry, targetPadded];
		}
		path = getOrthogonalPath(source, targetPadded, sourceHandle, targetHandle, [], bundle);
		midPoint = getPolylineMidpoint(elbowPts);
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
	getShapePerimeterPoint,
	getSmoothPath,
	getSmoothPolyline,
	getStraightMidpoint,
	getStraightPath,
	oppositeHandle,
	screenToSVG,
	svgToScreen
};

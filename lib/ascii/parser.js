export function parseAscii(text) {
	if (!text || text.trim() === '') return { nodes: [], edges: [] };

	const lines = text.replace(/\r/g, '').split('\n');
	const height = lines.length;
	const width = lines.reduce((max, line) => Math.max(max, line.length), 0);
	const grid = lines.map((line) => line.padEnd(width, ' ').split(''));

	function getChar(x, y) {
		if (y < 0 || y >= height || x < 0 || x >= width) return ' ';
		return grid[y][x];
	}

	function isHorizontalBorderChar(c) {
		return c === '-' || c === '+' || c === '=';
	}

	function isVerticalBorderChar(c) {
		return c === '|' || c === '+';
	}

	function isConnectorChar(c) {
		return ['-', '|', '+', '>', '<', '^', 'v', 'V'].includes(c);
	}

	function isInsideNode(node, x, y) {
		return x > node.x && x < node.x + node.w - 1 && y > node.y && y < node.y + node.h - 1;
	}

	function detectNodeType(node) {
		if (/\?$/.test(node.label)) return 'decision';
		return 'process';
	}

	// Find a box starting at (startX, startY).
	// Uses the CONTENT row to determine the right edge, with tolerance for
	// border '+' being ±1 position away from the content '|'.
	function findBox(startX, startY) {
		// Quick checks: must have '-' to the right on border, and '|' below on content
		if (!isHorizontalBorderChar(getChar(startX + 1, startY))) return null;
		if (getChar(startX, startY + 1) !== '|') return null;

		// Find the right '|' in the first content row.
		// Only accept it if there's a '+' on the top border at or near that position.
		let contentRight = -1;
		for (let x = startX + 2; x < Math.min(startX + 120, width); x++) {
			if (getChar(x, startY + 1) === '|') {
				// Check if there's a '+' near this column on the top border row
				for (let dx = -1; dx <= 1; dx++) {
					if (getChar(x + dx, startY) === '+') {
						contentRight = x;
						break;
					}
				}
				if (contentRight !== -1) break;
			}
		}
		if (contentRight === -1) return null;

		// Find bottom border '+' on the left edge
		let bottomY = -1;
		for (let y = startY + 2; y < height; y++) {
			const c = getChar(startX, y);
			if (c === '+') { bottomY = y; break; }
			if (c !== '|') break;
		}
		if (bottomY === -1) return null;

		// Verify that a '+' exists near contentRight on the top border
		let topRightPlus = -1;
		for (let dx = -1; dx <= 1; dx++) {
			if (getChar(contentRight + dx, startY) === '+') {
				topRightPlus = contentRight + dx;
				break;
			}
		}
		if (topRightPlus === -1) return null;

		// Verify that a '+' exists near contentRight on the bottom border
		let bottomRightPlus = -1;
		for (let dx = -1; dx <= 1; dx++) {
			if (getChar(contentRight + dx, bottomY) === '+') {
				bottomRightPlus = contentRight + dx;
				break;
			}
		}
		if (bottomRightPlus === -1) return null;

		// Verify top border between startX+1 and topRightPlus
		for (let x = startX + 1; x < topRightPlus; x++) {
			if (!isHorizontalBorderChar(getChar(x, startY))) return null;
		}

		// Verify bottom border between startX+1 and bottomRightPlus
		for (let x = startX + 1; x < bottomRightPlus; x++) {
			if (!isHorizontalBorderChar(getChar(x, bottomY))) return null;
		}

		// Verify all content rows have '|' on both left and right sides
		for (let y = startY + 1; y < bottomY; y++) {
			if (getChar(startX, y) !== '|') return null;
			if (getChar(contentRight, y) !== '|') return null;
		}

		// Extract label from the interior
		let label = '';
		for (let y = startY + 1; y < bottomY; y++) {
			let rowText = '';
			for (let x = startX + 1; x < contentRight; x++) {
				const ch = getChar(x, y);
				rowText += ch;
			}
			if (rowText.trim()) label += `${rowText.trim()} `;
		}
		label = label.trim() || 'Node';

		const actualRight = Math.max(topRightPlus, bottomRightPlus, contentRight);
		return {
			x: startX,
			y: startY,
			w: actualRight - startX + 1,
			h: bottomY - startY + 1,
			label,
			id: `n_${startX}_${startY}`
		};
	}

	// 1. Find all nodes (boxes)
	const rawNodes = [];
	const visitedTopLeft = new Set();

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (getChar(x, y) !== '+') continue;
			if (visitedTopLeft.has(`${x},${y}`)) continue;

			const box = findBox(x, y);
			if (!box) continue;

			rawNodes.push(box);
			visitedTopLeft.add(`${box.x},${box.y}`);
		}
	}

	// Remove boxes that are fully contained inside larger boxes
	const nodes = rawNodes.filter((node) => !rawNodes.some((other) => (
		other.id !== node.id &&
		node.x >= other.x &&
		node.y >= other.y &&
		node.x + node.w <= other.x + other.w &&
		node.y + node.h <= other.y + other.h &&
		(other.w > node.w || other.h > node.h)
	)));

	// 2. Build lookup
	function nodeHitTest(x, y) {
		return nodes.find((node) => x >= node.x && x < node.x + node.w && y >= node.y && y < node.y + node.h) || null;
	}

	// BFS trace backwards from a connector to find source node
	function traceSourceNode(fromX, fromY, targetNode) {
		const queue = [{ x: fromX, y: fromY }];
		const visited = new Set([`${fromX},${fromY}`]);

		while (queue.length > 0 && visited.size < 500) {
			const current = queue.shift();
			const neighbors = [
				{ x: current.x - 1, y: current.y },
				{ x: current.x + 1, y: current.y },
				{ x: current.x, y: current.y - 1 },
				{ x: current.x, y: current.y + 1 }
			];

			for (const next of neighbors) {
				const key = `${next.x},${next.y}`;
				if (visited.has(key)) continue;
				visited.add(key);

				const hitNode = nodeHitTest(next.x, next.y);
				if (hitNode && hitNode.id !== targetNode.id && !isInsideNode(targetNode, next.x, next.y)) {
					return hitNode;
				}

				if (isConnectorChar(getChar(next.x, next.y))) {
					queue.push(next);
				}
			}
		}

		return null;
	}

	// 3. Find edges by locating arrow heads and tracing backwards
	const edges = [];
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const c = getChar(x, y);
			const isRightArrow = c === '>';
			const isLeftArrow = c === '<';
			// Only treat 'v'/'V' as down arrow if there's a connector directly above
			const isDownArrow = (c === 'v' || c === 'V') && (getChar(x, y - 1) === '|' || getChar(x, y - 1) === '+');
			const isUpArrow = c === '^' && (getChar(x, y + 1) === '|' || getChar(x, y + 1) === '+');
			if (!isRightArrow && !isLeftArrow && !isDownArrow && !isUpArrow) continue;

			let targetNode = null;
			let traceStart = null;

			if (isRightArrow) {
				targetNode = nodeHitTest(x + 1, y) || nodeHitTest(x + 2, y);
				traceStart = { x: x - 1, y };
			} else if (isLeftArrow) {
				targetNode = nodeHitTest(x - 1, y) || nodeHitTest(x - 2, y);
				traceStart = { x: x + 1, y };
			} else if (isDownArrow) {
				targetNode = nodeHitTest(x, y + 1) || nodeHitTest(x, y + 2);
				traceStart = { x, y: y - 1 };
			} else if (isUpArrow) {
				targetNode = nodeHitTest(x, y - 1) || nodeHitTest(x, y - 2);
				traceStart = { x, y: y + 1 };
			}

			if (!targetNode || !traceStart || !isConnectorChar(getChar(traceStart.x, traceStart.y))) continue;

			const sourceNode = traceSourceNode(traceStart.x, traceStart.y, targetNode);
			if (!sourceNode) continue;

			const exists = edges.some((edge) => edge.source === sourceNode.id && edge.target === targetNode.id);
			if (!exists) {
				edges.push({
					id: `e_${sourceNode.id}_${targetNode.id}`,
					source: sourceNode.id,
					target: targetNode.id,
					type: 'step'
				});
			}
		}
	}

	// 4. Format output
	const outputNodes = nodes.map((node) => ({
		id: node.id,
		type: detectNodeType(node),
		label: node.label,
		position: { x: node.x * 12, y: node.y * 20 },
		width: Math.max(120, node.w * 10),
		height: Math.max(60, node.h * 15)
	}));

	return { nodes: outputNodes, edges };
}

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

	// Verify that all 4 edges of a rectangle are valid box borders
	function isValidRectangle(left, top, right, bottom) {
		if (right - left < 2 || bottom - top < 2) return false;
		if (getChar(left, top) !== '+' || getChar(right, top) !== '+' || getChar(left, bottom) !== '+' || getChar(right, bottom) !== '+') return false;

		for (let x = left + 1; x < right; x++) {
			if (!isHorizontalBorderChar(getChar(x, top))) return false;
			if (!isHorizontalBorderChar(getChar(x, bottom))) return false;
		}

		for (let y = top + 1; y < bottom; y++) {
			if (!isVerticalBorderChar(getChar(left, y))) return false;
			if (!isVerticalBorderChar(getChar(right, y))) return false;
		}

		// Check that the interior has actual content (not just connector chars)
		// This prevents junction lines like +----------+----------+ from being detected as boxes
		let hasContent = false;
		for (let y = top + 1; y < bottom && !hasContent; y++) {
			for (let x = left + 1; x < right; x++) {
				const c = getChar(x, y);
				if (c !== ' ' && c !== '-' && c !== '|' && c !== '+') {
					hasContent = true;
					break;
				}
			}
		}

		return true;
	}

	// Find the largest valid box starting at top-left corner (startX, startY)
	function findBox(startX, startY) {
		// Collect all '+' positions along the top edge that could be the top-right corner
		const rightCandidates = [];
		for (let x = startX + 2; x < width; x++) {
			const c = getChar(x, startY);
			if (c === '+') {
				// Verify that all chars between startX and x on the top edge are valid
				let validTop = true;
				for (let cx = startX + 1; cx < x; cx++) {
					if (!isHorizontalBorderChar(getChar(cx, startY))) {
						validTop = false;
						break;
					}
				}
				if (validTop) rightCandidates.push(x);
			} else if (!isHorizontalBorderChar(c)) {
				break; // Stop scanning if we hit a non-border char
			}
		}

		let bestBox = null;
		for (const right of rightCandidates) {
			for (let bottom = startY + 2; bottom < height; bottom++) {
				const leftChar = getChar(startX, bottom);
				if (leftChar === '+') {
					if (!isValidRectangle(startX, startY, right, bottom)) continue;

					// Extract label from the interior
					let label = '';
					for (let y = startY + 1; y < bottom; y++) {
						let rowText = '';
						for (let x = startX + 1; x < right; x++) {
							const ch = getChar(x, y);
							rowText += ch === '|' ? ' ' : ch;
						}
						if (rowText.trim()) label += `${rowText.trim()} `;
					}
					label = label.trim() || 'Node';

					const candidate = {
						x: startX,
						y: startY,
						w: right - startX + 1,
						h: bottom - startY + 1,
						label,
						id: `n_${startX}_${startY}`
					};

					// Prefer the largest box (widest first, then tallest)
					if (!bestBox || candidate.w > bestBox.w || (candidate.w === bestBox.w && candidate.h > bestBox.h)) {
						bestBox = candidate;
					}
				} else if (!isVerticalBorderChar(leftChar)) {
					break; // Left edge broken, stop looking for deeper bottoms
				}
			}
		}

		return bestBox;
	}

	// 1. Find all nodes (boxes)
	const rawNodes = [];
	const visitedTopLeft = new Set();

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			// Only try '+' characters as potential top-left corners
			if (getChar(x, y) !== '+') continue;
			if (visitedTopLeft.has(`${x},${y}`)) continue;

			const box = findBox(x, y);
			if (!box) continue;

			rawNodes.push(box);
			// Only mark the top-left corner as visited to avoid re-detecting
			// the same box. Do NOT mark other corners, as they might be
			// the top-left corner of a different adjacent box.
			visitedTopLeft.add(`${box.x},${box.y}`);
		}
	}

	// Remove boxes that are fully contained inside larger boxes.
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

	// BFS trace from a starting point backwards to find the source node
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
			// Only treat 'v'/'V' as down arrow if there's a '|' or '+' directly above
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

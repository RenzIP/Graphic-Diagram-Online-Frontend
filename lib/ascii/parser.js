export function parseAscii(text) {
	if (!text || text.trim() === '') return { nodes: [], edges: [] };

	const lines = text.split('\n');
	const height = lines.length;
	let width = 0;
	lines.forEach(line => {
		if (line.length > width) width = line.length;
	});

	// Create 2D grid
	const grid = lines.map(line => line.padEnd(width, ' ').split(''));

	const nodes = [];
	const edges = [];
	const visitedNodes = new Set(); // to avoid processing same box multiple times

	// Helper to get character at x,y
	function getChar(x, y) {
		if (y < 0 || y >= height || x < 0 || x >= width) return ' ';
		return grid[y][x];
	}

	// Helper to find a full box given a starting top-left corner
	function findBox(startX, startY) {
		let w = 0;
		// Trace top edge
		while (getChar(startX + w + 1, startY) === '-' || getChar(startX + w + 1, startY) === '+') {
			w++;
			if (getChar(startX + w, startY) === '+') break;
		}
		if (w === 0 || getChar(startX + w, startY) !== '+') return null;

		let h = 0;
		// Trace left edge
		while (getChar(startX, startY + h + 1) === '|' || getChar(startX, startY + h + 1) === '+') {
			h++;
			if (getChar(startX, startY + h) === '+') break;
		}
		if (h === 0 || getChar(startX, startY + h) !== '+') return null;

		// Verify bottom-right corner and bottom edge
		if (getChar(startX + w, startY + h) !== '+') return null;
		
		// Extract label
		let label = '';
		for (let y = startY + 1; y < startY + h; y++) {
			let rowStr = '';
			for (let x = startX + 1; x < startX + w; x++) {
				rowStr += getChar(x, y);
			}
			if (rowStr.trim()) {
				label += rowStr.trim() + ' ';
			}
		}
		label = label.trim() || 'Node';

		return {
			x: startX,
			y: startY,
			w: w + 1,
			h: h + 1,
			label,
			id: `n_${startX}_${startY}`
		};
	}

	// 1. Find all nodes
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (getChar(x, y) === '+' && !visitedNodes.has(`${x},${y}`)) {
				const box = findBox(x, y);
				if (box) {
					nodes.push(box);
					// Mark corners as visited to prevent duplicate detection
					visitedNodes.add(`${box.x},${box.y}`);
					visitedNodes.add(`${box.x + box.w - 1},${box.y}`);
					visitedNodes.add(`${box.x},${box.y + box.h - 1}`);
					visitedNodes.add(`${box.x + box.w - 1},${box.y + box.h - 1}`);
				}
			}
		}
	}

	// Create simplified node lookup
	const nodeHitTest = (x, y) => {
		for (const node of nodes) {
			if (x >= node.x && x < node.x + node.w && y >= node.y && y < node.y + node.h) {
				return node;
			}
		}
		return null;
	};

	// Helper to check if char is a line or arrow
	const isLineChar = (c) => ['-', '|', '/', '\\', '>', '<', '^', 'v', 'V'].includes(c);

	// 2. Trace edges
	// A simple heuristic: find arrow heads, then trace backwards to find the source.
	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			const c = getChar(x, y);
			const isRightArrow = c === '>';
			const isLeftArrow = c === '<';
			const isDownArrow = (c === 'v' || c === 'V') && getChar(x, y - 1) === '|';
			const isUpArrow = c === '^' && getChar(x, y + 1) === '|';

			if (isRightArrow || isLeftArrow || isDownArrow || isUpArrow) {
				// We found an arrow. Check if it points to a node.
				let targetNode = null;
				if (isRightArrow) targetNode = nodeHitTest(x + 1, y) || nodeHitTest(x + 2, y);
				if (isLeftArrow) targetNode = nodeHitTest(x - 1, y) || nodeHitTest(x - 2, y);
				if (isDownArrow) targetNode = nodeHitTest(x, y + 1) || nodeHitTest(x, y + 2);
				if (isUpArrow) targetNode = nodeHitTest(x, y - 1) || nodeHitTest(x, y - 2);

				if (targetNode) {
					// Trace back to find source node
					let currX = x;
					let currY = y;
					const visited = new Set();
					let sourceNode = null;

					// Move backwards along the line
					while (!sourceNode && visited.size < 100) {
						visited.add(`${currX},${currY}`);
						let moved = false;

						// Determine next pixel backwards
						const neighbors = [
							{ dx: -1, dy: 0, valid: ['-', '+'] },
							{ dx: 1, dy: 0, valid: ['-', '+'] },
							{ dx: 0, dy: -1, valid: ['|', '+'] },
							{ dx: 0, dy: 1, valid: ['|', '+'] }
						];

						// If we are at the arrow tip, force initial direction backwards
						if (currX === x && currY === y) {
							if (isRightArrow) { currX--; moved = true; continue; }
							if (isLeftArrow) { currX++; moved = true; continue; }
							if (isDownArrow) { currY--; moved = true; continue; }
							if (isUpArrow) { currY++; moved = true; continue; }
						}

						for (const n of neighbors) {
							const nx = currX + n.dx;
							const ny = currY + n.dy;
							if (!visited.has(`${nx},${ny}`)) {
								// Check if we hit a node
								const hit = nodeHitTest(nx, ny);
								if (hit && hit.id !== targetNode.id) {
									sourceNode = hit;
									break;
								}
								// Or keep tracing if it's a valid line character
								const char = getChar(nx, ny);
								if (n.valid.includes(char)) {
									currX = nx;
									currY = ny;
									moved = true;
									break;
								}
							}
						}

						if (!moved) break;
					}

					if (sourceNode && targetNode) {
						// Check if edge already exists
						const exists = edges.some(e => e.source === sourceNode.id && e.target === targetNode.id);
						if (!exists) {
							edges.push({
								id: `e_${sourceNode.id}_${targetNode.id}`,
								source: sourceNode.id,
								target: targetNode.id,
								type: 'step' // Orthogonal routing looks best for ASCII import
							});
						}
					}
				}
			}
		}
	}

	// 3. Format output IR
	const outputNodes = nodes.map(n => ({
		id: n.id,
		type: 'process',
		label: n.label,
		position: { x: n.x * 12, y: n.y * 20 }, // Approximate scale factor to visual canvas
		width: Math.max(120, n.w * 10),
		height: Math.max(60, n.h * 15)
	}));

	return { nodes: outputNodes, edges };
}

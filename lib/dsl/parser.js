/**
 * Parse GraDiOl DSL text into an AST.
 *
 * Syntax supported:
 *   @flowchart "My Diagram"          — diagram metadata
 *   process "Step 1"                  — node declaration
 *   decision "Is Valid?" { ... }      — node with block attributes
 *   "A" -> "B"                        — edge
 *   "A" -> "B" : label               — edge with label (colon)
 *   "A" --label--> "B"               — edge with label (inline)
 *   "A" <-> "B"                      — bidirectional edge
 *   "A" -..-> "B"                    — dotted edge
 *   // comment                        — full-line comment
 *   process "X"  // inline comment    — inline comment (stripped)
 */
function parseDSL(text) {
	const lines = text
		.split('\n')
		.map((l) => {
			// Strip inline comments (but not inside quotes)
			const commentIdx = findInlineComment(l);
			return (commentIdx >= 0 ? l.slice(0, commentIdx) : l).trim();
		})
		.filter((l) => l && !l.startsWith('//'));

	const ast = {
		diagramType: 'flowchart',
		title: 'Untitled',
		nodes: [],
		edges: [],
	};

	let currentBlockNode = null;

	for (const line of lines) {
		// --- Block close ---
		if (currentBlockNode && line === '}') {
			ast.nodes.push(currentBlockNode);
			currentBlockNode = null;
			continue;
		}
		if (currentBlockNode) {
			if (!currentBlockNode.attributes) currentBlockNode.attributes = [];
			currentBlockNode.attributes.push(line);
			continue;
		}

		// --- Diagram metadata ---
		const metaMatch = line.match(/^@(\w+)\s+"?([^"]+)"?$/);
		if (metaMatch) {
			ast.diagramType = metaMatch[1];
			ast.title = metaMatch[2];
			continue;
		}

		// --- Edge: "A" --label--> "B" ---
		const edgeLabelMatch = line.match(/^"?([^"]+)"?\s+--([^-]+)-->\s+"?([^"]+)"?$/);
		if (edgeLabelMatch) {
			ast.edges.push({
				type: 'edge',
				source: edgeLabelMatch[1],
				target: edgeLabelMatch[3],
				edgeLabel: edgeLabelMatch[2].trim(),
			});
			continue;
		}

		// --- Edge: "A" <-> "B" (bidirectional) ---
		const bidiMatch = line.match(/^"?([^"]+)"?\s+<->\s+"?([^"]+)"?(?:\s*:\s*(.+))?$/);
		if (bidiMatch) {
			ast.edges.push({
				type: 'edge',
				source: bidiMatch[1],
				target: bidiMatch[2],
				edgeLabel: bidiMatch[3]?.trim(),
				bidirectional: true,
			});
			continue;
		}

		// --- Edge: "A" -..-> "B" (dotted) ---
		const dottedMatch = line.match(/^"?([^"]+)"?\s+-\.+->?\s+"?([^"]+)"?(?:\s*:\s*(.+))?$/);
		if (dottedMatch) {
			ast.edges.push({
				type: 'edge',
				source: dottedMatch[1],
				target: dottedMatch[2],
				edgeLabel: dottedMatch[3]?.trim(),
				style: 'dotted',
			});
			continue;
		}

		// --- Edge: "A" -> "B" : label ---
		const edgeColonMatch = line.match(/^"?([^"]+)"?\s+->\s+"?([^"]+)"?\s*:\s*(.+)$/);
		if (edgeColonMatch) {
			ast.edges.push({
				type: 'edge',
				source: edgeColonMatch[1],
				target: edgeColonMatch[2],
				edgeLabel: edgeColonMatch[3].trim(),
			});
			continue;
		}

		// --- Edge: "A" -> "B" ---
		const edgeMatch = line.match(/^"?([^"]+)"?\s+->\s+"?([^"]+)"?$/);
		if (edgeMatch) {
			ast.edges.push({
				type: 'edge',
				source: edgeMatch[1],
				target: edgeMatch[2],
			});
			continue;
		}

		// --- Node: type "label" { (block start) ---
		const blockStartMatch = line.match(/^(\w+)\s+"?([^"]+)"?\s*\{$/);
		if (blockStartMatch) {
			currentBlockNode = {
				type: 'node',
				nodeType: blockStartMatch[1],
				label: blockStartMatch[2],
				attributes: [],
			};
			continue;
		}

		// --- Node: type "label" ---
		const componentMatch = line.match(/^(\w+)\s+"([^"]+)"$/);
		if (componentMatch) {
			ast.nodes.push({
				type: 'node',
				nodeType: componentMatch[1],
				label: componentMatch[2],
			});
			continue;
		}

		// --- Node: type label (unquoted, single word) ---
		const simpleNodeMatch = line.match(/^(\w+)\s+([^\s{}"->]+)$/);
		if (simpleNodeMatch) {
			ast.nodes.push({
				type: 'node',
				nodeType: simpleNodeMatch[1],
				label: simpleNodeMatch[2],
			});
			continue;
		}
	}

	return ast;
}

/**
 * Find the index of an inline comment (//) that is NOT inside quotes.
 * Returns -1 if no inline comment is found.
 */
function findInlineComment(line) {
	let inQuote = false;
	for (let i = 0; i < line.length - 1; i++) {
		if (line[i] === '"') {
			inQuote = !inQuote;
		} else if (!inQuote && line[i] === '/' && line[i + 1] === '/') {
			return i;
		}
	}
	return -1;
}

export { parseDSL };

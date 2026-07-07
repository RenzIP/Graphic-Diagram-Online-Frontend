import { parseDSL } from './parser.js';
import { transformAST } from './transformer.js';

/**
 * Merge DSL text into the current document state.
 *
 * Instead of replacing the entire document (losing positions, styles, etc.),
 * this function performs a diff/merge:
 *
 *  1. Parse DSL → AST → fresh IR (nodes + edges)
 *  2. Match fresh nodes to existing nodes by label
 *  3. Existing nodes keep their position, size, and style
 *  4. New nodes get auto-layout positions from the transformer
 *  5. Removed nodes (in old state but not in DSL) are dropped
 *  6. Edges are rebuilt from the DSL but preserve visual properties
 *     (waypoints, animation, markers) where source/target match
 */
export function mergeDSL(dslText, currentState) {
	const ast = parseDSL(dslText);
	const freshIR = transformAST(ast);

	// --- Build lookup maps from the current state ---
	const existingByLabel = new Map();
	for (const node of currentState.nodes) {
		const key = (node.label ?? '').trim().toLowerCase();
		if (key && !existingByLabel.has(key)) {
			existingByLabel.set(key, node);
		}
	}

	const existingEdgeMap = new Map();
	for (const edge of currentState.edges) {
		existingEdgeMap.set(`${edge.source}→${edge.target}`, edge);
	}

	// --- Merge nodes ---
	// freshIdToOldId tracks the mapping so edges can be re-wired
	const freshIdToOldId = new Map();
	const mergedNodes = freshIR.nodes.map((freshNode) => {
		const key = (freshNode.label ?? '').trim().toLowerCase();
		const existing = existingByLabel.get(key);

		if (existing) {
			freshIdToOldId.set(freshNode.id, existing.id);
			// Keep the existing node's position, size, style — update type/label/data
			return {
				...existing,
				type: freshNode.type,
				label: freshNode.label, // preserve casing from DSL
				data: {
					...(existing.data ?? {}),
					...(freshNode.data ?? {}),
				},
			};
		}

		// Brand new node — use auto-layout position from transformer
		const newId = freshNode.id;
		freshIdToOldId.set(freshNode.id, newId);
		return {
			...freshNode,
			id: newId,
		};
	});

	// --- Merge edges ---
	const mergedEdges = freshIR.edges.map((freshEdge, index) => {
		const resolvedSource = freshIdToOldId.get(freshEdge.source) ?? freshEdge.source;
		const resolvedTarget = freshIdToOldId.get(freshEdge.target) ?? freshEdge.target;
		const lookupKey = `${resolvedSource}→${resolvedTarget}`;
		const existing = existingEdgeMap.get(lookupKey);

		if (existing) {
			// Preserve visual properties, update label and type
			return {
				...existing,
				label: freshEdge.label ?? existing.label,
				type: freshEdge.type ?? existing.type,
			};
		}

		// New edge
		return {
			...freshEdge,
			id: freshEdge.id || `e_merge_${index + 1}`,
			source: resolvedSource,
			target: resolvedTarget,
		};
	});

	return {
		nodes: mergedNodes,
		edges: mergedEdges,
	};
}

/**
 * Compute a lightweight sync status by comparing DSL text with the
 * serialized form of the current document state.
 *
 * @returns {'synced' | 'modified' | 'error'}
 */
export function computeSyncStatus(dslText, serializedText) {
	const normA = normalizeForComparison(dslText);
	const normB = normalizeForComparison(serializedText);
	return normA === normB ? 'synced' : 'modified';
}

/**
 * Strip comments, collapse whitespace, and trim for comparison purposes.
 */
function normalizeForComparison(text) {
	return text
		.split('\n')
		.map((l) => l.trim())
		.filter((l) => l && !l.startsWith('//'))
		.join('\n')
		.toLowerCase();
}

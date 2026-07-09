import { parseDSL } from './parser.js';
import { transformAST } from './transformer.js';

/**
 * Generate a unique ID that does not exist in the given set.
 */
function generateUniqueId(prefix, existingIds) {
	let i = 1;
	let id = `${prefix}${i}`;
	while (existingIds.has(id)) {
		i++;
		id = `${prefix}${i}`;
	}
	existingIds.add(id);
	return id;
}

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
	const existingNodeIds = new Set();
	for (const node of currentState.nodes) {
		const key = (node.label ?? '').trim().toLowerCase();
		if (key && !existingByLabel.has(key)) {
			existingByLabel.set(key, node);
		}
		existingNodeIds.add(node.id);
	}

	const existingEdgeMap = new Map();
	const existingEdgeIds = new Set();
	for (const edge of currentState.edges) {
		existingEdgeMap.set(`${edge.source}→${edge.target}`, edge);
		existingEdgeIds.add(edge.id);
	}

	// --- Merge nodes ---
	// freshIdToOldId tracks the mapping so edges can be re-wired
	const freshIdToOldId = new Map();
	const usedNodeIds = new Set();
	
	const mergedNodes = freshIR.nodes.map((freshNode) => {
		const key = (freshNode.label ?? '').trim().toLowerCase();
		const existing = existingByLabel.get(key);

		if (existing) {
			freshIdToOldId.set(freshNode.id, existing.id);
			usedNodeIds.add(existing.id);
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

		// Brand new node — use auto-layout position from transformer, but ensure unique ID
		const newId = generateUniqueId('n_dsl_', existingNodeIds);
		freshIdToOldId.set(freshNode.id, newId);
		usedNodeIds.add(newId);
		return {
			...freshNode,
			id: newId,
		};
	});

	// --- Merge edges ---
	const usedEdgeIds = new Set();
	const mergedEdges = freshIR.edges.map((freshEdge) => {
		const resolvedSource = freshIdToOldId.get(freshEdge.source) ?? freshEdge.source;
		const resolvedTarget = freshIdToOldId.get(freshEdge.target) ?? freshEdge.target;
		
		// First try exact source->target match
		let lookupKey = `${resolvedSource}→${resolvedTarget}`;
		let existing = existingEdgeMap.get(lookupKey);
		
		// If bidirectional, try the reverse match as well if not found
		if (!existing && freshEdge.bidirectional) {
			lookupKey = `${resolvedTarget}→${resolvedSource}`;
			existing = existingEdgeMap.get(lookupKey);
		}

		if (existing && !usedEdgeIds.has(existing.id)) {
			usedEdgeIds.add(existing.id);
			// Preserve visual properties, update label and type
			return {
				...existing,
				source: resolvedSource,
				target: resolvedTarget,
				label: freshEdge.label ?? existing.label,
				type: freshEdge.type ?? existing.type,
				...(freshEdge.bidirectional ? { markerStart: 'arrowclosed', markerEnd: 'arrowclosed' } : {}),
				...(freshEdge.style === 'dotted' ? { style: { strokeDasharray: '5,5' } } : {})
			};
		}

		// New edge - ensure unique ID
		const newId = generateUniqueId('e_dsl_', existingEdgeIds);
		usedEdgeIds.add(newId);
		
		return {
			...freshEdge,
			id: newId,
			source: resolvedSource,
			target: resolvedTarget,
			...(freshEdge.bidirectional ? { markerStart: 'arrowclosed', markerEnd: 'arrowclosed' } : {}),
			...(freshEdge.style === 'dotted' ? { style: { strokeDasharray: '5,5' } } : {})
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

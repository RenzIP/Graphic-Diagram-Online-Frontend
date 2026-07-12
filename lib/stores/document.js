import { documentsApi } from '../api/documents.js';
import { historyStore } from './history';
import { createStore } from './base';

export function toDocumentContent(state) {
	return {
		nodes: state.nodes.map((n) => ({
			id: n.id,
			type: n.type,
			label: n.label,
			properties: {
				...(n.data ?? {}),
				...(n.width != null ? { width: n.width } : {}),
				...(n.height != null ? { height: n.height } : {}),
				...(n.locked != null ? { locked: n.locked } : {})
			}
		})),
		edges: state.edges.map((e) => ({
			id: e.id,
			source: e.source,
			target: e.target,
			label: e.label,
			type: e.type
		}))
	};
}

export function toDocumentView(state) {
	const positions = {};
	const styles = {};
	const routing = {};
	for (const node of state.nodes) {
		positions[node.id] = { x: node.position.x, y: node.position.y };
		if (node.style || node.color) styles[node.id] = { ...(node.style ?? {}), ...(node.color ? { color: node.color } : {}) };
	}
	for (const edge of state.edges) {
		const edgeRouting = {};
		if (edge.waypoints) edgeRouting.waypoints = edge.waypoints;
		if (edge.animated != null) edgeRouting.animated = edge.animated;
		if (edge.style) edgeRouting.style = edge.style;
		if (edge.markerStart) edgeRouting.markerStart = edge.markerStart;
		if (edge.markerEnd) edgeRouting.markerEnd = edge.markerEnd;
		if (edge.sourceHandle) edgeRouting.sourceHandle = edge.sourceHandle;
		if (edge.targetHandle) edgeRouting.targetHandle = edge.targetHandle;
		if (Object.keys(edgeRouting).length > 0) routing[edge.id] = edgeRouting;
	}
	return { positions, styles, routing };
}

export function fromApiDocument(content, view = {}) {
	return {
		nodes: (content?.nodes ?? []).map((cn) => {
			const pos = view.positions?.[cn.id] ?? { x: 0, y: 0 };
			const props = cn.properties ?? {};
			const nodeStyle = view.styles?.[cn.id];
			return {
				id: cn.id,
				type: cn.type,
				position: { x: pos.x, y: pos.y },
				label: cn.label,
				...(props.width != null ? { width: props.width } : {}),
				...(props.height != null ? { height: props.height } : {}),
				...(props.locked != null ? { locked: props.locked } : {}),
				...(nodeStyle ? { style: nodeStyle } : {}),
				data: Object.fromEntries(Object.entries(props).filter(([k]) => !['width', 'height', 'locked'].includes(k)))
			};
		}),
		edges: (content?.edges ?? []).map((ce) => {
			const edgeRouting = view.routing?.[ce.id] ?? {};
			return {
				id: ce.id,
				source: ce.source,
				target: ce.target,
				label: ce.label,
				type: ce.type,
				...(edgeRouting.waypoints ? { waypoints: edgeRouting.waypoints } : {}),
				...(edgeRouting.animated != null ? { animated: edgeRouting.animated } : {}),
				...(edgeRouting.style ? { style: edgeRouting.style } : {}),
				...(edgeRouting.markerStart ? { markerStart: edgeRouting.markerStart } : {}),
				...(edgeRouting.markerEnd ? { markerEnd: edgeRouting.markerEnd } : {}),
				...(edgeRouting.sourceHandle ? { sourceHandle: edgeRouting.sourceHandle } : {}),
				...(edgeRouting.targetHandle ? { targetHandle: edgeRouting.targetHandle } : {})
			};
		})
	};
}

const initialState = {
	nodes: [
		{ id: '1', type: 'start-end', position: { x: 100, y: 100 }, width: 120, height: 56, label: 'Start' },
		{ id: '2', type: 'process', position: { x: 100, y: 200 }, width: 140, height: 60, label: 'Process Check' },
		{ id: '3', type: 'decision', position: { x: 100, y: 320 }, width: 120, height: 100, label: 'Is Valid?' },
		{ id: '4', type: 'start-end', position: { x: 100, y: 500 }, width: 120, height: 56, label: 'End' }
	],
	edges: [
		{ id: 'e1', source: '1', target: '2', type: 'default', sourceHandle: 'bottom', targetHandle: 'top', markerEnd: 'arrow' },
		{ id: 'e2', source: '2', target: '3', type: 'default', sourceHandle: 'bottom', targetHandle: 'top', markerEnd: 'arrow' }
	]
};

const state = createStore(initialState);
const saveHistory = (currentState) => historyStore.push(currentState);

export const documentStore = {
	...state,
	async load(id) {
		try {
			const doc = await documentsApi.get(id);
			if (!doc) return false;
			state.set(fromApiDocument(doc.content, doc.view));
			historyStore.clear();
			return true;
		} catch (e) {
			console.error('[documentStore] load error:', e);
			return false;
		}
	},
	async save(id, title) {
		const currentState = state.get();
		const payload = {
			content: toDocumentContent(currentState),
			view: toDocumentView(currentState),
			...(title ? { title } : {})
		};
		await documentsApi.update(id, payload);
	},
	clear() {
		state.set({ nodes: [], edges: [] });
		historyStore.clear();
	},
	addNode(node) {
		state.update((s) => {
			saveHistory(s);
			return { ...s, nodes: [...s.nodes, node] };
		});
	},
	addNodeRemote(node) {
		state.update((s) => ({ ...s, nodes: [...s.nodes, node] }));
	},
	updateNode(id, data) {
		state.update((s) => {
			saveHistory(s);
			return { ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)) };
		});
	},
	updateNodeRemote(id, data) {
		state.update((s) => ({ ...s, nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)) }));
	},
	removeNode(id) {
		state.update((s) => {
			saveHistory(s);
			return { ...s, nodes: s.nodes.filter((n) => n.id !== id), edges: s.edges.filter((e) => e.source !== id && e.target !== id) };
		});
	},
	removeNodeRemote(id) {
		state.update((s) => ({ ...s, nodes: s.nodes.filter((n) => n.id !== id), edges: s.edges.filter((e) => e.source !== id && e.target !== id) }));
	},
	moveNodeOrder(id, direction) {
		state.update((s) => {
			saveHistory(s);
			const index = s.nodes.findIndex((n) => n.id === id);
			if (index === -1) return s;
			const node = s.nodes[index];
			const nodes = [...s.nodes];
			nodes.splice(index, 1);
			if (direction === 'front') nodes.push(node);
			else nodes.unshift(node);
			return { ...s, nodes };
		});
	},
	moveNodeOrderRemote(id, direction) {
		state.update((s) => {
			const index = s.nodes.findIndex((n) => n.id === id);
			if (index === -1) return s;
			const node = s.nodes[index];
			const nodes = [...s.nodes];
			nodes.splice(index, 1);
			if (direction === 'front') nodes.push(node);
			else nodes.unshift(node);
			return { ...s, nodes };
		});
	},
	addEdge(edge) {
		state.update((s) => {
			saveHistory(s);
			return { ...s, edges: [...s.edges, edge] };
		});
	},
	addEdgeRemote(edge) {
		state.update((s) => ({ ...s, edges: [...s.edges, edge] }));
	},
	updateEdge(id, data) {
		state.update((s) => {
			saveHistory(s);
			return { ...s, edges: s.edges.map((e) => (e.id === id ? { ...e, ...data } : e)) };
		});
	},
	updateEdgeRemote(id, data) {
		state.update((s) => ({ ...s, edges: s.edges.map((e) => (e.id === id ? { ...e, ...data } : e)) }));
	},
	removeEdge(id) {
		state.update((s) => {
			saveHistory(s);
			return { ...s, edges: s.edges.filter((e) => e.id !== id) };
		});
	},
	removeEdgeRemote(id) {
		state.update((s) => ({ ...s, edges: s.edges.filter((e) => e.id !== id) }));
	}
};


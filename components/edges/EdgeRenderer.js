'use client';

import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';
import { getEdgeBundleIndex } from '../../lib/utils/geometry.js';
import BaseEdge from './BaseEdge';

export default function EdgeRenderer() {
	const document = useStore(documentStore);
	const getNode = (id) => document.nodes.find((n) => n.id === id);
	return (
		<>
			{document.edges.map((edge) => {
				const sourceNode = getNode(edge.source);
				const targetNode = getNode(edge.target);
				const bundle = getEdgeBundleIndex(document.edges, edge);
				return sourceNode && targetNode ? (
					<BaseEdge
						key={edge.id}
						edge={edge}
						sourceNode={sourceNode}
						targetNode={targetNode}
						bundle={bundle}
						allNodes={document.nodes}
					/>
				) : null;
			})}
		</>
	);
}

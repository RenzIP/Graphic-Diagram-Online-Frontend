'use client';

import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';
import { selectionStore } from '../../lib/stores/selection.js';
import NodeItem from './NodeItem.js';
import ShapeNode from './ShapeNode';

export default function NodeRenderer() {
	const document = useStore(documentStore);
	const selection = useStore(selectionStore);
	return (
		<>
			{document.nodes.map((node) => (
				<NodeItem key={node.id} node={node} isSelected={selection.nodes.includes(node.id)}>
					<ShapeNode node={node} />
				</NodeItem>
			))}
		</>
	);
}

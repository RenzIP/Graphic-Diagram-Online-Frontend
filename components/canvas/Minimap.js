'use client';

import { useStore } from '../../hooks/useStore.js';
import { documentStore } from '../../lib/stores/document.js';

export default function Minimap() {
	const document = useStore(documentStore);
	return (
		<div className="editor-minimap pointer-events-none absolute right-4 top-4 h-32 w-44 overflow-hidden rounded-[1.35rem] border">
			<svg viewBox="0 0 1000 700" className="h-full w-full">
				{document.nodes.map((node) => <rect key={node.id} x={node.position.x} y={node.position.y} width={node.width || 120} height={node.height || 60} fill="#6366f1" opacity="0.35" />)}
			</svg>
		</div>
	);
}

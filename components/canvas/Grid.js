'use client';

import { useStore } from '../../hooks/useStore.js';
import { canvasStore } from '../../lib/stores/canvas.js';
import { preferencesStore } from '../../lib/stores/preferences.js';

export default function Grid() {
	const transform = useStore(canvasStore);
	const { gridSize } = useStore(preferencesStore);

	const patternSize = gridSize * transform.k;
	const offsetX = transform.x % patternSize;
	const offsetY = transform.y % patternSize;
	return (
		<g>
			<defs>
				<pattern id="canvas-grid" width={patternSize} height={patternSize} patternUnits="userSpaceOnUse" x={offsetX} y={offsetY}>
					<circle cx="1" cy="1" r="1" fill="#334155" opacity="0.7" />
				</pattern>
			</defs>
			<rect width="100%" height="100%" fill="url(#canvas-grid)" />
		</g>
	);
}

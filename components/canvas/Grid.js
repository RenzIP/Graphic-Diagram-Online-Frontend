'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { canvasStore } from '../../lib/stores/canvas.js';
import { preferencesStore, DEFAULT_PREFERENCES } from '../../lib/stores/preferences.js';

export default function Grid() {
	const transform = useStore(canvasStore);
	const { gridSize } = useStore(preferencesStore);
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
	}, []);

	// Use default size during SSR/hydration to avoid mismatch, switch to custom size after mount
	const activeGridSize = mounted ? gridSize : DEFAULT_PREFERENCES.gridSize;
	const patternSize = activeGridSize * transform.k;
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

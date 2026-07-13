'use client';

import { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { canvasStore } from '../../lib/stores/canvas.js';

export default function Grid() {
	const transform = useStore(canvasStore);
	const [gridSize, setGridSize] = useState(20);

	useEffect(() => {
		const savedSettings = localStorage.getItem('user_settings');
		if (savedSettings) {
			try {
				const s = JSON.parse(savedSettings);
				if (s.gridSize) setGridSize(s.gridSize);
			} catch (e) {}
		}
	}, []);

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

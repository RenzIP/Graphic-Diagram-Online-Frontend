/**
 * Default node sizes tuned per shape so diagrams don't look squashed/odd.
 */
export function getDefaultNodeSize(type) {
	const sizeByType = {
		actor: { width: 80, height: 120 },
		usecase: { width: 160, height: 80 },
		class: { width: 160, height: 100 },
		package: { width: 160, height: 100 },
		note: { width: 140, height: 80 },
		decision: { width: 120, height: 100 },
		diamond: { width: 120, height: 100 },
		gateway: { width: 80, height: 80 },
		circle: { width: 90, height: 90 },
		ellipse: { width: 140, height: 80 },
		'start-event': { width: 70, height: 70 },
		'end-event': { width: 70, height: 70 },
		'intermediate-event': { width: 70, height: 70 },
		interface: { width: 90, height: 90 },
		attribute: { width: 110, height: 60 },
		database: { width: 100, height: 90 },
		cylinder: { width: 100, height: 90 },
		cloud: { width: 140, height: 90 },
		entity: { width: 140, height: 70 },
		'weak-entity': { width: 140, height: 70 },
		relationship: { width: 120, height: 90 },
		'start-end': { width: 120, height: 56 },
		terminator: { width: 120, height: 56 }
	};
	return sizeByType[type] || { width: 120, height: 60 };
}

/**
 * Create a new node object from a shape type and label.
 * If position is provided, the node is centered on that point.
 */
export function createNodeFromShape(type, label, position) {
	const size = getDefaultNodeSize(type);
	return {
		id: crypto.randomUUID(),
		type,
		label: label || 'New Node',
		...size,
		position: position ? { x: position.x - size.width / 2, y: position.y - size.height / 2 } : { x: 0, y: 0 }
	};
}

'use client';

import { useEffect, useState } from 'react';
import { useStore } from '../../hooks/useStore.js';
import { canvasStore } from '../../lib/stores/canvas.js';
import { documentStore } from '../../lib/stores/document.js';
import { collaborationStore } from '../../lib/stores/collaboration.js';
import { wsClient } from '../../lib/ws/client.js';
import * as SelectionModule from '../../lib/stores/selection.js';

export default function NodeWrapper({ node, children }) {
	const canvas = useStore(canvasStore);
	const selection = useStore(SelectionModule.selectionStore);
	const collab = useStore(collaborationStore);
	
	const isSelected = selection.nodes.includes(node.id);
	const lockUserId = collab.locks[node.id];
	
	// A better check for isLockedByOther: we need to know OUR user ID. But we don't have it explicitly stored easily accessible.
	// Actually, the server rejects our lock if someone else has it. The UI can just check if lockUserId exists. 
	// If we locked it, we would have received a `node_locked` event with `by: our_id`.
	// For simplicity, let's just assume if it's locked and we aren't dragging it, it's locked by someone else.
	const [drag, setDrag] = useState(null);
	const [resize, setResize] = useState(null);
	const [isEditing, setIsEditing] = useState(false);

	const isLocked = lockUserId && !drag && !resize && !isEditing;
	const lockerUser = isLocked ? collab.users.find(u => u.id === lockUserId) : null;

	useEffect(() => {
		function onMove(event) {
			if (resize) {
				const dx = (event.clientX - resize.start.x) / canvas.k;
				const dy = (event.clientY - resize.start.y) / canvas.k;
				let newX = resize.nodePos.x;
				let newY = resize.nodePos.y;
				let newWidth = resize.size.width;
				let newHeight = resize.size.height;
				if (resize.handle.includes('e')) newWidth = Math.max(50, resize.size.width + dx);
				if (resize.handle.includes('w')) {
					newWidth = Math.max(50, resize.size.width - dx);
					newX = resize.nodePos.x + (resize.size.width - newWidth);
				}
				if (resize.handle.includes('s')) newHeight = Math.max(30, resize.size.height + dy);
				if (resize.handle.includes('n')) {
					newHeight = Math.max(30, resize.size.height - dy);
					newY = resize.nodePos.y + (resize.size.height - newHeight);
				}
				const data = { position: { x: newX, y: newY }, width: newWidth, height: newHeight };
				documentStore.updateNode(node.id, data);
				wsClient.send({ type: 'update_node', node_id: node.id, changes: data });
				return;
			}
			if (!drag) return;
			const dx = (event.clientX - drag.start.x) / canvas.k;
			const dy = (event.clientY - drag.start.y) / canvas.k;
			const data = { position: { x: drag.nodePos.x + dx, y: drag.nodePos.y + dy } };
			documentStore.updateNode(node.id, data);
			wsClient.send({ type: 'update_node', node_id: node.id, changes: data });
		}
		function onUp() {
			if (drag || resize) {
				wsClient.send({ type: 'unlock_node', node_id: node.id });
			}
			setDrag(null);
			setResize(null);
		}
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
		return () => {
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
	}, [canvas.k, drag, resize, node.id]);

	function handleMouseDown(event) {
		event.stopPropagation();
		if (isLocked) return; // Prevent local interaction if locked by other
		
		if (!isSelected && !event.shiftKey) SelectionModule.selectionStore.selectNode(node.id, false);
		else if (event.shiftKey) SelectionModule.selectionStore.selectNode(node.id, true);
		
		if (event.button === 0 && !node.locked) {
			setDrag({ start: { x: event.clientX, y: event.clientY }, nodePos: { ...node.position } });
			wsClient.send({ type: 'lock_node', node_id: node.id });
		}
	}

	function handleConnectorMouseDown(event, handle) {
		event.stopPropagation();
		event.preventDefault();
		const bounds = event.currentTarget.getBoundingClientRect();
		const x = (bounds.left + bounds.width / 2 - canvas.x) / canvas.k;
		const y = (bounds.top + bounds.height / 2 - canvas.y) / canvas.k;
		canvasStore.startConnection(node.id, handle, { x, y });
	}

	const selectedOrTarget = isSelected || canvas.connecting?.candidateNodeId === node.id;

	return (
		<g
			transform={`translate(${node.position.x} ${node.position.y})`}
			onMouseDown={handleMouseDown}
			onDoubleClick={(e) => { e.stopPropagation(); if (!isLocked) setIsEditing(true); }}
			onMouseEnter={() => {
				if (canvas.connecting && canvas.connecting.sourceNodeId !== node.id) canvasStore.updateConnection(canvas.connecting.mousePos, node.id);
			}}
			onMouseLeave={() => {
				if (canvas.connecting?.candidateNodeId === node.id) canvasStore.updateConnection(canvas.connecting.mousePos, undefined);
			}}
			onMouseUp={(e) => {
				if (canvas.connecting && canvas.connecting.sourceNodeId !== node.id) {
					e.stopPropagation();
					if (canvas.connecting.modifyingEdgeId) {
						documentStore.updateEdge(canvas.connecting.modifyingEdgeId, canvas.connecting.isReversed ? { source: node.id } : { target: node.id });
					} else {
						documentStore.addEdge({ id: crypto.randomUUID(), source: canvas.connecting.sourceNodeId, target: node.id, type: 'straight' });
					}
					canvasStore.endConnection();
				}
			}}
			className={`group outline-none ${isLocked ? 'cursor-not-allowed' : 'cursor-move'}`}
			role="group"
			aria-label="Node"
		>
			{isLocked && lockerUser ? (
				<g className="pointer-events-none">
					<rect x={-4} y={-4} width={(node.width || 120) + 8} height={(node.height || 60) + 8} rx="8" className="fill-transparent stroke-2" style={{ stroke: lockerUser.color }} />
					<rect x={-4} y={-24} width={(lockerUser.name || lockerUser.id).length * 6 + 16} height="20" rx="4" fill={lockerUser.color} />
					<text x={2} y={-10} fontSize="10" fill="white" fontWeight="bold">{(lockerUser.name || lockerUser.id)}</text>
				</g>
			) : selectedOrTarget ? (
				<>
					<rect x={-4} y={-4} width={(node.width || 120) + 8} height={(node.height || 60) + 8} rx="8" className="fill-indigo-500/20 stroke-indigo-500 stroke-2 transition-all duration-150" />
					{isSelected ? ['nw', 'ne', 'sw', 'se'].map((handle) => {
						const x = handle.includes('w') ? -8 : node.width || 120;
						const y = handle.includes('n') ? -8 : node.height || 60;
						return <rect key={handle} x={x} y={y} width={8} height={8} className={`pointer-events-auto cursor-${handle}-resize fill-indigo-500 stroke-white stroke-1`} onMouseDown={(e) => { e.stopPropagation(); e.preventDefault(); setResize({ handle, start: { x: e.clientX, y: e.clientY }, nodePos: { ...node.position }, size: { width: node.width || 120, height: node.height || 60 } }); }} />;
					}) : null}
				</>
			) : null}
			{children}
			{isEditing ? (
				<foreignObject x={0} y={0} width={node.width || 120} height={node.height || 60}>
					<textarea autoFocus value={node.label || ''} onChange={(e) => {
						const data = { label: e.target.value };
						documentStore.updateNode(node.id, data);
						wsClient.send({ type: 'update_node', node_id: node.id, changes: data });
					}} onBlur={() => setIsEditing(false)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); setIsEditing(false); } }} className="h-full w-full resize-none rounded border-2 border-indigo-500 bg-slate-800 p-2 text-center text-sm text-white focus:outline-none" />
				</foreignObject>
			) : null}
			{!isLocked && (
				<foreignObject x={-6} y={-6} width={(node.width || 120) + 12} height={(node.height || 60) + 12} className="pointer-events-none overflow-visible">
					<div className={`relative h-full w-full opacity-0 transition-opacity group-hover:opacity-100 ${isSelected ? 'opacity-100' : ''}`}>
						{[
							['top', '-top-1 left-1/2 -translate-x-1/2'],
							['right', 'top-1/2 -right-1 -translate-y-1/2'],
							['bottom', '-bottom-1 left-1/2 -translate-x-1/2'],
							['left', 'top-1/2 -left-1 -translate-y-1/2']
						].map(([handle, pos]) => (
							<div key={handle} className={`pointer-events-auto absolute h-3 w-3 cursor-crosshair rounded-full border border-white bg-indigo-500 shadow-sm transition-transform hover:scale-125 ${pos}`} onMouseDown={(e) => handleConnectorMouseDown(e, handle)} role="button" tabIndex={0} aria-label={`Connect ${handle}`} />
						))}
					</div>
				</foreignObject>
			)}
		</g>
	);
}

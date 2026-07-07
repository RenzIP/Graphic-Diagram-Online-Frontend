'use client';

import { useState } from 'react';
import Modal from '../ui/Modal.js';
import Button from '../ui/Button.js';
import { parseAscii } from '../../lib/ascii/parser.js';
import { documentStore } from '../../lib/stores/document.js';

export default function AsciiImportModal({ open, onClose }) {
	const [text, setText] = useState('');
	const [error, setError] = useState(null);

	function handleImport() {
		setError(null);
		try {
			const parsed = parseAscii(text);
			if (parsed.nodes.length === 0) {
				setError('No valid ASCII boxes found. Try drawing a box like +---+');
				return;
			}
			
			// Replace current document with the imported ASCII diagram
			// (Alternatively, we could append it, but replace is simpler for "Import")
			documentStore.set(parsed);
			
			window.__gradiol_toast?.('ASCII Diagram imported successfully', 'success');
			setText('');
			onClose();
		} catch (e) {
			setError(e.message || 'Failed to parse ASCII diagram');
		}
	}

	return (
		<Modal open={open} title="Import ASCII Diagram" onClose={onClose} size="lg">
			<div className="flex flex-col gap-4 p-6">
				<p className="text-sm text-slate-400">
					Paste an ASCII diagram (like those from AsciiFlow) below. The parser looks for boxes drawn with <code>+</code>, <code>-</code>, and <code>|</code>, and connects them with lines ending in arrows (<code>&gt;</code>, <code>&lt;</code>, <code>v</code>, <code>^</code>).
				</p>
				
				<textarea
					className="h-64 w-full resize-none rounded-lg border border-slate-700 bg-slate-900 p-4 font-mono text-xs text-slate-300 placeholder-slate-600 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
					placeholder="+---------+\n| Start   |---->\n+---------+    |\n               v\n           +-------+\n           | End   |\n           +-------+"
					value={text}
					onChange={(e) => setText(e.target.value)}
					spellCheck="false"
				/>

				{error && (
					<div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3 pt-2">
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="primary" onClick={handleImport} disabled={!text.trim()}>
						Import
					</Button>
				</div>
			</div>
		</Modal>
	);
}

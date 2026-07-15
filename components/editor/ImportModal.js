'use client';

import { useState, useRef } from 'react';
import Modal from '../ui/Modal.js';
import Button from '../ui/Button.js';
import { parseDSL } from '../../lib/dsl/parser.js';
import { transformAST } from '../../lib/dsl/transformer.js';
import { fromApiDocument, documentStore } from '../../lib/stores/document.js';

export default function ImportModal({ open, onClose }) {
	const [error, setError] = useState(null);
	const fileInputRef = useRef(null);

	function handleFileChange(event) {
		const file = event.target.files?.[0];
		if (!file) return;

		const reader = new FileReader();
		reader.onload = (e) => {
			try {
				const text = e.target.result;
				let parsedState = null;

				if (file.name.endsWith('.json')) {
					const json = JSON.parse(text);
					if (json.content) {
						if (!Array.isArray(json.content.nodes) || !Array.isArray(json.content.edges)) {
							throw new Error('Invalid JSON format: nodes and edges must be arrays.');
						}
						parsedState = fromApiDocument(json.content, json.view);
					} else if (json.nodes && json.edges) {
						if (!Array.isArray(json.nodes) || !Array.isArray(json.edges)) {
							throw new Error('Invalid JSON format: nodes and edges must be arrays.');
						}
						parsedState = { nodes: json.nodes, edges: json.edges };
					} else {
						throw new Error('Invalid JSON format: missing nodes and edges.');
					}
				} else if (file.name.endsWith('.dsl') || file.name.endsWith('.txt')) {
					const ast = parseDSL(text);
					parsedState = transformAST(ast);
				} else {
					throw new Error('Unsupported file format. Please upload .json, .dsl, or .txt');
				}

				if (parsedState) {
					documentStore.replaceDocument(parsedState);
					window.__gradiol_toast?.('Document imported successfully', 'success');
					onClose();
				}
			} catch (err) {
				setError(err.message || 'Failed to import file');
			}

			if (fileInputRef.current) fileInputRef.current.value = '';
		};
		reader.onerror = () => {
			setError('Failed to read file');
		};

		reader.readAsText(file);
	}

	return (
		<Modal open={open} title="Import Diagram" onClose={onClose} size="md">
			<div className="flex flex-col gap-4 p-6">
				<p className="text-sm leading-6 text-slate-400">
					Upload a saved diagram file to continue editing. Supported formats:
				</p>
				<ul className="list-inside list-disc text-sm leading-7 text-slate-300">
					<li><strong>.json</strong> (GraDiOl Internal Representation)</li>
					<li><strong>.dsl / .txt</strong> (Text-based DSL Diagram)</li>
				</ul>

				<div className="import-dropzone mt-4 flex flex-col items-center justify-center p-8 transition-colors hover:border-indigo-400/30 hover:bg-indigo-500/8">
					<input
						type="file"
						ref={fileInputRef}
						accept=".json,.dsl,.txt"
						className="hidden"
						onChange={handleFileChange}
					/>
					<div className="mb-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">File Import</div>
					<Button variant="primary" onClick={() => fileInputRef.current?.click()}>
						Select File
					</Button>
					<span className="mt-2 text-xs text-slate-500">or drag and drop a file here</span>
				</div>

				{error && (
					<div className="mt-2 rounded-2xl border border-red-400/18 bg-red-500/10 p-3 text-sm text-red-100">
						{error}
					</div>
				)}

				<div className="flex justify-end gap-3 pt-2">
					<Button variant="secondary" onClick={onClose}>
						Cancel
					</Button>
				</div>
			</div>
		</Modal>
	);
}

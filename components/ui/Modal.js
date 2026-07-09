'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

const sizes = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl'
};

export default function Modal({ open, onClose, title, children, size = 'md' }) {
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMounted(true);
		return () => setMounted(false);
	}, []);

	if (!open || !mounted) return null;

	return createPortal(
		<div className="fixed inset-0 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md" style={{ zIndex: 2147483647 }} onMouseDown={onClose}>
			<div
				className={`modal-in glass-panel max-h-[calc(100vh-2rem)] w-full overflow-y-auto rounded-[1.75rem] text-slate-200 ${sizes[size] ?? sizes.md}`}
				onMouseDown={(e) => e.stopPropagation()}
			>
				{title ? (
					<div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/8 bg-[rgba(11,16,32,0.86)] px-6 py-5 backdrop-blur-md">
						<div>
							<p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-slate-500">Dialog</p>
							<h3 className="text-lg font-semibold text-white">{title}</h3>
						</div>
						<button className="rounded-xl border border-white/8 bg-white/5 p-2 text-slate-400 hover:border-white/14 hover:bg-white/10 hover:text-white" onClick={onClose} aria-label="Close">
							<svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						</button>
					</div>
				) : null}
				{children}
			</div>
		</div>,
		document.body
	);
}

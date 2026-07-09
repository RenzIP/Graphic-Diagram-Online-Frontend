'use client';

const sizes = {
	sm: 'max-w-md',
	md: 'max-w-lg',
	lg: 'max-w-2xl',
	xl: 'max-w-4xl'
};

export default function Modal({ open, onClose, title, children, size = 'md' }) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-md" onMouseDown={onClose}>
			<div
				className={`modal-in glass-panel w-full rounded-[1.75rem] text-slate-200 ${sizes[size] ?? sizes.md}`}
				onMouseDown={(e) => e.stopPropagation()}
			>
				{title ? (
					<div className="flex items-center justify-between border-b border-white/8 px-6 py-5">
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
		</div>
	);
}

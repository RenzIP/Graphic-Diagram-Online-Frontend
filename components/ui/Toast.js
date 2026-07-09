'use client';

import { useEffect, useState } from 'react';

export default function Toast() {
	const [toasts, setToasts] = useState([]);

	useEffect(() => {
		window.__gradiol_toast = (message, type = 'info') => {
			const id = crypto.randomUUID();
			setToasts((items) => [...items, { id, message, type }]);
			setTimeout(() => setToasts((items) => items.filter((toast) => toast.id !== id)), 3000);
		};
		return () => {
			delete window.__gradiol_toast;
		};
	}, []);

	return (
		<div className="fixed right-4 bottom-4 z-[60] space-y-3">
			{toasts.map((toast) => (
				<div
					key={toast.id}
					className={`glass-panel min-w-[260px] rounded-2xl px-4 py-3 text-sm shadow-[0_22px_60px_rgba(2,6,23,0.3)] ${
						toast.type === 'error'
							? 'border-red-400/20 text-red-100'
							: toast.type === 'success'
								? 'border-emerald-400/20 text-emerald-100'
								: 'border-sky-400/16 text-slate-100'
					}`}
				>
					<div className="flex items-start gap-3">
						<span className={`mt-0.5 inline-flex h-2.5 w-2.5 rounded-full ${
							toast.type === 'error' ? 'bg-red-400' : toast.type === 'success' ? 'bg-emerald-400' : 'bg-sky-400'
						}`}></span>
						<span className="leading-6">{toast.message}</span>
					</div>
				</div>
			))}
		</div>
	);
}

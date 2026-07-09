'use client';

export function BrandMark({ className = 'h-12 w-12', iconClassName = 'h-6 w-6' }) {
	return (
		<div className={`flex items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 shadow-[0_18px_40px_rgba(99,102,241,0.32)] ${className}`}>
			<svg className={`${iconClassName} text-white`} viewBox="0 0 64 64" fill="none" aria-hidden="true">
				<path d="M18 22C18 16.477 22.477 12 28 12H37C45.284 12 52 18.716 52 27V28" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
				<path d="M48 34H34V48H28C22.477 48 18 43.523 18 38V22Z" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
				<circle cx="18" cy="22" r="4.5" fill="currentColor" opacity="0.98" />
				<circle cx="48" cy="28" r="4.5" fill="#BAE6FD" />
				<circle cx="34" cy="48" r="4.5" fill="#DDD6FE" />
			</svg>
		</div>
	);
}

export default function BrandLogo({
	className = '',
	hideMark = false,
	markClassName = 'h-12 w-12',
	iconClassName = 'h-6 w-6',
	nameClassName = 'text-2xl font-semibold tracking-tight text-white',
	subtitleClassName = 'text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-slate-500',
	subtitle = 'Visual Diagram Studio'
}) {
	return (
		<div className={`flex items-center gap-3 ${className}`}>
			{hideMark ? null : <BrandMark className={markClassName} iconClassName={iconClassName} />}
			<div>
				<p className={subtitleClassName}>{subtitle}</p>
				<p className={nameClassName}>GraDiOl</p>
			</div>
		</div>
	);
}

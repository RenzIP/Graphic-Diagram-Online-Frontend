'use client';

const sizes = {
	sm: 'h-8 w-8 text-xs',
	md: 'h-10 w-10 text-sm',
	lg: 'h-12 w-12 text-base'
};

export default function Avatar({ initials = '??', size = 'md' }) {
	return (
		<div className={`flex shrink-0 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-indigo-500/20 via-violet-500/12 to-sky-500/20 font-semibold text-indigo-100 shadow-[0_12px_32px_rgba(99,102,241,0.2)] ${sizes[size] ?? sizes.md}`}>
			{initials}
		</div>
	);
}

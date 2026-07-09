'use client';

import Link from 'next/link';

const variants = {
	primary: 'border border-white/10 bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-500 text-white shadow-[0_18px_40px_rgba(99,102,241,0.28)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_22px_54px_rgba(99,102,241,0.36)]',
	secondary: 'border border-white/8 bg-white/6 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:-translate-y-0.5 hover:border-white/14 hover:bg-white/10',
	ghost: 'border border-transparent text-slate-300 hover:-translate-y-0.5 hover:border-white/8 hover:bg-white/6 hover:text-white',
	outline: 'border border-white/12 bg-slate-950/10 text-slate-200 hover:-translate-y-0.5 hover:border-indigo-400/35 hover:bg-indigo-500/10 hover:text-white',
	danger: 'border border-red-400/20 bg-red-500/12 text-red-100 shadow-[0_18px_34px_rgba(239,68,68,0.14)] hover:-translate-y-0.5 hover:border-red-300/35 hover:bg-red-500/18'
};

const sizes = {
	sm: 'h-10 px-4 text-sm',
	md: 'h-11 px-5 text-sm',
	lg: 'h-12 px-6 text-base',
	icon: 'h-11 w-11'
};

export default function Button({
	variant = 'primary',
	size = 'md',
	href,
	className = '',
	children,
	type = 'button',
	disabled = false,
	onClick,
	...props
}) {
	const classes = `inline-flex items-center justify-center gap-2 rounded-xl font-semibold tracking-[0.01em] transition duration-300 ease-out disabled:pointer-events-none disabled:opacity-50 ${variants[variant] ?? variants.primary} ${sizes[size] ?? sizes.md} ${className}`;

	if (href) {
		return (
			<Link href={href} className={classes} {...props}>
				{children}
			</Link>
		);
	}

	return (
		<button type={type} disabled={disabled} onClick={onClick} className={classes} {...props}>
			{children}
		</button>
	);
}

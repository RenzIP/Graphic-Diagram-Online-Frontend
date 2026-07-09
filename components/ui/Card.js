'use client';

export default function Card({ children, className = '', onClick, ...props }) {
	return (
		<div
			className={`surface-panel overflow-hidden rounded-[1.5rem] ${className}`}
			onClick={onClick}
			{...props}
		>
			{children}
		</div>
	);
}

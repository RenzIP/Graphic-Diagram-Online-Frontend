'use client';

export default function Input({ label, value = '', onChange, className = '', id, ...props }) {
	const inputId = id || props.name || label?.toLowerCase().replace(/\s+/g, '-');
	return (
		<div>
			{label ? (
				<label htmlFor={inputId} className="field-label">
					{label}
				</label>
			) : null}
			<input
				id={inputId}
				value={value}
				onChange={(e) => onChange?.(e.target.value, e)}
				className={`field ${className}`}
				{...props}
			/>
		</div>
	);
}

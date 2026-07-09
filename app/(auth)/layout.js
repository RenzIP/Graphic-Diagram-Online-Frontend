import BrandLogo from '../../components/ui/BrandLogo.js';

export default function AuthLayout({ children }) {
	return (
		<div className="auth-shell">
			<div className="auth-grid"></div>
			<div className="auth-card">
				<div className="mb-10 flex justify-center">
					<a href="/">
						<BrandLogo subtitle="Visual Diagram Studio" />
					</a>
				</div>
				{children}
			</div>
		</div>
	);
}

import BrandLogo from '../../components/ui/BrandLogo.js';
import AnimatedBackground from '../../components/auth/AnimatedBackground.jsx';
import ClientToaster from '../../components/auth/ClientToaster.jsx';

export default function AuthLayout({ children }) {
	return (
		<div className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#0a0a0b] py-12 px-4 sm:px-6 lg:px-8">
			<AnimatedBackground />
			<ClientToaster />
			
			<div className="relative z-10 w-full max-w-[420px]">
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

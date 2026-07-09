import './globals.css';
import { Inter } from 'next/font/google';
import AuthInit from '../components/layout/AuthInit.js';
import Toast from '../components/ui/Toast.js';

const inter = Inter({
	subsets: ['latin'],
	display: 'swap',
	variable: '--font-inter'
});

export const metadata = {
	title: 'GraDiOl',
	description: 'Graphic Diagram Online',
	icons: {
		icon: '/favicon.svg'
	}
};

export default function RootLayout({ children }) {
	return (
		<html lang="en" className={inter.variable}>
			<body>
				<AuthInit />
				{children}
				<Toast />
			</body>
		</html>
	);
}

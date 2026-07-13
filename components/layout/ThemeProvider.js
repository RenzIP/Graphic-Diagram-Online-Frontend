'use client';

import { useEffect } from 'react';

export default function ThemeProvider({ children }) {
	useEffect(() => {
		const applyTheme = () => {
			try {
				const savedSettings = localStorage.getItem('user_settings');
				if (savedSettings) {
					const s = JSON.parse(savedSettings);
					let theme = s.theme;
					
					if (theme === 'system') {
						theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
					}
					
					if (theme === 'light') {
						document.documentElement.setAttribute('data-theme', 'light');
					} else {
						document.documentElement.removeAttribute('data-theme');
					}
				}
			} catch (e) {
				// Fallback to dark theme (no attribute)
				document.documentElement.removeAttribute('data-theme');
			}
		};

		applyTheme();

		// Listen for storage changes to update across tabs
		window.addEventListener('storage', (e) => {
			if (e.key === 'user_settings') {
				applyTheme();
			}
		});
		
		// If system changes preference
		const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
		const handler = () => applyTheme();
		mediaQuery.addEventListener('change', handler);
		
		return () => mediaQuery.removeEventListener('change', handler);
	}, []);

	return <>{children}</>;
}

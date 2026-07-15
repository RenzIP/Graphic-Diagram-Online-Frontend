'use client';

import { useEffect } from 'react';
import { preferencesStore } from '../../lib/stores/preferences.js';

export default function ThemeProvider({ children }) {
	useEffect(() => {
		const applyTheme = () => {
			let theme = preferencesStore.get().theme;

			if (theme === 'system') {
				theme = window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
			}

			if (theme === 'light') {
				document.documentElement.setAttribute('data-theme', 'light');
			} else {
				document.documentElement.removeAttribute('data-theme');
			}
		};

		// Re-apply whenever preferences change (settings page, other tabs).
		const unsubscribe = preferencesStore.subscribe(applyTheme);

		// If the system preference changes while on "system" theme.
		const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
		mediaQuery.addEventListener('change', applyTheme);

		return () => {
			unsubscribe();
			mediaQuery.removeEventListener('change', applyTheme);
		};
	}, []);

	return <>{children}</>;
}

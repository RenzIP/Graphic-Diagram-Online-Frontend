'use client';

import { useEffect, useState } from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { setAuthToken } from '../../../lib/stores/auth.js';

function AuthCallbackContent() {
	const searchParams = useSearchParams();
	const [message, setMessage] = useState('Completing sign in...');

	useEffect(() => {
		const token = searchParams.get('token');
		const error = searchParams.get('error');
		const redirectTo = searchParams.get('redirect') || '/dashboard';

		if (error) {
			window.location.href = `/login?error=${encodeURIComponent(error)}`;
			return;
		}
		if (!token) {
			window.location.href = '/login?error=Missing authentication token';
			return;
		}

		setAuthToken(token)
			.then(() => {
				const secure = window.location.protocol === 'https:' ? '; Secure' : '';
				localStorage.setItem('auth_token', token);
				document.cookie = `auth_token=${token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax${secure}`;
				window.location.href = redirectTo;
			})
			.catch(() => {
				setMessage('Authentication failed. Redirecting...');
				window.location.href = '/login?error=Authentication failed';
			});
	}, [searchParams]);

	return (
		<div className="auth-shell">
			<div className="auth-grid"></div>
			<div className="glass-panel relative z-10 rounded-[2rem] px-10 py-12 text-center text-slate-300">
				<div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-white/12 border-t-indigo-400"></div>
				<p className="text-base font-medium text-white">{message}</p>
				<p className="mt-2 text-sm text-slate-400">Securing your workspace and preparing the dashboard.</p>
			</div>
		</div>
	);
}

export default function AuthCallbackPage() {
	return (
		<Suspense fallback={null}>
			<AuthCallbackContent />
		</Suspense>
	);
}

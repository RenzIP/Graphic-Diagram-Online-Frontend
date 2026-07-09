'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useState } from 'react';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';
import { authApi } from '../../../lib/api/auth.js';

function LoginPageContent() {
	const searchParams = useSearchParams();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const oauthError = searchParams.get('error');

	function signInWithGoogle() {
		setLoading(true);
		setError('');
		window.location.href = authApi.getGoogleLoginUrl();
	}

	function signInWithGitHub() {
		setLoading(true);
		setError('');
		window.location.href = authApi.getGitHubLoginUrl();
	}

	return (
		<Card className="glass-panel rounded-[2rem] p-8 md:p-10">
			<div className="mb-8 text-center">
				<div className="section-kicker mb-4">
					<span className="h-2 w-2 rounded-full bg-emerald-400"></span>
					Workspace access
				</div>
				<h2 className="text-3xl font-semibold tracking-tight text-white">Welcome back</h2>
				<p className="mt-3 text-base leading-7 text-slate-300">Sign in to access your premium diagram workspace and continue collaborating in real time.</p>
			</div>
			{oauthError || error ? <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">{oauthError || error}</div> : null}
			<div className="space-y-4">
				<Button variant="outline" className="w-full justify-center bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900" onClick={signInWithGoogle} disabled={loading}>
					{loading ? 'Signing in...' : 'Sign in with Google'}
				</Button>
				<Button variant="secondary" className="w-full justify-center" onClick={signInWithGitHub} disabled={loading}>
					{loading ? 'Signing in...' : 'Sign in with GitHub'}
				</Button>
			</div>
			<div className="mt-8 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-center text-sm text-slate-300">
				Don't have an account? <a href="/register" className="font-semibold text-indigo-300 hover:text-white">Sign up</a>
			</div>
		</Card>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={null}>
			<LoginPageContent />
		</Suspense>
	);
}

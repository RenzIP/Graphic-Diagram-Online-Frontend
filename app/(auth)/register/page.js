'use client';

import { useState } from 'react';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';
import { authApi } from '../../../lib/api/auth.js';

export default function RegisterPage() {
	const [loading, setLoading] = useState(false);

	function signUpWithGoogle() {
		setLoading(true);
		window.location.href = authApi.getGoogleLoginUrl();
	}

	function signUpWithGitHub() {
		setLoading(true);
		window.location.href = authApi.getGitHubLoginUrl();
	}

	return (
		<Card className="glass-panel rounded-[2rem] p-8 md:p-10">
			<div className="mb-8 text-center">
				<div className="section-kicker mb-4">
					<span className="h-2 w-2 rounded-full bg-sky-400"></span>
					Start free
				</div>
				<h2 className="text-3xl font-semibold tracking-tight text-white">Create an account</h2>
				<p className="mt-3 text-base leading-7 text-slate-300">Start building polished diagrams with a workspace that feels production-ready from day one.</p>
			</div>
			<div className="space-y-4">
				<Button variant="outline" className="w-full justify-center bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900" onClick={signUpWithGoogle} disabled={loading}>{loading ? 'Signing up...' : 'Sign up with Google'}</Button>
				<Button variant="secondary" className="w-full justify-center" onClick={signUpWithGitHub} disabled={loading}>{loading ? 'Signing up...' : 'Sign up with GitHub'}</Button>
			</div>
			<div className="my-7 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
			<div className="text-center text-xs leading-6 text-slate-400">
				By signing up, you agree to our <a href="#terms" className="font-medium text-indigo-300 hover:text-white">Terms of Service</a> and <a href="#privacy" className="font-medium text-indigo-300 hover:text-white">Privacy Policy</a>.
			</div>
			<div className="mt-8 rounded-2xl border border-white/8 bg-white/4 px-4 py-4 text-center text-sm text-slate-300">
				Already have an account? <a href="/login" className="font-semibold text-indigo-300 hover:text-white">Log in</a>
			</div>
		</Card>
	);
}

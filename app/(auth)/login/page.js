'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';
import { authApi } from '../../../lib/api/auth.js';
import { authStore, setAuthToken } from '../../../lib/stores/auth.js';
import HuskyCharacter from '../../../components/auth/HuskyCharacter.jsx';

function LoginPageContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	
	const [loading, setLoading] = useState(false);
	const [identifier, setIdentifier] = useState('');
	const [password, setPassword] = useState('');
	const [showPassword, setShowPassword] = useState(false);
	const [rememberMe, setRememberMe] = useState(false);
	
	// Husky States
	const [focusedField, setFocusedField] = useState(null); // 'identifier', 'password', null
	const [loginStatus, setLoginStatus] = useState('idle'); // 'idle', 'success', 'error'
	
	// Modal States
	const [showNotFoundModal, setShowNotFoundModal] = useState(false);

	const oauthError = searchParams.get('error');
	if (oauthError && loginStatus === 'idle') {
		toast.error(`OAuth Error: ${oauthError}`, { id: 'oauth-error' });
	}

	const handleLogin = async (e) => {
		e.preventDefault();
		if (!identifier || !password) {
			toast.error('Please enter email and password');
			setLoginStatus('error');
			setTimeout(() => setLoginStatus('idle'), 2000);
			return;
		}

		setLoading(true);
		try {
			const res = await authApi.login({ identifier, password });
			setLoginStatus('success');
			toast.success('Login successful! Redirecting...');
			
			await setAuthToken(res.token, rememberMe);
			
			setTimeout(() => {
				const redirectTo = searchParams.get('redirect') || '/dashboard';
				router.push(redirectTo);
			}, 1500);
		} catch (error) {
			console.error('Login error:', error);
			setLoginStatus('error');
			setTimeout(() => setLoginStatus('idle'), 2000);
			
			const msg = error.message || 'Login failed';
			if (msg === 'account_not_found') {
				setShowNotFoundModal(true);
			} else {
				toast.error(msg === 'invalid username/email or password' ? 'Incorrect Email or Password' : msg);
			}
		} finally {
			setLoading(false);
		}
	};

	function signInWithGoogle() {
		setLoading(true);
		window.location.href = authApi.getGoogleLoginUrl();
	}

	function signInWithGitHub() {
		setLoading(true);
		window.location.href = authApi.getGitHubLoginUrl();
	}

	// Framer Motion Variants
	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1, delayChildren: 0.2 }
		}
	};
	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
	};

	return (
		<>
			<motion.div 
				variants={containerVariants}
				initial="hidden"
				animate="visible"
				className={loginStatus === 'error' ? 'animate-[shake_0.5s_ease-in-out]' : ''}
			>
				<Card className="glass-panel relative rounded-[24px] p-8 md:p-10 border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
					<motion.div variants={itemVariants}>
						<HuskyCharacter 
							isFocusedUsername={focusedField === 'identifier'}
							isFocusedPassword={focusedField === 'password'}
							isPasswordVisible={showPassword}
							loginStatus={loginStatus}
						/>
					</motion.div>

					<motion.div variants={itemVariants} className="mb-6 text-center">
						<h2 className="text-2xl font-bold tracking-tight text-white mb-2">Welcome GraDiol</h2>
						<p className="text-sm text-slate-400">Your Husky's keeping watch.</p>
					</motion.div>

					<form onSubmit={handleLogin} className="space-y-4">
						<motion.div variants={itemVariants} className="space-y-4">
							{/* Email/Username Input */}
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Mail className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'identifier' ? 'text-indigo-400' : 'text-slate-500'}`} />
								</div>
								<input
									type="text"
									value={identifier}
									onChange={(e) => setIdentifier(e.target.value)}
									onFocus={() => setFocusedField('identifier')}
									onBlur={() => setFocusedField(null)}
									className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 sm:text-sm"
									placeholder="Email or Username"
									disabled={loading}
								/>
							</div>

							{/* Password Input */}
							<div className="relative group">
								<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
									<Lock className={`h-5 w-5 transition-colors duration-200 ${focusedField === 'password' ? 'text-indigo-400' : 'text-slate-500'}`} />
								</div>
								<input
									type={showPassword ? "text" : "password"}
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									onFocus={() => setFocusedField('password')}
									onBlur={() => setFocusedField(null)}
									className="block w-full pl-10 pr-10 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all duration-200 sm:text-sm"
									placeholder="Password"
									disabled={loading}
								/>
								<button
									type="button"
									onClick={() => setShowPassword(!showPassword)}
									className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white transition-colors"
									tabIndex="-1"
								>
									{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
								</button>
							</div>
						</motion.div>

						<motion.div variants={itemVariants} className="flex items-center justify-between text-sm">
							<div className="flex items-center">
								<input
									id="remember-me"
									name="remember-me"
									type="checkbox"
									checked={rememberMe}
									onChange={(e) => setRememberMe(e.target.checked)}
									className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 bg-white/5"
								/>
								<label htmlFor="remember-me" className="ml-2 block text-slate-300">
									Remember me
								</label>
							</div>
							<div className="text-sm">
								<a href="/forgot-password" className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
									Forgot password?
								</a>
							</div>
						</motion.div>

						<motion.div variants={itemVariants}>
							<Button 
								type="submit" 
								className="w-full justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
								disabled={loading}
							>
								{loading && loginStatus !== 'success' ? (
									<><Loader2 className="animate-spin mr-2 h-4 w-4" /> Signing in...</>
								) : (
									'Sign in'
								)}
							</Button>
						</motion.div>
					</form>

					<motion.div variants={itemVariants} className="mt-6">
						<div className="relative">
							<div className="absolute inset-0 flex items-center">
								<div className="w-full border-t border-white/10" />
							</div>
							<div className="relative flex justify-center text-sm">
								<span className="px-2 bg-transparent text-slate-500 backdrop-blur-md">Or continue with</span>
							</div>
						</div>

						<div className="mt-6 grid grid-cols-2 gap-3">
							<Button variant="outline" className="w-full justify-center bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={signInWithGoogle} disabled={loading}>
								<svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
									<path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
									<path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
									<path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
									<path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
								</svg>
								Google
							</Button>
							<Button variant="outline" className="w-full justify-center bg-white/5 border-white/10 text-white hover:bg-white/10" onClick={signInWithGitHub} disabled={loading}>
								<svg className="h-5 w-5 mr-2 text-white" viewBox="0 0 24 24" fill="currentColor">
									<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.379.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.418 22 12c0-5.523-4.477-10-10-10z" />
								</svg>
								GitHub
							</Button>
						</div>
					</motion.div>
				</Card>

				<motion.div variants={itemVariants} className="mt-8 text-center text-sm text-slate-300">
					New to Den? <a href="/register" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">Create account</a>
				</motion.div>
			</motion.div>

			{/* Account Not Found Modal */}
			<AnimatePresence>
				{showNotFoundModal && (
					<motion.div 
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
					>
						<motion.div
							initial={{ scale: 0.95, opacity: 0 }}
							animate={{ scale: 1, opacity: 1 }}
							exit={{ scale: 0.95, opacity: 0 }}
							className="bg-slate-900 border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
						>
							<h3 className="text-xl font-semibold text-white mb-2">Account Not Found</h3>
							<p className="text-slate-300 mb-6 text-sm">We couldn't find an account associated with this email or username. Would you like to create a new one?</p>
							<div className="flex flex-col space-y-3">
								<Button className="w-full justify-center bg-indigo-600 hover:bg-indigo-700 text-white" onClick={() => router.push('/register')}>
									Register New Account
								</Button>
								<Button variant="outline" className="w-full justify-center border-white/10 text-slate-300 hover:bg-white/5" onClick={() => setShowNotFoundModal(false)}>
									Cancel
								</Button>
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}

export default function LoginPage() {
	return (
		<Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin text-indigo-500" /></div>}>
			<LoginPageContent />
		</Suspense>
	);
}

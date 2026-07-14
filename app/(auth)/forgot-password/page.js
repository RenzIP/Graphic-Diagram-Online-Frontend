'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';

export default function ForgotPasswordPage() {
	const [loading, setLoading] = useState(false);
	const [email, setEmail] = useState('');
	const [isSubmitted, setIsSubmitted] = useState(false);

	const handleReset = async (e) => {
		e.preventDefault();
		if (!email) {
			toast.error('Please enter your email address');
			return;
		}

		setLoading(true);
		try {
			// Simulate API call for reset password
			// await authApi.forgotPassword({ email });
			await new Promise(resolve => setTimeout(resolve, 1500));
			setIsSubmitted(true);
		} catch (error) {
			toast.error('Failed to send reset link. Please try again.');
		} finally {
			setLoading(false);
		}
	};

	const containerVariants = {
		hidden: { opacity: 0 },
		visible: {
			opacity: 1,
			transition: { staggerChildren: 0.1, delayChildren: 0.1 }
		}
	};
	const itemVariants = {
		hidden: { opacity: 0, y: 20 },
		visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
	};

	return (
		<motion.div 
			variants={containerVariants}
			initial="hidden"
			animate="visible"
		>
			<Card className="glass-panel relative rounded-[24px] p-8 md:p-10 border border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl overflow-hidden">
				{!isSubmitted ? (
					<>
						<motion.div variants={itemVariants} className="mb-6 text-center">
							<h2 className="text-2xl font-bold tracking-tight text-white mb-2">Reset Password</h2>
							<p className="text-sm text-slate-400">Enter your email address and we'll send you a link to reset your password.</p>
						</motion.div>

						<form onSubmit={handleReset} className="space-y-4">
							<motion.div variants={itemVariants} className="space-y-4">
								<div className="relative group">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Mail className="h-5 w-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
									</div>
									<input
										type="email"
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										className="block w-full pl-10 pr-3 py-3 border border-white/10 rounded-xl bg-white/5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all sm:text-sm"
										placeholder="Email Address"
										disabled={loading}
									/>
								</div>
							</motion.div>

							<motion.div variants={itemVariants}>
								<Button 
									type="submit" 
									className="w-full justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)] transition-all"
									disabled={loading}
								>
									{loading ? (
										<><Loader2 className="animate-spin mr-2 h-4 w-4" /> Sending link...</>
									) : (
										'Send reset link'
									)}
								</Button>
							</motion.div>
						</form>
					</>
				) : (
					<motion.div variants={itemVariants} className="text-center py-4">
						<div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/20 mb-4">
							<CheckCircle2 className="h-6 w-6 text-emerald-400" />
						</div>
						<h3 className="text-xl font-medium text-white mb-2">Check your email</h3>
						<p className="text-sm text-slate-400 mb-6">
							We've sent a password reset link to <br />
							<span className="font-medium text-white">{email}</span>
						</p>
					</motion.div>
				)}

				<motion.div variants={itemVariants} className="mt-8 text-center text-sm">
					<a href="/login" className="inline-flex items-center font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to log in
					</a>
				</motion.div>
			</Card>
		</motion.div>
	);
}

'use client';

import { motion } from 'framer-motion';

export default function AnimatedBackground() {
	return (
		<div className="fixed inset-0 z-0 overflow-hidden bg-[#0a0a0b]">
			{/* Noise Overlay for premium texture */}
			<div 
				className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
				style={{
					backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
				}}
			/>
			
			{/* Animated Blur Orbs (Aurora Effect) */}
			<motion.div
				className="absolute -top-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-indigo-500/20 blur-[120px]"
				animate={{
					x: [0, 50, 0],
					y: [0, 30, 0],
					scale: [1, 1.1, 1],
				}}
				transition={{
					duration: 15,
					repeat: Infinity,
					ease: "easeInOut"
				}}
			/>
			<motion.div
				className="absolute top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-purple-500/20 blur-[140px]"
				animate={{
					x: [0, -40, 0],
					y: [0, 50, 0],
					scale: [1, 1.2, 1],
				}}
				transition={{
					duration: 20,
					repeat: Infinity,
					ease: "easeInOut"
				}}
			/>
			<motion.div
				className="absolute -bottom-[20%] left-[20%] w-[70vw] h-[70vw] rounded-full bg-emerald-500/10 blur-[130px]"
				animate={{
					x: [0, 60, 0],
					y: [0, -40, 0],
					scale: [1, 1.1, 1],
				}}
				transition={{
					duration: 25,
					repeat: Infinity,
					ease: "easeInOut"
				}}
			/>
			
			{/* subtle grid mesh */}
			<div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)]"></div>
		</div>
	);
}

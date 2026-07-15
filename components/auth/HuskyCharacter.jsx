'use client';

import { motion, useAnimation, useMotionValue, useTransform } from 'framer-motion';
import { useEffect, useState } from 'react';

export default function HuskyCharacter({ 
	isFocusedUsername, 
	isFocusedPassword, 
	isPasswordVisible, 
	loginStatus // 'idle', 'success', 'error'
}) {
	// Mouse tracking for eyes
	const mouseX = useMotionValue(0);
	const mouseY = useMotionValue(0);

	// Map mouse position to eye movement (-5 to 5 pixels)
	const eyeX = useTransform(mouseX, [0, typeof window !== 'undefined' ? window.innerWidth : 1000], [-6, 6]);
	const eyeY = useTransform(mouseY, [0, typeof window !== 'undefined' ? window.innerHeight : 1000], [-4, 4]);

	// Animations
	const leftPawControls = useAnimation();
	const rightPawControls = useAnimation();
	const earsControls = useAnimation();
	const bodyControls = useAnimation();

	useEffect(() => {
		const handleMouseMove = (e) => {
			mouseX.set(e.clientX);
			mouseY.set(e.clientY);
		};
		window.addEventListener('mousemove', handleMouseMove);
		return () => window.removeEventListener('mousemove', handleMouseMove);
	}, [mouseX, mouseY]);

	// Breathing animation
	useEffect(() => {
		if (loginStatus === 'idle') {
			bodyControls.start({
				y: [0, -3, 0],
				transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' }
			});
			earsControls.start({
				rotate: [0, -2, 0, 2, 0],
				transition: { duration: 5, repeat: Infinity, ease: 'easeInOut' }
			});
		} else if (loginStatus === 'success') {
			bodyControls.start({
				y: [0, -10, 0],
				transition: { duration: 0.5, ease: 'easeOut' }
			});
		}
	}, [loginStatus, bodyControls, earsControls]);

	// Password state animations
	useEffect(() => {
		if (isFocusedPassword) {
			if (isPasswordVisible) {
				// Password visible: paws down (uncover eyes)
				leftPawControls.start({
					y: 0,
					x: 0,
					rotate: 0,
					transition: { type: 'spring', stiffness: 200, damping: 15 }
				});
				rightPawControls.start({
					y: 0,
					x: 0,
					rotate: 0,
					transition: { type: 'spring', stiffness: 200, damping: 15 }
				});
			} else {
				// Cover eyes (move up and together)
				leftPawControls.start({
					y: -60,
					x: 15,
					rotate: 10,
					transition: { type: 'spring', stiffness: 200, damping: 15 }
				});
				rightPawControls.start({
					y: -60,
					x: -15,
					rotate: -10,
					transition: { type: 'spring', stiffness: 200, damping: 15 }
				});
			}
		} else {
			// Back to normal (paws down)
			leftPawControls.start({
				y: 0,
				x: 0,
				rotate: 0,
				transition: { type: 'spring', stiffness: 200, damping: 15 }
			});
			rightPawControls.start({
				y: 0,
				x: 0,
				rotate: 0,
				transition: { type: 'spring', stiffness: 200, damping: 15 }
			});
		}
	}, [isFocusedPassword, isPasswordVisible, leftPawControls, rightPawControls]);

	const isSad = loginStatus === 'error';
	const isHappy = loginStatus === 'success';

	return (
		<div className="relative w-40 h-40 mx-auto -mt-16 mb-4 select-none">
			<motion.div animate={bodyControls} className="relative w-full h-full">
				
				{/* Ears */}
				<motion.svg animate={earsControls} className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 200 200">
					{/* Left Ear */}
					<path d="M 45 80 Q 20 20 60 40 L 75 75 Z" fill="#4B5563" stroke="#374151" strokeWidth="2" />
					<path d="M 50 75 Q 35 35 60 45 L 70 70 Z" fill="#F3F4F6" />
					{/* Right Ear */}
					<path d="M 155 80 Q 180 20 140 40 L 125 75 Z" fill="#4B5563" stroke="#374151" strokeWidth="2" />
					<path d="M 150 75 Q 165 35 140 45 L 130 70 Z" fill="#F3F4F6" />
				</motion.svg>

				{/* Head Base */}
				<svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 200 200">
					<path d="M 30 110 C 30 50, 170 50, 170 110 C 170 160, 130 180, 100 180 C 70 180, 30 160, 30 110 Z" fill="#4B5563" stroke="#374151" strokeWidth="2" />
					
					{/* White Face Area */}
					<path d="M 100 80 C 40 80, 40 150, 60 165 C 80 180, 100 180, 100 180 C 100 180, 120 180, 140 165 C 160 150, 160 80, 100 80 Z" fill="#F9FAFB" />
					<path d="M 75 75 C 60 75, 45 100, 50 120 C 60 135, 100 110, 100 95 C 100 85, 90 75, 75 75 Z" fill="#F9FAFB" />
					<path d="M 125 75 C 140 75, 155 100, 150 120 C 140 135, 100 110, 100 95 C 100 85, 110 75, 125 75 Z" fill="#F9FAFB" />
				</svg>

				{/* Eyes & Brows & Nose & Mouth */}
				<svg className="absolute inset-0 w-full h-full overflow-visible" viewBox="0 0 200 200">
					{/* Brows */}
					{isSad ? (
						<g>
							<path d="M 60 90 Q 75 80 85 95" fill="none" stroke="#F3F4F6" strokeWidth="4" strokeLinecap="round" />
							<path d="M 140 90 Q 125 80 115 95" fill="none" stroke="#F3F4F6" strokeWidth="4" strokeLinecap="round" />
						</g>
					) : isHappy ? (
						<g>
							<path d="M 60 95 Q 75 80 90 95" fill="none" stroke="#F3F4F6" strokeWidth="4" strokeLinecap="round" />
							<path d="M 140 95 Q 125 80 110 95" fill="none" stroke="#F3F4F6" strokeWidth="4" strokeLinecap="round" />
						</g>
					) : (
						<g>
							<path d="M 60 90 Q 75 85 90 95" fill="none" stroke="#F3F4F6" strokeWidth="4" strokeLinecap="round" />
							<path d="M 140 90 Q 125 85 110 95" fill="none" stroke="#F3F4F6" strokeWidth="4" strokeLinecap="round" />
						</g>
					)}

					{/* Eyes Base (White) */}
					<circle cx="75" cy="115" r="14" fill="#FFFFFF" stroke="#374151" strokeWidth="2" />
					<circle cx="125" cy="115" r="14" fill="#FFFFFF" stroke="#374151" strokeWidth="2" />
					
					{/* Pupils (Animated based on mouse unless closed) */}
					{!(isFocusedPassword && !isPasswordVisible) && !isSad && !isHappy ? (
						<motion.g style={{ x: eyeX, y: eyeY }}>
							<circle cx="75" cy="115" r="7" fill="#111827" />
							<circle cx="125" cy="115" r="7" fill="#111827" />
							<circle cx="73" cy="113" r="2" fill="#FFFFFF" />
							<circle cx="123" cy="113" r="2" fill="#FFFFFF" />
						</motion.g>
					) : isSad ? (
						<g>
							<path d="M 65 115 Q 75 110 85 115" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
							<path d="M 115 115 Q 125 110 135 115" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
						</g>
					) : isHappy ? (
						<g>
							<path d="M 65 115 Q 75 105 85 115" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
							<path d="M 115 115 Q 125 105 135 115" fill="none" stroke="#111827" strokeWidth="4" strokeLinecap="round" />
						</g>
					) : (
						<g>
							<circle cx="75" cy="115" r="7" fill="#111827" />
							<circle cx="125" cy="115" r="7" fill="#111827" />
						</g>
					)}

					{/* Nose */}
					<path d="M 90 135 Q 100 130 110 135 L 105 145 Q 100 150 95 145 Z" fill="#111827" />
					
					{/* Mouth */}
					{isSad ? (
						<path d="M 90 155 Q 100 150 110 155" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
					) : isHappy ? (
						<path d="M 85 155 Q 100 165 115 155" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
					) : (
						<path d="M 90 155 Q 100 160 110 155" fill="none" stroke="#111827" strokeWidth="2" strokeLinecap="round" />
					)}
					<path d="M 100 145 L 100 155" stroke="#111827" strokeWidth="2" />
					
					{/* Pink Cheeks */}
					<circle cx="55" cy="130" r="8" fill="#FCA5A5" opacity="0.4" />
					<circle cx="145" cy="130" r="8" fill="#FCA5A5" opacity="0.4" />
				</svg>

				{/* Paws */}
				<svg className="absolute inset-0 w-full h-full pointer-events-none overflow-visible" viewBox="0 0 200 200">
					{/* Left Paw */}
					<motion.g animate={leftPawControls} initial={{ y: 0, x: 0, rotate: 0 }} style={{ transformOrigin: '75px 185px' }}>
						<g transform="translate(60, 185)">
							<path d="M -15 0 C -15 -25, 15 -25, 15 0 Z" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="2" />
							<path d="M -5 -20 L -5 -5 M 5 -20 L 5 -5" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
						</g>
					</motion.g>
					{/* Right Paw */}
					<motion.g animate={rightPawControls} initial={{ y: 0, x: 0, rotate: 0 }} style={{ transformOrigin: '125px 185px' }}>
						<g transform="translate(140, 185)">
							<path d="M -15 0 C -15 -25, 15 -25, 15 0 Z" fill="#F9FAFB" stroke="#D1D5DB" strokeWidth="2" />
							<path d="M -5 -20 L -5 -5 M 5 -20 L 5 -5" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
						</g>
					</motion.g>
				</svg>

			</motion.div>
		</div>
	);
}

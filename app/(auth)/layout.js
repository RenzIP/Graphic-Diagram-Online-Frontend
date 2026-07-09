export default function AuthLayout({ children }) {
	return (
		<div className="auth-shell">
			<div className="auth-grid"></div>
			<div className="auth-card">
				<div className="mb-10 flex justify-center">
					<a href="/" className="flex items-center gap-3">
						<div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-indigo-500 via-violet-500 to-sky-500 shadow-[0_22px_50px_rgba(99,102,241,0.34)]">
							<svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
							</svg>
						</div>
						<div>
							<p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-slate-500">Diagram Workspace</p>
							<span className="text-3xl font-semibold tracking-tight text-white">GraDiOl</span>
						</div>
					</a>
				</div>
				{children}
			</div>
		</div>
	);
}

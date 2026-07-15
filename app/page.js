import Button from '../components/ui/Button.js';
import BrandLogo from '../components/ui/BrandLogo.js';
import Card from '../components/ui/Card.js';

const features = [
	{
		title: 'Visual speed, text precision',
		description: 'Move between canvas and DSL without friction. Teams can draft ideas fast, then refine them with structure.',
		accent: 'linear-gradient(135deg, rgba(99,102,241,0.75), rgba(56,189,248,0.75))'
	},
	{
		title: 'Collaboration built into the canvas',
		description: 'Presence, autosave, version history, and editor feedback stay visible without turning the UI into noise.',
		accent: 'linear-gradient(135deg, rgba(124,58,237,0.75), rgba(99,102,241,0.75))'
	},
	{
		title: 'Production-grade outputs',
		description: 'Export diagrams in the formats teams already expect while keeping the workspace calm, sharp, and consistent.',
		accent: 'linear-gradient(135deg, rgba(56,189,248,0.75), rgba(34,197,94,0.72))'
	}
];

const stats = [
	['Hybrid workflow', 'Visual + DSL editing'],
	['Cloud-ready', 'Realtime teamwork'],
	['Export suite', 'PNG, SVG, JSON, DSL']
];

export default function HomePage() {
	return (
		<div className="min-h-screen overflow-hidden text-white">
			<div className="hero-orb left-[-8rem] top-[4rem] h-72 w-72 bg-indigo-500/30"></div>
			<div className="hero-orb right-[-6rem] top-[16rem] h-80 w-80 bg-sky-500/24"></div>
			<div className="hero-orb bottom-[-10rem] left-[22%] h-80 w-80 bg-violet-500/20"></div>

			<nav className="fixed top-0 z-50 w-full border-b border-white/8 bg-slate-950/55 backdrop-blur-xl">
				<div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
					<a href="/">
						<BrandLogo markClassName="h-11 w-11" iconClassName="h-5 w-5" nameClassName="text-xl font-semibold tracking-tight text-white" subtitle="Visual Diagram Studio" />
					</a>

					<div className="flex items-center gap-3">
						<Button variant="ghost" size="sm" href="/login">Log in</Button>
						<Button variant="primary" size="sm" href="/register">Start free</Button>
					</div>
				</div>
			</nav>

			<section className="relative px-4 pt-32 pb-20 sm:px-6 lg:px-8">
				<div className="hero-grid absolute inset-x-0 top-0 h-[720px]"></div>
				<div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
					<div className="relative z-10">
						<div className="section-kicker mb-6">
							<span className="h-2 w-2 rounded-full bg-emerald-400"></span>
							Premium SaaS Diagramming
						</div>
						<h1 className="max-w-4xl text-5xl font-semibold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
							Design clear systems with a workspace that feels global from the first click.
						</h1>
						<p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
							GraDiOl blends diagram editing, structured DSL authoring, and realtime collaboration into a polished interface built for modern product, engineering, and operations teams.
						</p>
						<div className="mt-10 flex flex-col gap-4 sm:flex-row">
							<Button variant="primary" size="lg" href="/dashboard" className="px-7">Launch dashboard</Button>
							<Button variant="outline" size="lg" href="/dashboard" className="px-7">Explore demo</Button>
						</div>
						<div className="mt-10 grid gap-4 sm:grid-cols-3">
							{stats.map(([label, value]) => (
								<div key={label} className="rounded-2xl border border-white/8 bg-white/4 p-4 backdrop-blur-sm">
									<div className="text-sm font-medium text-white">{label}</div>
									<div className="mt-1 text-sm text-slate-400">{value}</div>
								</div>
							))}
						</div>
					</div>

					<div className="relative">
						<div className="glass-panel relative overflow-hidden rounded-[2rem] p-4 shadow-[0_30px_90px_rgba(15,23,42,0.4)]">
							<div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-sky-500/10"></div>
							<div className="relative rounded-[1.6rem] border border-white/8 bg-slate-950/50">
								<div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
									<div className="flex items-center gap-3">
										<div className="flex gap-2">
											<span className="h-3 w-3 rounded-full bg-red-400/70"></span>
											<span className="h-3 w-3 rounded-full bg-amber-400/70"></span>
											<span className="h-3 w-3 rounded-full bg-emerald-400/70"></span>
										</div>
										<span className="text-sm text-slate-400">Realtime diagram workspace</span>
									</div>
									<span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-200">Live</span>
								</div>
								<div className="grid gap-4 p-4 lg:grid-cols-[220px_1fr]">
									<div className="rounded-[1.4rem] border border-white/8 bg-white/4 p-4">
										<div className="mb-4 text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-slate-500">Shape library</div>
										<div className="space-y-3">
											{['Flowchart', 'ERD', 'Network', 'UML'].map((item, index) => (
												<div key={item} className="flex items-center gap-3 rounded-2xl border border-white/6 bg-slate-950/35 px-3 py-3">
													<div className="h-9 w-9 rounded-xl" style={{ background: index % 2 === 0 ? 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(124,58,237,0.2))' : 'linear-gradient(135deg, rgba(56,189,248,0.35), rgba(99,102,241,0.16))' }}></div>
													<div>
														<div className="text-sm font-medium text-white">{item}</div>
														<div className="text-xs text-slate-500">Curated shapes</div>
													</div>
												</div>
											))}
										</div>
									</div>

									<div className="rounded-[1.4rem] border border-white/8 bg-slate-950/35 p-4">
										<div className="mb-4 flex items-center justify-between">
											<div>
												<div className="text-sm font-semibold text-white">Checkout Flow</div>
												<div className="text-xs text-slate-500">Autosaved 12 seconds ago</div>
											</div>
											<div className="flex items-center gap-2">
												<span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300">DSL</span>
												<span className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-slate-300">Canvas</span>
											</div>
										</div>
										<div className="rounded-[1.4rem] border border-white/8 bg-[#0a1120] p-4">
											<svg className="h-[300px] w-full" viewBox="0 0 780 420">
												<defs>
													<linearGradient id="nodeFill" x1="0%" x2="100%" y1="0%" y2="100%">
														<stop offset="0%" stopColor="#1f2a44" />
														<stop offset="100%" stopColor="#10192d" />
													</linearGradient>
													<linearGradient id="line" x1="0%" x2="100%" y1="0%" y2="0%">
														<stop offset="0%" stopColor="#818cf8" />
														<stop offset="100%" stopColor="#38bdf8" />
													</linearGradient>
													<pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
														<circle cx="1.5" cy="1.5" r="1.2" fill="#24324d" />
													</pattern>
												</defs>
												<rect width="100%" height="100%" rx="20" fill="url(#dots)" />
												<g transform="translate(56 96)">
													<rect width="148" height="70" rx="20" fill="url(#nodeFill)" stroke="#334155" />
													<text x="74" y="38" fill="#ffffff" fontSize="16" fontWeight="600" textAnchor="middle">Cart review</text>
													<text x="74" y="56" fill="#8892a6" fontSize="12" textAnchor="middle">Customer validates order</text>
												</g>
												<path d="M204 131H316" stroke="url(#line)" strokeWidth="4" strokeLinecap="round" />
												<g transform="translate(316 72)">
													<rect width="148" height="118" rx="26" fill="url(#nodeFill)" stroke="#334155" />
													<text x="74" y="36" fill="#ffffff" fontSize="16" fontWeight="600" textAnchor="middle">Payment check</text>
													<text x="74" y="62" fill="#8892a6" fontSize="12" textAnchor="middle">Card authorized?</text>
													<rect x="22" y="78" width="104" height="22" rx="11" fill="rgba(56,189,248,0.12)" stroke="#38bdf8" />
													<text x="74" y="93" fill="#bae6fd" fontSize="11" textAnchor="middle">Decision node</text>
												</g>
												<path d="M464 131H578" stroke="url(#line)" strokeWidth="4" strokeLinecap="round" />
												<g transform="translate(578 96)">
													<rect width="148" height="70" rx="20" fill="url(#nodeFill)" stroke="#334155" />
													<text x="74" y="38" fill="#ffffff" fontSize="16" fontWeight="600" textAnchor="middle">Order complete</text>
													<text x="74" y="56" fill="#8892a6" fontSize="12" textAnchor="middle">Receipt and fulfillment</text>
												</g>
												<path d="M390 190V274H190V178" stroke="#64748b" strokeWidth="3" strokeDasharray="8 8" fill="none" />
												<g transform="translate(116 274)">
													<rect width="148" height="62" rx="18" fill="#111827" stroke="#334155" />
													<text x="74" y="35" fill="#ffffff" fontSize="15" fontWeight="600" textAnchor="middle">Retry checkout</text>
												</g>
											</svg>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			<section className="px-4 py-12 sm:px-6 lg:px-8">
				<div className="mx-auto grid max-w-7xl gap-6 md:grid-cols-3">
					{features.map((feature) => (
						<Card key={feature.title} className="rounded-[1.75rem] p-6">
							<div className="mb-5 h-1.5 w-24 rounded-full" style={{ background: feature.accent }}></div>
							<h3 className="text-xl font-semibold text-white">{feature.title}</h3>
							<p className="mt-3 leading-7 text-slate-300">{feature.description}</p>
						</Card>
					))}
				</div>
			</section>

			<section className="px-4 py-16 sm:px-6 lg:px-8">
				<div className="glass-panel mx-auto max-w-7xl rounded-[2rem] p-8 lg:p-10">
					<div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
						<div>
							<div className="section-kicker mb-5">
								<span className="h-2 w-2 rounded-full bg-sky-400"></span>
								Ready for product teams
							</div>
							<h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">A design language that finally matches the quality of the editor.</h2>
							<p className="mt-4 max-w-3xl text-base leading-8 text-slate-300">
								From landing page to workspace to editor panels, every surface now follows the same premium visual system: layered backgrounds, soft glass, richer hierarchy, and motion that feels intentional instead of noisy.
							</p>
						</div>
						<div className="flex flex-col gap-3 sm:flex-row">
							<Button variant="primary" size="lg" href="/register">Create workspace</Button>
							<Button variant="outline" size="lg" href="/login">Book a walkthrough</Button>
						</div>
					</div>
				</div>
			</section>

			<footer className="border-t border-white/8 px-4 py-8 sm:px-6 lg:px-8">
				<div className="mx-auto flex max-w-7xl flex-col gap-4 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
					<div>
						<div className="font-medium text-slate-200">GraDiOl</div>
						<div>Graphic Diagram Online for premium modern teams.</div>
					</div>
					<div className="flex gap-6">
						<a href="/login" className="hover:text-white">Login</a>
						<a href="/register" className="hover:text-white">Register</a>
						<a href="/dashboard" className="hover:text-white">Dashboard</a>
					</div>
				</div>
			</footer>
		</div>
	);
}

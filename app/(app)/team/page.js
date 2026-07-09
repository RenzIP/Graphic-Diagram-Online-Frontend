import AppSidebar from '../../../components/layout/AppSidebar.js';
import Card from '../../../components/ui/Card.js';

export default function TeamPage() {
	return (
		<div className="page-shell">
			<AppSidebar />
			<main className="page-main">
				<header className="page-header">
					<div>
						<div className="section-kicker">
							<span className="h-2 w-2 rounded-full bg-sky-400"></span>
							Collaboration
						</div>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Team Members</h1>
						<p className="mt-2 text-sm leading-6 text-slate-400">Area ini disiapkan untuk pengelolaan anggota workspace dengan visual yang konsisten dengan shell aplikasi.</p>
					</div>
				</header>
				<div className="page-content">
					<Card className="empty-state rounded-[1.75rem] border-dashed p-16">
						<h2 className="mb-2 text-xl font-semibold text-white">Team management</h2>
						<p className="max-w-md text-sm leading-6 text-slate-500">Workspace team members will appear here once collaboration management is connected to this screen.</p>
					</Card>
				</div>
			</main>
		</div>
	);
}

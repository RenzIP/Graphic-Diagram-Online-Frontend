'use client';

import { useState } from 'react';
import AppSidebar from '../../../components/layout/AppSidebar.js';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';

export default function SettingsPage() {
	const [isSaving, setIsSaving] = useState(false);
	const [settings, setSettings] = useState({
		theme: 'dark',
		notifications: true,
		autoSave: true,
		gridSize: 20
	});

	function saveSettings() {
		setIsSaving(true);
		setTimeout(() => setIsSaving(false), 800);
	}

	return (
		<div className="page-shell">
			<AppSidebar />
			<main className="page-main">
				<header className="page-header">
					<div>
						<div className="section-kicker">
							<span className="h-2 w-2 rounded-full bg-emerald-400"></span>
							Workspace preferences
						</div>
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">Settings</h1>
						<p className="mt-2 text-sm leading-6 text-slate-400">Sesuaikan perilaku editor, visual defaults, dan preferensi kerja tim Anda.</p>
					</div>
					<Button variant="primary" size="sm" onClick={saveSettings} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</Button>
				</header>
				<div className="page-content">
					<div className="max-w-3xl space-y-6">
						<Card className="rounded-[1.75rem] p-6">
							<h2 className="mb-5 text-xl font-semibold text-white">Preferences</h2>
							<div className="space-y-5">
								<div>
									<label className="field-label">Theme</label>
									<select value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value }))} className="field">
										<option value="dark">Dark</option>
										<option value="system">System</option>
									</select>
								</div>
								<label className="flex items-center justify-between rounded-[1.35rem] border border-white/8 bg-white/5 p-4">
									<span><span className="block text-sm font-medium text-slate-100">Notifications</span><span className="text-xs text-slate-500">Receive collaboration updates</span></span>
									<input type="checkbox" checked={settings.notifications} onChange={() => setSettings((s) => ({ ...s, notifications: !s.notifications }))} />
								</label>
								<label className="flex items-center justify-between rounded-[1.35rem] border border-white/8 bg-white/5 p-4">
									<span><span className="block text-sm font-medium text-slate-100">Auto Save</span><span className="text-xs text-slate-500">Save diagrams automatically</span></span>
									<input type="checkbox" checked={settings.autoSave} onChange={() => setSettings((s) => ({ ...s, autoSave: !s.autoSave }))} />
								</label>
								<div>
									<label className="field-label">Grid Size</label>
									<input type="range" min="10" max="50" value={settings.gridSize} onChange={(e) => setSettings((s) => ({ ...s, gridSize: Number(e.target.value) }))} className="w-full accent-indigo-500" />
									<div className="mt-2 text-sm text-slate-500">{settings.gridSize}px spacing</div>
								</div>
							</div>
						</Card>
					</div>
				</div>
			</main>
		</div>
	);
}

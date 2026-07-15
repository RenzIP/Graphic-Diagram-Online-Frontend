'use client';

import { useState, useEffect } from 'react';
import AppSidebar from '../../../components/layout/AppSidebar.js';
import Button from '../../../components/ui/Button.js';
import Card from '../../../components/ui/Card.js';
import { currentUserStore, updateProfile } from '../../../lib/stores/auth.js';
import { preferencesStore } from '../../../lib/stores/preferences.js';
import { useStore } from '../../../hooks/useStore.js';

export default function SettingsPage() {
	const user = useStore(currentUserStore());
	const settings = useStore(preferencesStore);
	const [isSaving, setIsSaving] = useState(false);
	const [saveMessage, setSaveMessage] = useState('');

	const [profile, setProfile] = useState({
		fullName: '',
		username: ''
	});

	const setSettings = (updater) => {
		const next = typeof updater === 'function' ? updater(preferencesStore.get()) : updater;
		preferencesStore.save(next);
	};

	useEffect(() => {
		if (user) {
			setProfile({
				fullName: user.name || user.full_name || '',
				username: user.username || ''
			});
		}
	}, [user]);

	async function saveSettings() {
		setIsSaving(true);
		setSaveMessage('');

		try {
			// Persist preferences through the shared store (updates localStorage
			// and notifies the editor/grid/theme subscribers immediately).
			preferencesStore.save(settings);

			// Update profile on the backend. "name" is the display name used across
			// the app (sidebar, dashboard); keep full_name in sync for legacy reads.
			const currentName = user?.name || user?.full_name || '';
			if (user && (profile.fullName !== currentName || profile.username !== user.username)) {
				await updateProfile({
					name: profile.fullName || null,
					full_name: profile.fullName || null,
					username: profile.username || null
				});
			}
			
			setSaveMessage('Settings saved successfully!');
		} catch (error) {
			setSaveMessage('Failed to save settings: ' + (error.message || 'Unknown error'));
		} finally {
			setIsSaving(false);
			setTimeout(() => setSaveMessage(''), 3000);
		}
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
						<h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text-primary)]">Settings</h1>
						<p className="mt-2 text-sm leading-6 text-slate-400">Sesuaikan perilaku editor, visual defaults, dan preferensi kerja tim Anda.</p>
					</div>
					<div className="flex items-center gap-3">
						{saveMessage && <span className="text-sm text-emerald-400">{saveMessage}</span>}
						<Button variant="primary" size="sm" onClick={saveSettings} disabled={isSaving}>
							{isSaving ? 'Saving...' : 'Save Changes'}
						</Button>
					</div>
				</header>
				<div className="page-content">
					<div className="max-w-3xl space-y-6">
						<Card className="rounded-[1.75rem] p-6">
							<h2 className="mb-5 text-xl font-semibold text-[var(--text-primary)]">Profile</h2>
							<div className="space-y-5">
								<div>
									<label className="field-label">Full Name</label>
									<input 
										type="text" 
										value={profile.fullName} 
										onChange={(e) => setProfile((s) => ({ ...s, fullName: e.target.value }))} 
										className="field" 
										placeholder="John Doe"
									/>
								</div>
								<div>
									<label className="field-label">Username</label>
									<input 
										type="text" 
										value={profile.username} 
										onChange={(e) => setProfile((s) => ({ ...s, username: e.target.value }))} 
										className="field" 
										placeholder="johndoe"
									/>
								</div>
							</div>
						</Card>

						<Card className="rounded-[1.75rem] p-6">
							<h2 className="mb-5 text-xl font-semibold text-[var(--text-primary)]">Preferences</h2>
							<div className="space-y-5">
								<div>
									<label className="field-label">Theme</label>
									<select value={settings.theme} onChange={(e) => setSettings((s) => ({ ...s, theme: e.target.value }))} className="field">
										<option value="dark">Dark</option>
										<option value="system">System</option>
									</select>
								</div>
								<label className="flex items-center justify-between rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--bg-glass)] p-4">
									<span><span className="block text-sm font-medium text-[var(--text-primary)]">Notifications</span><span className="text-xs text-slate-500">Receive collaboration updates</span></span>
									<input type="checkbox" checked={settings.notifications} onChange={() => setSettings((s) => ({ ...s, notifications: !s.notifications }))} />
								</label>
								<label className="flex items-center justify-between rounded-[1.35rem] border border-[var(--border-soft)] bg-[var(--bg-glass)] p-4">
									<span><span className="block text-sm font-medium text-[var(--text-primary)]">Auto Save</span><span className="text-xs text-slate-500">Save diagrams automatically</span></span>
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

import { createStore } from './base';

const STORAGE_KEY = 'user_settings';

export const DEFAULT_PREFERENCES = {
	theme: 'dark',
	notifications: true,
	autoSave: true,
	gridSize: 20
};

function readFromStorage() {
	if (typeof window === 'undefined') return { ...DEFAULT_PREFERENCES };
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return { ...DEFAULT_PREFERENCES };
		return { ...DEFAULT_PREFERENCES, ...JSON.parse(raw) };
	} catch {
		return { ...DEFAULT_PREFERENCES };
	}
}

const state = createStore(readFromStorage());

export const preferencesStore = {
	...state,
	/** Persist a full/partial preferences object and notify subscribers. */
	save(next) {
		const merged = { ...state.get(), ...next };
		state.set(merged);
		if (typeof window !== 'undefined') {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
		}
		return merged;
	},
	/** Re-read from localStorage (e.g. after an update in another tab). */
	reload() {
		state.set(readFromStorage());
	}
};

// Keep the store in sync when settings change in another tab.
if (typeof window !== 'undefined') {
	window.addEventListener('storage', (e) => {
		if (e.key === STORAGE_KEY) preferencesStore.reload();
	});
}

/** Non-reactive read for imperative callers (e.g. the WebSocket client). */
export function getPreferences() {
	return state.get();
}

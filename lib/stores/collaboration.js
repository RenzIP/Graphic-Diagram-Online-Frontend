import { createStore } from './base';

const state = createStore({
	users: [],        // { id, name, color }
	cursors: {},      // { [userId]: { x, y } }
	locks: {},        // { [nodeId]: userId }
	connected: false,
	roomId: null
});

// Helper for deterministic color generation from a string (user ID)
const COLORS = [
	'#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', 
	'#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
];
function getColorForId(id) {
	if (!id) return COLORS[0];
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = id.charCodeAt(i) + ((hash << 5) - hash);
	}
	return COLORS[Math.abs(hash) % COLORS.length];
}

export const collaborationStore = {
	...state,
	joinRoom(roomId) {
		state.update((s) => ({ ...s, connected: true, roomId, users: [], cursors: {}, locks: {} }));
	},
	leaveRoom() {
		state.update((s) => ({ ...s, connected: false, roomId: null, users: [], cursors: {}, locks: {} }));
	},
	setUsers(users) {
		const mappedUsers = users.map(u => ({ ...u, color: getColorForId(u.id) }));
		state.update((s) => ({ ...s, users: mappedUsers }));
	},
	setLocks(locks) {
		state.update((s) => ({ ...s, locks: { ...locks } }));
	},
	addUser(user) {
		state.update((s) => {
			if (s.users.find(u => u.id === user.id)) return s;
			return { ...s, users: [...s.users, { ...user, color: getColorForId(user.id) }] };
		});
	},
	removeUser(userId) {
		state.update((s) => {
			const users = s.users.filter(u => u.id !== userId);
			const cursors = { ...s.cursors };
			delete cursors[userId];
			const locks = { ...s.locks };
			for (const nodeId in locks) {
				if (locks[nodeId] === userId) delete locks[nodeId];
			}
			return { ...s, users, cursors, locks };
		});
	},
	lockNode(nodeId, userId) {
		state.update((s) => ({ ...s, locks: { ...s.locks, [nodeId]: userId } }));
	},
	unlockNode(nodeId) {
		state.update((s) => {
			const locks = { ...s.locks };
			delete locks[nodeId];
			return { ...s, locks };
		});
	},
	updateCursor(userId, pos) {
		state.update((s) => ({ ...s, cursors: { ...s.cursors, [userId]: pos } }));
	}
};

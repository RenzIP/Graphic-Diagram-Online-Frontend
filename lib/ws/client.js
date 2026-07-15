var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);
import { WS_BASE_URL } from "../utils/constants.js";
import { collaborationStore } from "../stores/collaboration.js";
import { documentStore } from "../stores/document.js";
import { getPreferences } from "../stores/preferences.js";

/** Show a collaboration toast only when the user enabled notifications. */
function notify(message, type = "info") {
  if (typeof window === "undefined") return;
  if (!getPreferences().notifications) return;
  window.__gradiol_toast?.(message, type);
}

class WebSocketClient {
  constructor() {
    __publicField(this, "ws", null);
    __publicField(this, "reconnectTimer", null);
    __publicField(this, "handlers", /* @__PURE__ */ new Map());
    __publicField(this, "documentId", null);
  }
  /** Connect to a document room */
  connect(documentId) {
    this.documentId = documentId;
    this.doConnect();
  }
  doConnect() {
    if (!this.documentId) return;
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem("auth_token");
      if (!token) {
        console.error("[WS] No auth token found, cannot connect");
        return;
      }
      
      // Include token in WebSocket URL as query parameter
      const wsUrl = `${WS_BASE_URL}/${this.documentId}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(`${WS_BASE_URL}/${this.documentId}?token=${encodeURIComponent(token)}`);
      this.ws.onopen = () => {
        collaborationStore.joinRoom(this.documentId);
        this.send({ type: "join_room", room_id: this.documentId });
      };
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.dispatch(msg);
        } catch (e) {
          console.error("[WS] Failed to parse message:", e);
        }
      };
      this.ws.onclose = (event) => {
        collaborationStore.leaveRoom();
        if (event.code !== 1000) {
          // Abnormal close, schedule reconnect
          this.scheduleReconnect();
        }
      };
      this.ws.onerror = (event) => {
        console.error("[WS] Connection error:", event);
        this.ws?.close();
      };
    } catch {
      this.scheduleReconnect();
    }
  }
  /** Send a message to the server */
  send(msg) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }
  /** Register a handler for a message type */
  on(type, handler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type).push(handler);
  }
  /** Remove a handler */
  off(type, handler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      this.handlers.set(
        type,
        handlers.filter((h) => h !== handler)
      );
    }
  }
  /** Disconnect and clean up */
  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.documentId = null;
    collaborationStore.leaveRoom();
  }
	dispatch(msg) {
		const handlers = this.handlers.get(msg.type);
		if (handlers) {
			handlers.forEach((h) => h(msg));
		}
		switch (msg.type) {
			case 'room_state':
				collaborationStore.setUsers(msg.users || []);
				collaborationStore.setLocks(msg.locks || {});
				break;
			case 'user_joined':
				collaborationStore.addUser(msg.user);
				notify(`${msg.user?.name || 'Someone'} joined the document`, 'info');
				break;
			case 'user_left': {
				const leaving = collaborationStore.get().users.find((u) => u.id === msg.user_id);
				collaborationStore.removeUser(msg.user_id);
				notify(`${leaving?.name || 'A collaborator'} left the document`, 'info');
				break;
			}
			case 'node_locked':
				collaborationStore.lockNode(msg.node_id, msg.by);
				break;
			case 'node_unlocked':
				collaborationStore.unlockNode(msg.node_id);
				break;
			case 'cursor_update':
				collaborationStore.updateCursor(msg.user_id, { x: msg.x, y: msg.y });
				break;
			case 'node_added':
				documentStore.addNodeRemote(msg.node);
				break;
			case 'node_updated':
				documentStore.updateNodeRemote(msg.node_id, msg.changes);
				break;
			case 'node_deleted':
				documentStore.removeNodeRemote(msg.node_id);
				break;
			case 'edge_added':
				documentStore.addEdgeRemote(msg.edge);
				break;
			case 'edge_updated':
				documentStore.updateEdgeRemote(msg.edge_id, msg.changes);
				break;
			case 'edge_deleted':
				documentStore.removeEdgeRemote(msg.edge_id);
				break;
			case 'replace_document':
				documentStore.replaceRemote(msg.state);
				break;
		}
	}
  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.doConnect();
    }, 3e3);
  }
}
const wsClient = new WebSocketClient();
export {
  wsClient
};

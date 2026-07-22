export class MultiplayerClient extends EventTarget {
  constructor(endpoint) {
    super();
    this.endpoint = endpoint;
    this.socket = null;
    this.joinRequest = null;
    this.reconnectAttempt = 0;
    this.closedByUser = false;
  }

  connect(joinRequest) {
    if (!/^wss?:\/\//i.test(this.endpoint)) {
      throw new Error("A WebSocket endpoint is required");
    }
    this.joinRequest = { ...joinRequest };
    this.closedByUser = false;
    this.socket = new WebSocket(this.endpoint);
    this.socket.addEventListener("open", () => {
      this.reconnectAttempt = 0;
      this.socket.send(JSON.stringify({ type: "join", ...this.joinRequest }));
    });
    this.socket.addEventListener("message", (event) => {
      const message = JSON.parse(event.data);
      this.dispatchEvent(new CustomEvent(message.type, { detail: message }));
    });
    this.socket.addEventListener("close", () => {
      if (!this.closedByUser) this.scheduleReconnect();
    });
  }

  sendMove(sequence, move) {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Multiplayer connection is offline");
    }
    this.socket.send(JSON.stringify({ type: "move", sequence, move }));
  }

  scheduleReconnect() {
    const delay = Math.min(10_000, 500 * 2 ** this.reconnectAttempt++);
    window.setTimeout(() => {
      if (!this.closedByUser && this.joinRequest) this.connect(this.joinRequest);
    }, delay);
  }

  close() {
    this.closedByUser = true;
    this.socket?.close();
    this.socket = null;
  }
}

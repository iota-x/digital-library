type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
  coupleId: string;
};

declare global {
  var _sseClients: Map<string, SSEClient> | undefined;
}

if (!global._sseClients) {
  global._sseClients = new Map();
}

const clients = global._sseClients;

export function addSSEClient(id: string, controller: ReadableStreamDefaultController, coupleId: string) {
  clients.set(id, { id, controller, coupleId });
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

export function broadcastCalendarUpdate(coupleId: string, payload: object) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  const dead: string[] = [];
  clients.forEach((client) => {
    if (client.coupleId !== coupleId) return;
    try {
      client.controller.enqueue(new TextEncoder().encode(msg));
    } catch {
      dead.push(client.id);
    }
  });
  dead.forEach(id => clients.delete(id));
}

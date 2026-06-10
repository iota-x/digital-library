type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

declare global {
  var _sseClients: Map<string, SSEClient> | undefined;
}

if (!global._sseClients) {
  global._sseClients = new Map();
}

const clients = global._sseClients;

export function addSSEClient(id: string, controller: ReadableStreamDefaultController) {
  clients.set(id, { id, controller });
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

export function broadcastCalendarUpdate(payload: object) {
  const msg = `data: ${JSON.stringify(payload)}\n\n`;
  const dead: string[] = [];
  clients.forEach((client) => {
    try {
      client.controller.enqueue(new TextEncoder().encode(msg));
    } catch {
      dead.push(client.id);
    }
  });
  dead.forEach(id => clients.delete(id));
}
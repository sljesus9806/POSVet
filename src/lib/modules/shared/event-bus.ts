// Bus de eventos in-memory (process-local).
// Suficiente para una instancia única; cuando exista el deploy híbrido
// (Fase 4) se reemplazará por una cola compartida sin tocar a los emisores.

type Handler<T> = (payload: T) => void | Promise<void>;

class EventBus {
  private handlers = new Map<string, Handler<unknown>[]>();

  on<T = unknown>(event: string, handler: Handler<T>): () => void {
    const list = this.handlers.get(event) ?? [];
    list.push(handler as Handler<unknown>);
    this.handlers.set(event, list);
    return () => this.off(event, handler);
  }

  off<T = unknown>(event: string, handler: Handler<T>): void {
    const list = this.handlers.get(event);
    if (!list) return;
    this.handlers.set(
      event,
      list.filter((h) => h !== (handler as Handler<unknown>)),
    );
  }

  async emit<T = unknown>(event: string, payload: T): Promise<void> {
    const list = this.handlers.get(event);
    if (!list?.length) return;
    await Promise.all(
      list.map(async (h) => {
        try {
          await h(payload);
        } catch (err) {
          console.error(`[event-bus] handler error for "${event}":`, err);
        }
      }),
    );
  }
}

const globalForBus = globalThis as unknown as { eventBus: EventBus | undefined };

export const eventBus = globalForBus.eventBus ?? new EventBus();
if (process.env.NODE_ENV !== "production") globalForBus.eventBus = eventBus;

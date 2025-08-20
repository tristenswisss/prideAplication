type Handler<T = any> = (event: T) => void

type EventMap = {
  conversationOpened: { conversationId: string }
  unreadCountsChanged: void
}

class SimpleEventBus {
  private handlers: Map<string, Set<Handler>> = new Map()

  on<T extends keyof EventMap>(event: T, handler: Handler<EventMap[T]>): () => void {
    const key = String(event)
    if (!this.handlers.has(key)) this.handlers.set(key, new Set())
    const set = this.handlers.get(key)!
    set.add(handler as Handler)
    return () => this.off(event, handler as Handler)
  }

  off<T extends keyof EventMap>(event: T, handler: Handler<EventMap[T]>) {
    const key = String(event)
    const set = this.handlers.get(key)
    if (!set) return
    set.delete(handler as Handler)
    if (set.size === 0) this.handlers.delete(key)
  }

  emit<T extends keyof EventMap>(event: T, payload: EventMap[T]) {
    const key = String(event)
    const set = this.handlers.get(key)
    if (!set) return
    set.forEach((h) => {
      try {
        ;(h as Handler<EventMap[T]>)(payload)
      } catch {
        // ignore
      }
    })
  }
}

export const events = new SimpleEventBus()


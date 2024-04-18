interface ChatSessionManager {
    findChatSession: (sessionId: string) => Promise<ChatSession | null>
}

interface ChatSession {
    id: string
    userId?: bigint
    restaurantId?: bigint
    createdAt: Date
}

export { ChatSessionManager, ChatSession }

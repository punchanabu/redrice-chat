interface ChatSessionManager {
    findChatSession: (sessionId: string) => Promise<ChatSession | null>
}

interface ChatSession {
    id: string
    userId: number
    restaurantId: number
    createdAt: Date
}

export { ChatSessionManager, ChatSession }

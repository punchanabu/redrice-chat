interface ChatSessionManager {
    findChatSession: (sessionId: string) => Promise<ChatSession | null>
}

interface ChatSession {
    id: string
    msgs: string[]
    userId: number
    restaurantId: number
    createdAt: Date
}

interface MessageSession {
    id: string
    msg: string
    senderId: number
    receiverId: number
    createdAt: Date
    updatedAt: Date
}

export { ChatSessionManager, ChatSession, MessageSession }

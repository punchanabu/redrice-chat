interface ChatSessionManager {
    findChatSession: (sessionId: string) => Promise<ChatSession | null>
}

interface ChatSession {
    id: string
    userId?: bigint
    restaurantId?: bigint
    createdAt: Date
}

interface Message {
    id: string
    msg: string | null
    senderId: bigint | null
    receiverId: bigint | null
    createdAt: Date
    updatedAt: Date
}

export { ChatSessionManager, ChatSession, Message }

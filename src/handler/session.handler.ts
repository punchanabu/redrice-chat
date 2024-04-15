import { Socket, Server } from 'socket.io'
import { ChatSessionManager } from '../types/chat'
import { RestaurantSockets } from '../types/socket'

const joinChat = async (
    socket: Socket,
    sessionId: string,
    userId: bigint,
    chatSessionManager: ChatSessionManager
): Promise<void> => {
    const session = await chatSessionManager.findChatSession(sessionId)
    if (
        session &&
        (session.userId == Number(userId) ||
            session.restaurantId == Number(userId))
    ) {
        socket.join(sessionId)
        console.log(`User ${userId} joined chat session ${sessionId}`)
    } else {
        socket.emit('error', 'Error: Unauthorized access to chat session')
    }
}

const sendMessage = (
    socket: Socket,
    io: Server,
    userId: bigint,
    msg: { sessionId: string; message: string }
): void => {
    if (socket.rooms.has(msg.sessionId)) {
        io.to(msg.sessionId).emit('receive message', {
            from: Number(userId),
            message: msg.message,
        })
    } else {
        socket.emit('error', 'Error: You are not a member of this chat session')
    }
}



export { joinChat, sendMessage }

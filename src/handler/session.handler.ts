import { Socket, Server } from 'socket.io'
import { ChatSessionManager } from '../types/chat'
// import { RestaurantSockets } from '../types/socket'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const joinChat = async (
    socket: Socket,
    sessionId: string,
    userId: bigint,
    chatSessionManager: ChatSessionManager
): Promise<void> => {
    const session = await chatSessionManager.findChatSession(sessionId)
    if (!session) {
        socket.emit('error', 'Error: Chat session not found')
        return
    }
    const restaurantUser = await prisma.users.findUnique({
        where: { restaurant_id: Number(session.restaurantId) },
    })
    if (session && restaurantUser) {
        socket.join(sessionId)
        console.log(`User ${userId} joined chat session ${sessionId}`)
    } else {
        socket.emit('error', 'Error: Unauthorized access to chat session')
    }
}

const sendMessage = async (
    socket: Socket,
    io: Server,
    userId: bigint,
    msg: { sessionId: string; message: string }
): Promise<void> => {
    if (socket.rooms.has(msg.sessionId)) {
        io.to(msg.sessionId).emit('receive message', {
            fromUserId: Number(userId),
            socketId: msg.sessionId,
            message: msg.message,
        })

        // Save message to msgSession table in database
        const message = await prisma.msgSessions.create({
            data: {
                msg: msg.message as string,
                senderId: Number(userId),
            },
        })

        // Add message to msgs[] in chatSession table in database
        const chatSession = await prisma.chatSessions.findUnique({
            where: { id: msg.sessionId },
        })
        if (chatSession) {
            const updatedMsgs = [...chatSession.msgs, message.id.toString()]

            await prisma.chatSessions.update({
                where: { id: msg.sessionId },
                data: {
                    msgs: updatedMsgs,
                },
            })
        }
    } else {
        socket.emit('error', 'Error: You are not a member of this chat session')
    }
}

const getMySession = async (userId: bigint, socket: Socket, role: string) => {
    let session
    if (role == 'user') {
        session = await prisma.chatSessions.findMany({
            where: { userId: userId },
        })
    } else if (role == 'restaurant') {
        const restaurantUser = await prisma.users.findUnique({
            where: { id: Number(userId) },
        })
        if (!restaurantUser) {
            socket.emit('error', 'Error: Restaurant Admin not found')
            return
        }
        session = await prisma.chatSessions.findMany({
            where: { restaurantId: Number(restaurantUser.restaurant_id) },
        })
    }
    if (session) {
        if (session.length > 0) {
            if (role == 'user') {
                socket.emit(
                    'session',
                    session.map((s) => ({
                        sessionId: s.id,
                        restaurantId: Number(s.restaurantId),
                    }))
                )
            } else if (role == 'restaurant') {
                socket.emit(
                    'session',
                    session.map((s) => ({
                        sessionId: s.id,
                        userId: Number(s.userId),
                    }))
                )
            }
        } else {
            socket.emit('error', 'Error: Chat session not found')
        }
    } else {
        socket.emit('error', 'Error: Chat session not found')
    }
}

export { joinChat, sendMessage, getMySession }

import { Socket, Server } from 'socket.io'
import { PrismaClient } from '@prisma/client'
import { findChatSession } from './chat.handler'
import { ChatSession, ChatSessionManager } from '../types/chat'
import { RestaurantSockets } from '../types/socket'
import { timeStamp } from 'console'

const joinChat = async (
    socket: Socket,
    sessionId: string,
    userId: bigint,
    prisma: PrismaClient
): Promise<void> => {
    const session = await findChatSession(sessionId, prisma)

    if (!session) {
        socket.emit('error', 'Error: Chat session not found')
        return
    }
    const restaurantUser = await prisma.users.findUnique({
        where: { id: Number(session.restaurantId) },
    })

    if (!restaurantUser) {
        socket.emit(
            'error',
            'Error: restaurant user in this restaurant not found'
        )
        return
    }
    if (session) {
        socket.join(sessionId)
        console.log(`User ${userId} joined chat session ${sessionId}`)
    }
}

const sendMessage = async (
    socket: Socket,
    io: Server,
    userId: bigint,
    msg: { sessionId: string; message: string; timeStamp: string },
    prisma: PrismaClient
): Promise<void> => {
    if (socket.rooms.has(msg.sessionId)) {
        io.to(msg.sessionId).emit('receive message', {
            fromUserId: Number(userId),
            socketId: msg.sessionId,
            message: msg.message,
            timeStamp: new Date().getTime(),
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
            const updatedMsgs = [...chatSession.msgs, message.id]

            await prisma.chatSessions.update({
                where: { id: msg.sessionId },
                data: {
                    msgs: updatedMsgs,
                },
            })


            io.emit('notification', {
                fromUserId: Number(userId),
                message: msg.message,
                timeStamp: new Date().getTime(),
            })
            console.log("sending notifcation");
        }
    } else {
        socket.emit('error', 'Error: You are not a member of this chat session')
    }
}

const getMySession = async (
    userId: bigint,
    socket: Socket,
    role: string,
    prisma: PrismaClient
) => {
    let session: ChatSession[] = []
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
            where: { restaurantId: Number(restaurantUser.id) },
        })
    } else {
        socket.emit('error', 'Error: Invalid role')
        return
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
    }
}

export { joinChat, sendMessage, getMySession }

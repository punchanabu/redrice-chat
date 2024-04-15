import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'

const prisma = new PrismaClient()

const createChatSession = async (userId: bigint, restaurantId: number, socket: Socket) => {

    const existingSession = await prisma.chatSessions.findFirst({
        where: {
            userId,
            restaurantId,
        },
    })

    if (existingSession) {
        socket.emit('session', existingSession.id)
        socket.join(existingSession.id)
        console.log(`User ${userId} created chat session ${existingSession.id}`)
        return existingSession
    }
    
    const session = await prisma.chatSessions.create({
        data: {
            userId,
            restaurantId,
            createdAt: new Date(),
        },
    })

    socket.emit('session', session.id)
    socket.join(session.id)
    console.log(`User ${userId} created chat session ${session.id}`)
    return session
}

const findChatSession = async (sessionId: string) => {
    return await prisma.chatSessions.findUnique({
        where: { id: sessionId },
    })
}

export { createChatSession, findChatSession }

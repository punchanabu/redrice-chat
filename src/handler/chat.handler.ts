import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const createChatSession = async (userId: bigint, restaurantId: number) => {

    const existingSession = await prisma.chatSessions.findFirst({
        where: {
            userId,
            restaurantId,
        },
    })

    if (existingSession) {
        return existingSession
    }
    
    return await prisma.chatSessions.create({
        data: {
            userId,
            restaurantId,
            createdAt: new Date(),
        },
    })
}

const findChatSession = async (sessionId: string) => {
    return await prisma.chatSessions.findUnique({
        where: { id: sessionId },
    })
}

export { createChatSession, findChatSession }

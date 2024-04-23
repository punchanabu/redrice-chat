import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'

const prisma = new PrismaClient()

const createChatSession = async (
    userId: bigint,
    restaurantId: number,
    socket: Socket
) => {
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
            userId: userId,
            restaurantId: restaurantId,
            createdAt: new Date(),
        },
    })

    // Add chat room to user.chatRooms
    const user = await prisma.users.findUnique({
        where: { id: userId },
    })

    if (user) {
        const updatedChatRooms = [...user.chatRooms, session.id]

        await prisma.users.update({
            where: { id: userId },
            data: {
                chatRooms: updatedChatRooms,
            },
        })
    } else {
        socket.emit('error', 'Error: Fail to create user chat room')
        return
    }

    // Add chat room to restaurant.chatRooms
    const restaurant = await prisma.restaurants.findUnique({
        where: { id: restaurantId },
    })

    if (restaurant) {
        const updatedChatRooms = [...restaurant.chatRooms, session.id]

        await prisma.restaurants.update({
            where: { id: restaurantId },
            data: {
                chatRooms: updatedChatRooms,
            },
        })
    } else {
        socket.emit('error', 'Error: Fail to create restaurant chat room')
        return
    }

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

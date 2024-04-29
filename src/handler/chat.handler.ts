import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'
import { Message } from '../types/chat'

const createChatSession = async (
    userId: bigint,
    restaurantId: number,
    socket: Socket,
    prisma: PrismaClient
) => {
    const restaurantUser = await prisma.users.findUnique({
        where: { restaurant_id: restaurantId },
    })

    if (!restaurantUser) {
        socket.emit('error', 'Error: Restaurant user not found')
        return
    }

    const existingSession = await prisma.chatSessions.findFirst({
        where: {
            userId,
            restaurantId: restaurantUser.id,
        },
    })
    if (existingSession) {
        socket.emit('session', existingSession.id)
        socket.join(existingSession.id)
        console.log(`User ${userId} created chat session ${existingSession.id}`)
        return existingSession
    }

    // Create the Session
    const session = await prisma.chatSessions.create({
        data: {
            userId: userId,
            restaurantId: restaurantUser.id,
            createdAt: new Date(),
        },
    })

    // Update chat rooms for both users and restaurant
    const updateChatRooms = async (userToUpdate: {
        id: bigint | number
        chatRooms?: string[]
    }) => {
        const updatedChatRooms = [...(userToUpdate.chatRooms || []), session.id]
        await prisma.users.update({
            where: { id: userToUpdate.id },
            data: {
                chatRooms: updatedChatRooms,
            },
        })
    }

    // Add chat room to user's chat rooms
    const user = await prisma.users.findUnique({
        where: { id: userId },
    })

    if (user) {
        await updateChatRooms(user)
    } else {
        socket.emit('error', 'Error: User not found')
        return
    }

    await updateChatRooms(restaurantUser)

    socket.emit('session', session.id)
    socket.join(session.id)
    console.log(`User ${userId} created chat session ${session.id}`)
    return session
}

const findChatSession = async (sessionId: string, prisma: PrismaClient) => {
    if (!sessionId) {
        return null
    }
    const result = await prisma.chatSessions.findUnique({
        where: { id: sessionId },
    })
    return result
}

const getChatHistory = async (
    sessionId: string,
    socket: Socket,
    prisma: PrismaClient
) => {
    const chatSession = await findChatSession(sessionId, prisma)

    if (!chatSession) {
        socket.emit('error', 'Cannot get history chat history not found in DB')
        return
    }

    const messageIDList: string[] = chatSession.msgs
    if (!messageIDList) {
        socket.emit('chat history', [])
        return
    }
    const messageList: Message[] = []

    for (const id of messageIDList) {
        const result = await prisma.msgSessions.findUnique({
            where: { id: id },
        })

        if (result) {
            const message: Message = {
                ...result,
                msg: result.msg || '',
            }
            messageList.push(message)
        } else {
            continue
        }
    }

    if (messageList.length > 0) {
        // Convert BigInt values to strings before emitting
        const serializedMessages = messageList.map((message) => ({
            ...message,
            senderId: message?.senderId?.toString(),
            receiverId: message?.receiverId?.toString(),
            createdAt: message?.createdAt?.toISOString(),
            updatedAt: message?.updatedAt?.toISOString(),
        }))

        socket.emit('chat history', serializedMessages)
    } else {
        socket.emit('chat history', [])
    }
}

export { createChatSession, findChatSession, getChatHistory }

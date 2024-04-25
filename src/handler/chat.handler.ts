import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'
import { Message } from '../types/chat'

const prisma = new PrismaClient()

const createChatSession = async (
    userId: bigint,
    restaurantId: number,
    socket: Socket
) => {
    const restaurantUser = await prisma.users.findUnique({
        where: { restaurant_id: restaurantId },
    })

    if (!restaurantUser) return 

    const existingSession = await prisma.chatSessions.findFirst({
        where: {
            userId,
            restaurantId: restaurantUser.id,
        },
    })
    if (existingSession) {
        socket.emit('session', existingSession.id)
        socket.join(existingSession.id)
        console.log(
            `User ${userId} created chat session ${existingSession.id}`
        )
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

    // Add chat room to user's chat rooms 
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

    // Add chat room to restaurant user's chat rooms
    if (restaurantUser.id) {
        const updatedChatRooms = [...restaurantUser.chatRooms, session.id]
        await prisma.users.update({
            where: { id: restaurantUser.id },
            data: {
                chatRooms: updatedChatRooms,
            },
        })
    } else {
        socket.emit('error', 'Error: Fail to create restaurant chat room')
        return
    }

    socket.emit('session', session.id)
    
    // Auto joining for user who created chat room
    socket.join(session.id)
    console.log(`User ${userId} created chat session ${session.id}`)
    return session
}

const findChatSession = async (sessionId: string) => {
    return await prisma.chatSessions.findUnique({
        where: { id: sessionId },
    })
}

const getChatHistory = async (sessionId: string, socket: Socket) => {

    const chatSession = await findChatSession(sessionId)

    if (!chatSession) {
        socket.emit("error", "Cannot get history chat history not found in DB")
        throw new Error('Chat session not found')
    }

    const messageIDList: string[] = chatSession.msgs
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
            return
        }
    }
    
    if(messageList.length > 0) {
        // Convert BigInt values to strings before emitting
        const serializedMessages = messageList.map(message => ({
            ...message,
            senderId: message?.senderId?.toString(),
            receiverId: message?.receiverId?.toString(),
            createdAt: message?.createdAt?.toISOString(),
            updatedAt: message?.updatedAt?.toISOString()
        }))

        socket.emit('chat history', serializedMessages)
    }
}

export { createChatSession, findChatSession, getChatHistory }

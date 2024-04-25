import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'
import { MessageSession } from '../types/chat'

const prisma = new PrismaClient()

const createChatSession = async (
    userId: bigint,
    restaurantId: number,
    socket: Socket
) => {
    const res_user = await prisma.users.findUnique({
        where: { restaurant_id: restaurantId },
    })

    if (res_user) {
        const existingSession = await prisma.chatSessions.findFirst({
            where: {
                userId,
                restaurantId: res_user.id,
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

        const session = await prisma.chatSessions.create({
            data: {
                userId: userId,
                restaurantId: res_user.id,
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

        // Add chat room to restaurant_user.chatRooms
        if (res_user.id) {
            const updatedChatRooms = [...res_user.chatRooms, session.id]

            await prisma.users.update({
                where: { id: res_user.id },
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
}

const findChatSession = async (sessionId: string) => {
    return await prisma.chatSessions.findUnique({
        where: { id: sessionId },
    })
}

const getChatHistory = async (sessionId: string, socket: Socket) => {
    // Find the chat session using the provided sessionId
    const chatSession = await findChatSession(sessionId)

    if (!chatSession) {
        throw new Error('Chat session not found')
    }

    const msgsIDs: string[] = chatSession.msgs
    const msgsArray: (MessageSession | null)[] = []

    for (const id of msgsIDs) {
        const result = await prisma.msgSessions.findUnique({
            where: { id: id },
        })
        const msg: MessageSession | null = result
            ? {
                  ...result,
                  msg: result.msg || '', // Default to an empty string if msg is null
              }
            : null
        msgsArray.push(msg)
    }
    
    if(msgsArray.length > 0) {
        // Convert BigInt values to strings before emitting
        const serializedMessages = msgsArray.map(msg => ({
            ...msg,
            senderId: msg?.senderId?.toString(),
            receiverId: msg?.receiverId?.toString(),
            createdAt: msg?.createdAt?.toISOString(),
            updatedAt: msg?.updatedAt?.toISOString()
        }))

        console.log(serializedMessages)
        socket.emit('chat history', serializedMessages)
    }
}

export { createChatSession, findChatSession, getChatHistory }

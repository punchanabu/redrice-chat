import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'
import { MessageSession } from '../types/chat'

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

const getAllChatMessages = async (sessionId: string) => {
    // Find the chat session using the provided sessionId
    const chatSession = await findChatSession(sessionId);

    if (!chatSession) {
        throw new Error('Chat session not found');
    }

    const msgsIDs = chatSession.msgs;
    let msgsArray: MessageSession[] = [];
    msgsIDs.forEach((id: string) => {
        const msg = prisma.msgSessions.findUnique({
            where: { id: id }
        })
        msgsArray.push(msg);
    });

    return msgsArray;
}

export { createChatSession, findChatSession, getAllChatMessages }

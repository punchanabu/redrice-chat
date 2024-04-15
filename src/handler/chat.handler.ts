import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const createChatSession = async (userId: number, restaurantId: number) => {
    return await prisma.chatSession.create({
        data: {
            userId,
            restaurantId,
            createdAt: new Date(),
        },
    });
};

const findChatSession = async (sessionId: string) => {
    return await prisma.chatSession.findUnique({
        where: { id: sessionId }
    });
};

export { createChatSession, findChatSession };

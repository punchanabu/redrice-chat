import { Socket } from 'socket.io'
import { createChatSession, findChatSession, getChatHistory } from "../handler/chat.handler";
import { PrismaClient } from '@prisma/client'
import { ChatSession } from '../types/chat';

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    chatSessions: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    msgSessions: {
      findUnique: jest.fn(),
    },
  })),
}));

interface Message {
  id: string
  msg: string | null
  senderId: bigint | null
  receiverId: bigint | null
  createdAt: Date
  updatedAt: Date
}

const prisma = new PrismaClient()

const mockSocket: Partial<Socket> = {
  emit: jest.fn(),
  join: jest.fn(),
}

describe('it should properly handle chat operation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
    describe('createChatSession', () => {
      it('should create a new chat session', async () => {
        const userId = BigInt(1);
        const restaurantId = 1;
        const mockSession: ChatSession = {
          id: "8d6dc97d-9ab3-4b05-affb-c3dfd938202f",
          userId: 1,
          restaurantId: 1,
          createdAt: new Date(),
        };
    
        (prisma.users.findUnique as jest.Mock).mockResolvedValueOnce({ id: restaurantId });
        (prisma.chatSessions.findFirst as jest.Mock).mockResolvedValueOnce(null);
        (prisma.chatSessions.create as jest.Mock).mockResolvedValueOnce(mockSession);
        (prisma.users.findUnique as jest.Mock)
          .mockResolvedValueOnce({ id: userId, chatRooms: [] }) // First call for user
          .mockResolvedValueOnce({ id: restaurantId, chatRooms: [] }); // Second call for restaurantUser
        (prisma.users.update as jest.Mock)
          .mockResolvedValueOnce({ id: userId, chatRooms: [mockSession.id] })
          .mockResolvedValueOnce({ id: restaurantId, chatRooms: [mockSession.id] });
    
        const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
        expect(session).toBeDefined();
        expect(session?.userId).toBe(Number(userId));
        expect(session?.restaurantId).toBe(Number(restaurantId));
        expect(mockSocket.emit).toHaveBeenCalledWith('session', session?.id);
        expect(mockSocket.join).toHaveBeenCalledWith(session?.id);
    });
  })
})
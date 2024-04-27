import { Socket } from 'socket.io'
import { createChatSession, findChatSession, getChatHistory } from "../handler/chat.handler";
import { PrismaClient } from '@prisma/client'
import { ChatSession } from '../types/chat';
import type { Message } from '../types/chat';

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
      // Setup
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
        .mockResolvedValueOnce({ id: userId, chatRooms: [] })
        .mockResolvedValueOnce({ id: restaurantId, chatRooms: [] });
      (prisma.users.update as jest.Mock)
        .mockResolvedValueOnce({ id: userId, chatRooms: [mockSession.id] })
        .mockResolvedValueOnce({ id: restaurantId, chatRooms: [mockSession.id] });

      // Execute
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);

      // Assertion
      expect(session).toBeDefined();
      expect(session?.userId).toBe(Number(userId));
      expect(session?.restaurantId).toBe(Number(restaurantId));
      expect(mockSocket.emit).toHaveBeenCalledWith('session', session?.id);
      expect(mockSocket.join).toHaveBeenCalledWith(session?.id);
    });
  });

  describe('findChatSession', () => {
    it('should find an existing chat session', async () => {
      // Setup
      const sessionId = "8d6dc97d-9ab3-4b05-affb-c3dfd938202f";
      const mockSession: ChatSession = {
        id: sessionId,
        userId: 1,
        restaurantId: 1,
        createdAt: new Date(),
      };

      (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(mockSession);

      // Execute
      const session = await findChatSession(sessionId, prisma);

      // Assert
      expect(session).toBeDefined();
      expect(session?.id).toBe(sessionId);
    });
  });

  describe('getChatHistory', () => {
    it('should retrieve chat history for a session', async () => {
      // Setup
      const sessionId = "8d6dc97d-9ab3-4b05-affb-c3dfd938202f";
      const mockSession: ChatSession = {
        id: sessionId,
        userId: 1,
        restaurantId: 1,
        createdAt: new Date(),
      };
      const mockMessages: Message[] = [
        {
          id: "msg1",
          msg: "Hello",
          senderId: BigInt(1),
          receiverId: BigInt(2),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "msg2",
          msg: "Hi there",
          senderId: BigInt(2),
          receiverId: BigInt(1),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(mockSession);
      (prisma.msgSessions.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockMessages[0])
        .mockResolvedValueOnce(mockMessages[1]);

      // Execute
      await getChatHistory(sessionId, mockSocket as Socket, prisma);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('chat history', expect.any(Array));
    });

    it('should throw an error if chat session is not found', async () => {
      // Setup
      const sessionId = "non-existent-session-id";

      (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Execute
      const result = getChatHistory(sessionId, mockSocket as Socket, prisma);
    
      // Assert
      await expect(result).rejects.toThrow('Chat session not found');
      expect(mockSocket.emit).toHaveBeenCalledWith("error", "Cannot get history chat history not found in DB");
    });
  });
});

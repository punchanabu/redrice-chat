import { Server, Socket } from 'socket.io';
import { ChatSessionManager } from '../types/chat';
import { PrismaClient } from '@prisma/client';
import { joinChat, sendMessage, getMySession } from '../handler/session.handler';

// Create a mock Prisma client
const mockPrisma = {
  users: {
    findUnique: jest.fn(),
  },
  chatSessions: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
  },
  msgSessions: {
    create: jest.fn(),
  },
};

// Create a mock Socket and Server
const mockSocket: Partial<Socket> = {
  emit: jest.fn(),
  join: jest.fn(),
  rooms: new Set(),
};

const mockServer: Partial<Server> = {
  to: jest.fn().mockReturnThis(),
  emit: jest.fn(),
};

// Create a mock ChatSessionManager
const mockChatSessionManager: Partial<ChatSessionManager> = {
  findChatSession: jest.fn(),
};

describe('Session Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('joinChat', () => {
    it('should join a chat session if session and restaurant user exist', async () => {
      // Arrange
      const sessionId = 'session-id';
      const userId = BigInt(1);
      const session = { id: sessionId, restaurantId: 1 };
      const restaurantUser = { id: 1 };

      (mockChatSessionManager.findChatSession as jest.Mock).mockResolvedValueOnce(session);
      (mockPrisma.users.findUnique as jest.Mock).mockResolvedValueOnce(restaurantUser);

      // Act
      await joinChat(mockSocket as Socket, sessionId, userId, mockChatSessionManager as ChatSessionManager);

      // Assert
      expect(mockSocket.join).toHaveBeenCalledWith(sessionId);
      expect(mockSocket.emit).not.toHaveBeenCalledWith('error', expect.any(String));
    });

    it('should emit an error if chat session is not found', async () => {
      // Arrange
      const sessionId = 'session-id';
      const userId = BigInt(1);

      (mockChatSessionManager.findChatSession as jest.Mock).mockResolvedValueOnce(null);

      // Act
      await joinChat(mockSocket as Socket, sessionId, userId, mockChatSessionManager as ChatSessionManager);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Chat session not found');
    });

  });

  describe('sendMessage', () => {
    it('should send a message to the chat session and save it to the database', async () => {
      // Arrange
      const userId = BigInt(1);
      const msg = { sessionId: 'session-id', message: 'Hello' };
      const message = { id: 'message-id' };
      const chatSession = { id: msg.sessionId, msgs: [] };

      mockSocket.rooms?.add(msg.sessionId);
      mockPrisma.msgSessions.create.mockResolvedValueOnce(message);
      mockPrisma.chatSessions.findUnique.mockResolvedValueOnce(chatSession);

      // Act
      await sendMessage(mockSocket as Socket, mockServer as Server, userId, msg);

      // Assert
      expect(mockServer.to).toHaveBeenCalledWith(msg.sessionId);
      expect(mockServer.emit).toHaveBeenCalledWith('receive message', {
        fromUserId: Number(userId),
        socketId: msg.sessionId,
        message: msg.message,
      });
      expect(mockPrisma.msgSessions.create).toHaveBeenCalledWith({
        data: { msg: msg.message, senderId: Number(userId) },
      });
      expect(mockPrisma.chatSessions.update).toHaveBeenCalledWith({
        where: { id: msg.sessionId },
        data: { msgs: [message.id] },
      });
    });

  });

  describe('getMySession', () => {
    it('should retrieve user sessions and emit them', async () => {
      // Arrange
      const userId = BigInt(1);
      const role = 'user';
      const sessions = [
        { id: 'session-1', restaurantId: 1 },
        { id: 'session-2', restaurantId: 2 },
      ];

      mockPrisma.chatSessions.findMany.mockResolvedValueOnce(sessions);

      // Act
      await getMySession(userId, mockSocket as Socket, role);

      // Assert
      expect(mockPrisma.chatSessions.findMany).toHaveBeenCalledWith({
        where: { userId: userId },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session',
        sessions.map((s) => ({ sessionId: s.id, restaurantId: Number(s.restaurantId) }))
      );
    });

  });
});
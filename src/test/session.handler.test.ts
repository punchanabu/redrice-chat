import { Server, Socket } from 'socket.io';
import { ChatSessionManager } from '../types/chat';
import { PrismaClient } from '@prisma/client';
import { joinChat, sendMessage, getMySession } from '../handler/session.handler';

// Create a mock Prisma client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    chatSessions: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    users: {
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    msgSessions: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  })),
}));

const mockPrisma = new PrismaClient();

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
      const sessionId = '3748a40c-f479-4a94-b183-23350f36c6a6';
      const userId = BigInt(1);
      const session = { id: sessionId, restaurantId: 1 };
      const restaurantUser = { id: 2 };

      (mockChatSessionManager.findChatSession as jest.Mock).mockResolvedValueOnce(session);
      (mockPrisma.users.findUnique as jest.Mock).mockResolvedValueOnce(restaurantUser);

      // Act
      await joinChat(mockSocket as Socket, sessionId, userId, mockChatSessionManager as ChatSessionManager, mockPrisma as PrismaClient);

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
      await joinChat(mockSocket as Socket, sessionId, userId, mockChatSessionManager as ChatSessionManager, mockPrisma as PrismaClient);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Chat session not found');
    });

    it('should emit an error if restaurant user is not found', async () => {
      // Arrange
      const sessionId = '3748a40c-f479-4a94-b183-23350f36c6a6';
      const userId = BigInt(999999);
      const session = { id: sessionId, restaurantId: 9999 };

      (mockChatSessionManager.findChatSession as jest.Mock).mockResolvedValue(session);
      (mockPrisma.users.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      await joinChat(mockSocket as Socket, sessionId, userId, mockChatSessionManager as ChatSessionManager, mockPrisma as PrismaClient);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith("error", "Error: restaurant user in this restaurant not found");
    });

    it('should emit an error if chat session is not found', async () => {
      // Arrange
      const sessionId = 'non-existent-session-id';
      const userId = BigInt(1);
  
      (mockChatSessionManager.findChatSession as jest.Mock).mockResolvedValueOnce(null);
  
      // Act
      await joinChat(mockSocket as Socket, sessionId, userId, mockChatSessionManager as ChatSessionManager, mockPrisma as PrismaClient);
  
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

      // Mock the prisma functions
      mockPrisma.msgSessions.create = jest.fn().mockResolvedValueOnce(message);
      mockPrisma.chatSessions.findUnique = jest.fn().mockResolvedValueOnce(chatSession);
      mockPrisma.chatSessions.update = jest.fn().mockResolvedValueOnce(undefined);

      // Act
      await sendMessage(mockSocket as Socket, mockServer as Server, userId, msg, mockPrisma as PrismaClient);

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

    it('should emit an error if user is not a member of the chat session', async () => {
      // Arrange
      const userId = BigInt(1);
      const msg = { sessionId: 'session-id', message: 'Hello' };

      mockSocket.rooms?.clear();

      // Act
      await sendMessage(mockSocket as Socket, mockServer as Server, userId, msg, mockPrisma as PrismaClient);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: You are not a member of this chat session');
    });

    it('should emit an error if user is not a member of the chat session', async () => {
      // Arrange
      const userId = BigInt(1);
      const msg = { sessionId: 'session-id', message: 'Hello' };
  
      mockSocket.rooms?.clear();
  
      // Act
      await sendMessage(mockSocket as Socket, mockServer as Server, userId, msg, mockPrisma as PrismaClient);
  
      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: You are not a member of this chat session');
    });

    it('should not save the message to the database or emit the message if the user is not a member of the chat session', async () => {
      // Arrange
      const userId = BigInt(1);
      const msg = { sessionId: 'session-id', message: 'Hello' };
  
      mockSocket.rooms?.clear();
  
      // Act
      await sendMessage(mockSocket as Socket, mockServer as Server, userId, msg, mockPrisma as PrismaClient);
  
      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: You are not a member of this chat session');
      expect(mockPrisma.msgSessions.create).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
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

      (mockPrisma.chatSessions.findMany as jest.Mock).mockResolvedValueOnce(sessions);

      // Act
      await getMySession(userId, mockSocket as Socket, role, mockPrisma as PrismaClient);

      // Assert
      expect(mockPrisma.chatSessions.findMany).toHaveBeenCalledWith({
        where: { userId: userId },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session',
        sessions.map((s) => ({ sessionId: s.id, restaurantId: Number(s.restaurantId) }))
      );
    });

    it('should retrieve restaurant sessions and emit them', async () => {
      // Arrange
      const userId = BigInt(1);
      const role = 'restaurant';
      const restaurantUser = { id: 1 };
      const sessions = [
        { id: 'session-1', userId: 1 },
        { id: 'session-2', userId: 2 },
      ];

      (mockPrisma.users.findUnique as jest.Mock).mockResolvedValueOnce(restaurantUser);
      (mockPrisma.chatSessions.findMany as jest.Mock).mockResolvedValueOnce(sessions);

      // Act
      await getMySession(userId, mockSocket as Socket, role, mockPrisma as PrismaClient);

      // Assert
      expect(mockPrisma.users.findUnique).toHaveBeenCalledWith({
        where: { id: Number(userId) },
      });
      expect(mockPrisma.chatSessions.findMany).toHaveBeenCalledWith({
        where: { restaurantId: Number(restaurantUser.id) },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'session',
        sessions.map((s) => ({ sessionId: s.id, userId: Number(s.userId) }))
      );
    });

    it('should emit an error if restaurant admin is not found', async () => {
      // Arrange
      const userId = BigInt(1);
      const role = 'restaurant';

      (mockPrisma.users.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Act
      await getMySession(userId, mockSocket as Socket, role, mockPrisma as PrismaClient);

      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Restaurant Admin not found');
    });

    it('should emit an error if no chat sessions are found', async () => {
      // Arrange
      const userId = BigInt(1);
      const role = 'user';
      const sessions: any[] = [];
      (mockPrisma.chatSessions.findMany as jest.Mock).mockResolvedValueOnce(sessions);

      // Act
      await getMySession(userId, mockSocket as Socket, role, mockPrisma as PrismaClient);

      // Assert
      expect(mockPrisma.chatSessions.findMany).toHaveBeenCalledWith({
        where: { userId: userId },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Chat session not found');
    });

    it('should emit an error if the user\'s role is invalid', async () => {
      // Arrange
      const userId = BigInt(1);
      const role = 'invalid-role';
  
      // Act
      await getMySession(userId, mockSocket as Socket, role, mockPrisma as PrismaClient);
  
      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Invalid role');
    });
  
    it('should emit an error if no chat sessions are found for a valid user', async () => {
      // Arrange
      const userId = BigInt(1);
      const role = 'user';
      const sessions: any[] = [];
      (mockPrisma.chatSessions.findMany as jest.Mock).mockResolvedValueOnce(sessions);
  
      // Act
      await getMySession(userId, mockSocket as Socket, role, mockPrisma as PrismaClient);
  
      // Assert
      expect(mockPrisma.chatSessions.findMany).toHaveBeenCalledWith({
        where: { userId: userId },
      });
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Chat session not found');
    });
  });
});


import { Socket } from 'socket.io';
import { createChatSession, findChatSession, getChatHistory } from "../handler/chat.handler";
import { PrismaClient } from '@prisma/client';
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

const prisma = new PrismaClient();

const mockSocket: Partial<Socket> = {
  emit: jest.fn(),
  join: jest.fn(),
};

describe('Chat Handler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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

    it('should return if restaurant user is not found', async () => {
      // Setup
      const userId = BigInt(1);
      const restaurantId = 1;

      (prisma.users.findUnique as jest.Mock).mockResolvedValueOnce(null);

      // Execute
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);

      // Assertion
      expect(session).toBeUndefined();
    });

    it('should emit an empty chat history if no message IDs are found', async () => {
    // Setup
    const sessionId = 'test-session-id';
    const mockChatSession = {
      id: sessionId,
      msgs: undefined // Simulate no message IDs being present
    };

    // Mock implementation to return a chat session without any message IDs
    (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(mockChatSession);

    // Execute
    await getChatHistory(sessionId, mockSocket as Socket, prisma);

    // Assertions
    expect(mockSocket.emit).toHaveBeenCalledWith('chat history', []);
  });

    it('should return existing session if found', async () => {
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
      (prisma.chatSessions.findFirst as jest.Mock).mockResolvedValueOnce(mockSession);

      // Execute
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);

      // Assertion
      expect(session).toBeDefined();
      expect(session?.id).toBe(mockSession.id);
      expect(mockSocket.emit).toHaveBeenCalledWith('session', session?.id);
      expect(mockSocket.join).toHaveBeenCalledWith(session?.id);
    });

    it('should return undefined if user is not found', async () => {
      // Arrange
      const userId = BigInt(1);
      const restaurantId = 1;
      (prisma.users.findUnique as jest.Mock).mockResolvedValueOnce(null);
    
      // Act
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
      // Assert
      expect(session).toBeUndefined();
      expect(prisma.chatSessions.create).not.toHaveBeenCalled();
    });
    it('should return undefined if restaurant user is not found', async () => {
      // Arrange
      const userId = BigInt(1);
      const restaurantId = 1;
      (prisma.users.findUnique as jest.Mock).mockResolvedValueOnce(null); // No restaurant user found
    
      // Act
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
      // Assert
      expect(session).toBeUndefined();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Restaurant user not found');
    });
    
    it('should return undefined if restaurant user is not found', async () => {
      const userId = BigInt(1);
      const restaurantId = 1;
      (prisma.users.findUnique as jest.Mock).mockResolvedValueOnce(null); // No restaurant user found
    
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
      expect(session).toBeUndefined();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: Restaurant user not found');
    });

    it('should emit an error if the user is not found during chat room update', async () => {
      const userId = BigInt(1);
      const restaurantId = 1;
      const restaurantUser = { id: restaurantId, chatRooms: [] };
      (prisma.users.findUnique as jest.Mock)
        .mockResolvedValueOnce(restaurantUser) // First call for restaurant
        .mockResolvedValueOnce(null); // Second call for user, returns null
      (prisma.chatSessions.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.chatSessions.create as jest.Mock).mockResolvedValueOnce({ id: 'new-session-id', userId, restaurantId });
    
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
      expect(session).toBeUndefined();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: User not found');
    });
    
    it('should create a new chat session if no existing session is found', async () => {
      // Arrange
      const userId = BigInt(1);
      const restaurantId = 1;
      const restaurantUser = { id: restaurantId, chatRooms: [] };
      (prisma.users.findUnique as jest.Mock).mockResolvedValue(restaurantUser);
      (prisma.chatSessions.findFirst as jest.Mock).mockResolvedValueOnce(null); // No existing session
      (prisma.chatSessions.create as jest.Mock).mockResolvedValueOnce({ id: 'new-session-id', userId, restaurantId });
    
      // Act
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
      // Assert
      expect(session).toBeDefined();
      expect(prisma.chatSessions.create).toHaveBeenCalled();
    });
    it('should emit an error if the user is not found during chat room update', async () => {
      // Arrange
      const userId = BigInt(1);
      const restaurantId = 1;
      const restaurantUser = { id: restaurantId, chatRooms: [] };
      (prisma.users.findUnique as jest.Mock)
        .mockResolvedValueOnce(restaurantUser) // First call for restaurant
        .mockResolvedValueOnce(null); // Second call for user, returns null
      (prisma.chatSessions.findFirst as jest.Mock).mockResolvedValueOnce(null);
      (prisma.chatSessions.create as jest.Mock).mockResolvedValueOnce({ id: 'new-session-id', userId, restaurantId });
    
      // Act
      const session = await createChatSession(userId, restaurantId, mockSocket as Socket, prisma);
    
      // Assert
      expect(session).toBeUndefined();
      expect(mockSocket.emit).toHaveBeenCalledWith('error', 'Error: User not found');
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

    it('should return null if chat session is not found', async () => {
      // Setup
      const sessionId = 'non-existent-session-id';
      (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(null);
  
      // Execute
      const session = await findChatSession(sessionId, prisma);
  
      // Assert
      expect(session).toBeNull();
    });
  });

  describe('getChatHistory', () => {
    it('should retrieve chat history for a session', async () => {
      // Setup
      const sessionId = 'some-session-id';
      const mockMessages = [{ id: 'msg1', msg: 'Hello', senderId: BigInt(1), receiverId: BigInt(2), createdAt: new Date(), updatedAt: new Date() }];
      const mockChatSession = { id: sessionId, msgs: mockMessages.map(m => m.id) };

      (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValue(mockChatSession);
      (prisma.msgSessions.findUnique as jest.Mock).mockImplementation((opts) =>
        Promise.resolve(mockMessages.find(m => m.id === opts.where.id)));

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

    it('should emit an empty array if there are no messages', async () => {
      // Setup
      const sessionId = 'some-session-id';
      const mockChatSession = { id: sessionId, msgs: [] };
  
      (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValue(mockChatSession);
  
      // Execute
      await getChatHistory(sessionId, mockSocket as Socket, prisma);
  
      // Assert
      expect(mockSocket.emit).toHaveBeenCalledWith('chat history', []);
    });

  });

  it('should handle messages not found in the database', async () => {
    const sessionId = 'some-session-id';
    const mockMessages = [{ id: 'msg1', msg: 'Hello', senderId: BigInt(1), receiverId: BigInt(2), createdAt: new Date() }];
    const mockChatSession = { id: sessionId, msgs: ['msg1', 'non-existent-msg'] };
  
    (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValue(mockChatSession);
    (prisma.msgSessions.findUnique as jest.Mock).mockImplementation((opts) => Promise.resolve(mockMessages.find(m => m.id === opts.where.id)));
  
    await getChatHistory(sessionId, mockSocket as Socket, prisma);
  
    expect(mockSocket.emit).toHaveBeenCalledWith('chat history', expect.any(Array));
  });

  it('should handle partial message retrieval', async () => {
    // Arrange
    const sessionId = 'valid-session-id';
    const mockChatSession = { id: sessionId, msgs: ['msg1', 'invalid-msg-id'] };
    const mockMessages = [{ id: 'msg1', msg: 'Hello', senderId: BigInt(1), receiverId: BigInt(2), createdAt: new Date() }];
  
    (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValue(mockChatSession);
    (prisma.msgSessions.findUnique as jest.Mock).mockImplementation((opts) =>
      Promise.resolve(mockMessages.find(m => m.id === opts.where.id))
    );
  
    // Act
    await getChatHistory(sessionId, mockSocket as Socket, prisma);
  
    // Assert
    expect(mockSocket.emit).toHaveBeenCalledWith('chat history', expect.any(Array));
    expect(mockSocket.emit).not.toHaveBeenCalledWith('error', 'Chat session not found');
  });
  
  it('should handle messages not found in the database', async () => {
    // Setup
    const sessionId = 'some-session-id';
    const mockMessages = [
      { id: 'msg1', msg: 'Hello', senderId: BigInt(1), receiverId: BigInt(2), createdAt: new Date(), updatedAt: new Date() },
      { id: 'msg2', msg: 'World', senderId: BigInt(2), receiverId: BigInt(1), createdAt: new Date(), updatedAt: new Date() },
    ];
    const mockChatSession = { id: sessionId, msgs: ['msg1', 'non-existent-msg'] };

    (prisma.chatSessions.findUnique as jest.Mock).mockResolvedValue(mockChatSession);
    (prisma.msgSessions.findUnique as jest.Mock)
      .mockImplementation((opts) => Promise.resolve(mockMessages.find(m => m.id === opts.where.id)));

    // Execute
    await getChatHistory(sessionId, mockSocket as Socket, prisma);

    // Assert
    expect(mockSocket.emit).toHaveBeenCalledWith('chat history', expect.any(Array));
  });


});
import { PrismaClient } from '@prisma/client'
import { Socket } from 'socket.io'
import { createChatSession, findChatSession, getChatHistory } from '../handler/chat.handler'

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => ({
    users: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    chatSessions: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    msgSessions: {
      findUnique: jest.fn(),
    },
  })),
}))

describe('Chat Service', () => {
  let prisma: PrismaClient
  let socket: Socket

  beforeEach(() => {
    prisma = new PrismaClient()
    socket = {
      emit: jest.fn(),
      join: jest.fn(),
    } as unknown as Socket
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('createChatSession', () => {
    // Test cases for createChatSession
    // ...
  })

  describe('findChatSession', () => {
    it('should find a chat session by ID', async () => {
      const sessionId = 'session-id'
      const chatSession = { id: sessionId }
      ;(prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(chatSession)

      const result = await findChatSession(sessionId)

      expect(prisma.chatSessions.findUnique).toHaveBeenCalledWith({ where: { id: sessionId } })
      expect(result).toEqual(chatSession)
    })
  })

  describe('getChatHistory', () => {
    it('should retrieve chat history and emit messages', async () => {
      const sessionId = 'session-id'
      const chatSession = { id: sessionId, msgs: ['msg-1', 'msg-2'] }
      const messages = [
        { id: 'msg-1', msg: 'Message 1', senderId: BigInt(1), receiverId: BigInt(2), createdAt: new Date(), updatedAt: new Date() },
        { id: 'msg-2', msg: 'Message 2', senderId: BigInt(2), receiverId: BigInt(1), createdAt: new Date(), updatedAt: new Date() },
      ]
      ;(prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(chatSession)
      ;(prisma.msgSessions.findUnique as jest.Mock)
        .mockResolvedValueOnce(messages[0])
        .mockResolvedValueOnce(messages[1])

      await getChatHistory(sessionId, socket)

      expect(prisma.chatSessions.findUnique).toHaveBeenCalledWith({ where: { id: sessionId } })
      expect(prisma.msgSessions.findUnique).toHaveBeenCalledTimes(2)
      expect(socket.emit).toHaveBeenCalledWith('chat history', [
        {
          ...messages[0],
          senderId: '1',
          receiverId: '2',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
        {
          ...messages[1],
          senderId: '2',
          receiverId: '1',
          createdAt: expect.any(String),
          updatedAt: expect.any(String),
        },
      ])
    })

    it('should throw an error if chat session is not found', async () => {
      const sessionId = 'session-id'
      ;(prisma.chatSessions.findUnique as jest.Mock).mockResolvedValueOnce(null)

      await expect(getChatHistory(sessionId, socket)).rejects.toThrowError('Chat session not found')
      expect(socket.emit).toHaveBeenCalledWith('error', 'Cannot get history chat history not found in DB')
    })
  })
})
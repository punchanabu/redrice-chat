import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { authenticateUser } from '../handler/auth.handler'

// Mock Prisma Client
jest.mock('@prisma/client', () => ({
    PrismaClient: jest.fn().mockImplementation(() => ({
        users: {
            findUnique: jest.fn(),
        },
    })),
}))

// Test Authentication Handler
describe('It can properly handle Authentication', () => {
    let prisma: PrismaClient

    beforeEach(() => {
        prisma = new PrismaClient()
    })

    afterEach(() => {
        jest.clearAllMocks()
    })

    it('should throw error if token is not provided', async () => {
        const secretKey = 'randomSecretKey007'
        const have = authenticateUser('', secretKey, prisma)
        await expect(have).rejects.toThrow('Token not provided')
    })

    it('should throw error if user is not found in databases', async () => {
        const secretKey = 'randomSecretKey007'
        const token = jwt.sign({ id: 1 }, secretKey)
        ;(prisma.users.findUnique as jest.Mock).mockResolvedValue(null)
        const have = authenticateUser(token, secretKey, prisma)
        await expect(have).rejects.toThrow('User not found in database')
    })

    it('should return the user if token is valid and user exists in databases', async () => {
        const secretKey = 'randomSecretKey007'
        const user = { id: 1 }
        const token = jwt.sign({ id: 1 }, secretKey)

        // Create a new instance of PrismaClient
        const prismaMock = new PrismaClient()

        // Mock the implementation of prisma.users.findUnique
        prismaMock.users.findUnique = jest.fn().mockResolvedValue(user)

        // Call the authenticateUser function with the mocked PrismaClient instance
        const result = await authenticateUser(token, secretKey, prismaMock)

        // Assert the expected result
        expect(result).toEqual(user)

        // Verify that prisma.users.findUnique was called with the correct arguments
        expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
            where: { id: 1 },
        })
    })
})

import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { DecodedToken } from '../types/jwt';

const prisma = new PrismaClient();

const authenticateUser = async (token: string, secretKey: string) => {
    if (!token) {
        throw new Error('Token not provided');
    }
    try {
        const decoded = jwt.verify(token, secretKey) as DecodedToken;
        const user = await prisma.user.findUnique({
            where: { id: Number(decoded.id) }
        });
        if (!user) {
            throw new Error('User not found in database');
        }
        return user;
    } catch (error) {
        throw new Error('Invalid token');
    }
}

export { authenticateUser };

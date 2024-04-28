import { Server, Socket } from 'socket.io'
import { authenticateUser } from '../handler/auth.handler'
import { joinChat, sendMessage, getMySession } from '../handler/session.handler'
import { createChatSession, getChatHistory } from '../handler/chat.handler'
import type { RestaurantSockets, NotifySessionMessage } from '../types/socket'
import { PrismaClient } from '@prisma/client'

export class UserController {
    private io: Server
    private secretKey: string
    private restaurantSockets: RestaurantSockets = {}
    private prisma: PrismaClient;
    constructor(io: Server, secretKey: string) {
        this.io = io
        this.secretKey = secretKey
        this.initializeChat()
        this.prisma = new PrismaClient;
    }

    private initializeChat(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('A user connected by socketID:', socket.id)
            const token = socket.handshake.auth.token;
            authenticateUser(token as string, this.secretKey, this.prisma)
                .then((user) => {
                    console.log('User connected with userID:', Number(user.id))

                    if (user.role == 'restaurant') {
                        if (!user.restaurant_id) {
                            throw Error(
                                'Invalid Restaurant Id There is no restaurantId in the user object!'
                            )
                        }

                        this.addRestaurantSocket(
                            user.restaurant_id?.toString(),
                            socket
                        )
                    }

                    socket.on('create chat', (restaurantId) =>
                        createChatSession(user.id, restaurantId, socket, this.prisma).then(
                            (session) => {
                                if (session) {
                                    this.notifySession(restaurantId, {
                                        message: `A User with ID:${session.userId} want to chat with you!`,
                                        sessionId: session.id,
                                        userId: session.userId,
                                    })
                                } else {
                                    // Handle the case where session is undefined
                                    console.error('Session is undefined')
                                }
                            }
                        )
                    )
                    socket.on('get my session', () => getMySession(user.id, socket, user.role || "user", this.prisma))
                    socket.on('join chat', (sessionId) =>
                        joinChat(socket, sessionId, user.id, this.prisma)
                    )

                    socket.on('send message', (msg) =>
                        sendMessage(socket, this.io, user.id, msg, this.prisma)
                    )

                    socket.on('chat history', (sessionId) =>
                        getChatHistory(sessionId, socket, this.prisma)
                    )

                    socket.on('disconnect', () => this.handleDisconnect(socket))
                })
                .catch((error) => {
                    console.error(error.message)
                    socket.emit('error', error.message)
                    socket.disconnect()
                })
        })
    }

    private addRestaurantSocket(restaurantId: string, socket: Socket) {
        this.restaurantSockets[restaurantId] =
            this.restaurantSockets[restaurantId] || []
        this.restaurantSockets[restaurantId].push(socket)
    }

    private notifySession(restaurantId: string, message: NotifySessionMessage) {
        const restaurantSockets = this.restaurantSockets[restaurantId]

        if (restaurantSockets) {
            restaurantSockets.forEach((restaurantSocket) => {
                restaurantSocket.emit('session', message.sessionId)
                joinChat(restaurantSocket, message.sessionId, message.userId,this.prisma)
            })
        }
    }

    private handleDisconnect = (
        socket: Socket,
        restaurantId?: string
    ): void => {
        if (restaurantId) {
            this.restaurantSockets[restaurantId] = this.restaurantSockets[
                restaurantId
            ].filter((s) => s !== socket)
        }
        socket.emit('disconnected', 'You have been disconnected!')
        console.log('User disconnected', socket.id)
    }
}

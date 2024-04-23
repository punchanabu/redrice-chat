import { Server, Socket } from 'socket.io'
import { authenticateUser } from '../handler/auth.handler'
import {
    joinChat,
    sendMessage,
    getMySession,
} from '../handler/session.handler'
import { createChatSession, findChatSession } from '../handler/chat.handler'
import { ChatSession } from '../types/chat'
import type { RestaurantSockets, NotifySessionMessage } from '../types/socket'

export class UserController {
    private io: Server
    private secretKey: string
    private restaurantSockets: RestaurantSockets = {}; 
    
    constructor(io: Server, secretKey: string) {
        this.io = io
        this.secretKey = secretKey
        this.initializeChat()
    }

    private initializeChat(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('A user connected by socketID:', socket.id)
            const token = socket.handshake.auth
            authenticateUser(token as unknown as string, this.secretKey)
                .then((user) => {
                    console.log('User connected with userID:', Number(user.id))
                    
                    if (user.role == "restaurant") {
                        if (!user.restaurant_id) {
                            throw Error("Invalid Restaurant Id There is no restaurantId in the user object!");
                        }

                        this.addRestaurantSocket(user.restaurant_id?.toString(), socket)
                    } 

                    socket.on('create chat', (restaurantId) =>
                        createChatSession(user.id, restaurantId, socket).then(session => {
                            this.notifySession(restaurantId,{
                                message: `A User with ID:${session.userId} want to chat with you!`,
                                sessionId: session.id,
                                userId: session.userId,
                            })
                        })
                    )
                    socket.on('get my session', () => getMySession(user.id, socket, user.role || "user"))
                    socket.on('join chat', (sessionId) =>
                        joinChat(socket, sessionId, user.id, {
                            findChatSession: findChatSession as (
                                sessionId: string
                            ) => Promise<ChatSession | null>,
                        })
                    )

                    socket.on('send message', (msg) =>
                        sendMessage(socket, this.io, user.id, msg)
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
        this.restaurantSockets[restaurantId] = this.restaurantSockets[restaurantId] || [];
        this.restaurantSockets[restaurantId].push(socket);
    }

    private notifySession(restaurantId: string, message : NotifySessionMessage) {
        let restaurantSockets = this.restaurantSockets[restaurantId];
        
        if (restaurantSockets) {
            
            restaurantSockets.forEach(restaurantSocket => {
                restaurantSocket.emit('session', message.sessionId)
                joinChat(restaurantSocket, message.sessionId, message.userId, {
                    findChatSession: findChatSession as (
                        sessionId: string
                    ) => Promise<ChatSession | null>,
                })
            });
        } 
    }

    private handleDisconnect = (socket: Socket, restaurantId?: string): void => {
        if (restaurantId) {
            this.restaurantSockets[restaurantId] = this.restaurantSockets[restaurantId].filter(s => s !== socket);
        }
        socket.emit('disconnected', 'You have been disconnected!')
        console.log('User disconnected', socket.id)
    }

}

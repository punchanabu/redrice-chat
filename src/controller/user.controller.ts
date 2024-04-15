import { Server, Socket } from "socket.io";
import { authenticateUser } from "../handler/auth.handler";
import { joinChat, sendMessage, handleDisconnect } from "../handler/session.handler";
import { createChatSession, findChatSession } from '../handler/chat.handler';

export class UserController {
    private io: Server;
    private secretKey: string;

    constructor(io: Server, secretKey: string) {
        this.io = io;
        this.secretKey = secretKey;
        this.initializeChat();
    }

    private initializeChat(): void {
        this.io.on("connection", (socket: Socket) => {
            console.log("A user connected by socketID:", socket.id);
            const token = socket.handshake.headers["authorization"];
            authenticateUser(token as string, this.secretKey)
                .then(user => {
                    console.log("User connected with userID:", user.id);

                    socket.on("join chat", (sessionId) => joinChat(socket, sessionId, user.id, { findChatSession }));
                    socket.on("send message", (msg) => sendMessage(socket, this.io, user.id, msg));
                    socket.on("disconnect", () => handleDisconnect(socket));
                })
                .catch(error => {
                    console.error(error.message);
                    socket.emit("auth_error", error.message);
                    socket.disconnect();
                });
        });
    }
}

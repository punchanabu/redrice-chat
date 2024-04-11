import { Server, Socket } from "socket.io";
import jwt from 'jsonwebtoken';
import { JwtPayload } from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface DecodedToken extends JwtPayload {
    id: string;
    email: string;
    role: string;
    exp: number;
}

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

            const token = socket.handshake.headers['authorization'];
            var userID: string;
            
            if(!token) {
                console.error('No token provided');
                socket.emit('auth error', 'Error token not provided');
                socket.disconnect();
                return;
            }

            try {
                const decodedToken: DecodedToken = jwt.verify(token, this.secretKey) as DecodedToken;
                userID = decodedToken.id;
                // Check if user not in database
          if (prisma.user.findUnique({ where: { ID: Number(userID) } }) == null) {
            socket.emit("auth_error", { message: "User not found in database" });
            console.error("User not found");
            socket.disconnect();
          }
                console.log('User connected with userID:', userID);
            } catch (error) {
                console.error('Error decoding token:', error);
            }


      socket.on("send message", (msg: { to: string; message: string }) => {
        console.log(
          `Sending message from UserID ${userID} to ${msg.to}`,
          msg.message
        );
        socket.to(msg.to).emit("receive message", {
          from: userID,
          message: msg.message,
        });
      });

      socket.on("disconnect", () => {
        console.log("User disconnected", socket.id);
      });
    });
  }
}

import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../types/jwt";
import { PrismaClient } from "@prisma/client";

export class UserController {
  private io: Server;
  private secretKey: string;
  private prisma: PrismaClient;

  constructor(io: Server, secretKey: string) {
    this.io = io;
    this.secretKey = secretKey;
    this.prisma = new PrismaClient();
    this.initializeChat();
  }

  private initializeChat(): void {
    this.io.on("connection", async (socket: Socket) => {
      
      console.log("A user connected by socketID:", socket.id);

      const token: string | undefined = socket.handshake.headers["authorization"];
      let userID: string;

      if (!token) {
        socket.emit("auth_error", "Error: token not provided");
        socket.disconnect();
        return;
      }

      try {

        // Verify the token
        const decodedToken = jwt.verify(token,this.secretKey) as DecodedToken;
        userID = decodedToken.id;

        // Handle user not in the database
        const user = await this.prisma.user.findUnique({
          where: {id: Number(userID)}
        });

        if (!user) {
            socket.emit("auth_error", "Error: User not found in database");
            console.error("User not found");
            socket.disconnect();
            return;
        }

        console.log("User connected with userID:", userID);

      } catch (error) {
        console.error("Error decoding token:", error);
        socket.emit("auth_error", "Error: invalid token");
        socket.disconnect();
        return // Ensure that userID is not used empty
      }

      // handle join chat session
      socket.on("join chat", async (sessionId: string) => {
        const session = await this.prisma.chatSession.findUnique({
            where: { id: sessionId }
        });

        if (session && (session.userId == Number(userID) || session.restaurantId == Number(userID))) {
            socket.join(sessionId);
            console.log(`User ${userID} joined chat session ${sessionId}`)
        } else {
            socket.emit("auth_error", "Error: Unauthorized access to chat session")
        }
      });

      // handle send message
      socket.on("send message", async (msg: { sessionId: string; message: string}) => {
          
          // Check if the sender is the part of the session.
          if (socket.rooms.has(msg.sessionId)) {
              console.log(`Sending a message from UserID ${userID} in session ${msg.sessionId}`, msg.message);
              this.io.to(msg.sessionId).emit("receive message", {
                from: userID,
                message: msg.message,
              });
          } else {
              socket.emit("error", "Error: You are not a member of this chat session")
          }
      });

      // handle disconnect
      socket.on("disconnect", () => {
          socket.emit("disconnected", "You have been disconnected!")
          console.log("User disconnected", socket.id);
      })

    });
  }
}

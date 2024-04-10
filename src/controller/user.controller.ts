import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
      var userID: any;
      if (token) {
        try {
          const decodedToken: any = jwt.verify(token, this.secretKey);
          userID = decodedToken.id;
          console.log("User connected with userID:", userID);
        } catch (error) {
          console.error("Error decoding token:", error);
        }
      } else {
        console.error("No token provided");
        socket.disconnect();
      }

      // Check if user not in database
      if (prisma.user.findUnique({ where: { ID: userID } }) == null) {
        console.error("User not found");
        socket.disconnect();
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

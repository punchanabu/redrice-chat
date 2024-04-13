import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../types/jwt";
import { PrismaClient } from "@prisma/client";

export class UserController {
  private io: Server;
  private secretKey: string;
  private prisma;

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
        const user = await this.prisma.users.findUnique({
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

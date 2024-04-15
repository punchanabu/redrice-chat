import { Socket, Server } from "socket.io";
import { ChatSession, ChatSessionManager} from "../types/chat";


const joinChat = async (socket: Socket, sessionId: string, userId: number, chatSessionManager: ChatSessionManager): Promise<void> => {
    const session = await chatSessionManager.findChatSession(sessionId);
    if (session && (session.userId == userId || session.restaurantId == userId)) {
        socket.join(sessionId);
        console.log(`User ${userId} joined chat session ${sessionId}`);
    } else {
        socket.emit("auth_error", "Error: Unauthorized access to chat session");
    }
};

const sendMessage = (
    socket: Socket,
    io: Server,
    userId: number,
    msg: { sessionId: string; message: string }
  ): void => {
    if (socket.rooms.has(msg.sessionId)) {
      io.to(msg.sessionId).emit("receive message", {
        from: userId,
        message: msg.message,
      });
    } else {
      socket.emit("error", "Error: You are not a member of this chat session");
    }
  };

  const handleDisconnect = (socket: Socket): void => {
    socket.emit("disconnected", "You have been disconnected!");
    console.log("User disconnected", socket.id);
  };

export { joinChat, sendMessage, handleDisconnect };

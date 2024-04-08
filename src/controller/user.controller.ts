import { Server, Socket } from "socket.io";

export class UserController {
    private io: Server;

    constructor(io : Server) {
        this.io = io;
        this.initializeChat();
    }

    private initializeChat(): void {
        this.io.on('connection', (socket: Socket) => {
            console.log('A user connected', socket.id);

            socket.on('send message', (msg: { to : string; message: string}) => {
                socket.to(msg.to).emit('receive message', {
                    from: socket.id,
                    message: msg.message,
                });
            });

            socket.on('disconnect', () => {
                console.log('User disconnected', socket.id);
            })
            
        })
    }


}
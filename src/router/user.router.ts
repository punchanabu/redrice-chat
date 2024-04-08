import { Server } from "socket.io";
import { BaseRouter } from "../base/base.router";
import { UserController } from "../controller/user.controller";
import { Router } from "express";

export class UserRouter extends BaseRouter {

    static prefix = '/api'
    private userController: UserController;

    constructor(io: Server) {
        super(UserRouter.prefix);
        this.userController = new UserController(io);
        this.initRoutes();
    }

    initRoutes(): void {
        this.router.get(
            '/chat/:id', (req,res) => {
                // This is a mock up it will be implemented later
                res.send('Fetching chat history')
            }
        )
    }

    getRouter(): Router {
        return this.router;
    }
}


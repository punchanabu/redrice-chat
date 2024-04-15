import { Server } from 'socket.io'
import { BaseRouter } from '../base/base.router'
import { UserController } from '../controller/user.controller'

export class UserRouter extends BaseRouter {
    static prefix = '/api'
    private userController: UserController
    private jwtSecret: string

    constructor(io: Server) {
        super(UserRouter.prefix)
        this.jwtSecret = process.env.JWT_SECRET || ''
        this.userController = new UserController(io, this.jwtSecret)
        this.initRoutes()
    }

    initRoutes(): void {
        this.router.get('/chat/:id', (req, res) => {
            // This is a mock up it will be implemented later
            res.send('Fetching chat history')
        })

        // Get My Chat Session
        this.router.get('/session/me', (req,res) => {
            
        })
    }
}

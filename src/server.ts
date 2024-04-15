import { Server as HTTPServer } from 'http'
import express, { Express } from 'express'
import cors from 'cors'
import { Server } from 'socket.io'
import { UserRouter } from './router/user.router'

// This will be a function to initialize the server
export async function initServer(app: Express, server: HTTPServer, io: Server) {
    app.use(cors())

    // endpoint to check the status of the server
    app.get('/healthz', (req, res) => {
        res.send('OK')
    })

    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    const userRouter = new UserRouter(io)
    app.use(userRouter.getRouter())

    return app
}

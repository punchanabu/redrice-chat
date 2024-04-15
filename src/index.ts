import express from 'express'
import { initServer } from './server'
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const httpServer = createServer(app)
const io = new Server(httpServer)

console.log('Starting the Application..... 🔥')

initServer(app, httpServer, io)
    .then(() => {
        httpServer.listen(3000, () => {
            console.log('server is running on PORT 3000')
        })
    })

    .catch((err) => {
        console.error('Error initializing server 💀', err)
        process.exit(1)
    })

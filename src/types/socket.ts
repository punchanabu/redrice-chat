import { Socket } from "socket.io";

interface RestaurantSockets {
    [restaurantId: string] : Socket[]
}

interface NotifySessionMessage {
    message: string,
    sessionId: string,
    userId: bigint,
}
export { RestaurantSockets, NotifySessionMessage };
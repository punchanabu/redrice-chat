import { JwtPayload } from 'jsonwebtoken'

interface DecodedToken extends JwtPayload {
    id: string
    email: string
    role: string
    exp: number
}

export { DecodedToken }

import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: string
  email: string
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET

  if (!secret) {
    throw new Error('JWT_SECRET is not configured')
  }

  return secret
}

export function signAccessToken(payload: JwtPayload) {
  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as jwt.SignOptions['expiresIn']

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn,
  })
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, getJwtSecret()) as JwtPayload & jwt.JwtPayload
}

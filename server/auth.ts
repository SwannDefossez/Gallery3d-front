import type { Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from './env';

const AUTH_COOKIE_NAME = 'gallery3d_session';

type AuthTokenPayload = {
  userId: string;
};

export function signAuthToken(userId: string) {
  return jwt.sign({ userId } satisfies AuthTokenPayload, env.jwtSecret, {
    expiresIn: '7d',
  });
}

export function verifyAuthToken(token: string) {
  return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
}

export function setAuthCookie(response: Response, token: string) {
  response.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function clearAuthCookie(response: Response) {
  response.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
  });
}

export function getAuthCookieName() {
  return AUTH_COOKIE_NAME;
}

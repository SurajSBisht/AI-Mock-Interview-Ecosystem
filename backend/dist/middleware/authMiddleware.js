import { HttpError } from '../utils/httpError.js';
import { verifyAccessToken } from '../utils/jwt.js';
export function requireAuth(req, _res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new HttpError(401, 'Authentication required'));
    }
    const token = authHeader.slice('Bearer '.length).trim();
    try {
        req.auth = verifyAccessToken(token);
        return next();
    }
    catch {
        return next(new HttpError(401, 'Your session has expired. Please sign in again.'));
    }
}

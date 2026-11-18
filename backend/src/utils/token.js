import jwt from 'jsonwebtoken';
import ApiError from './ApiError.js';

const ALGORITHM = 'HS256';

export default function createTokenService({ secret, expiresIn }) {
  return {
    sign(userId) {
      return jwt.sign({}, secret, {
        subject: String(userId),
        expiresIn,
        algorithm: ALGORITHM,
      });
    },

    expiresAt(token) {
      return new Date(jwt.decode(token).exp * 1000);
    },

    /** Returns the user id from a valid token, otherwise throws 401. */
    verify(token) {
      let payload;
      try {
        payload = jwt.verify(token, secret, { algorithms: [ALGORITHM] });
      } catch {
        throw ApiError.unauthorized('Invalid or expired token');
      }

      const userId = Number(payload.sub);
      if (!Number.isInteger(userId) || userId <= 0) {
        throw ApiError.unauthorized('Invalid or expired token');
      }
      return userId;
    },
  };
}

import ApiError from '../utils/ApiError.js';

const normalizeEmail = (email) => email.trim().toLowerCase();

export default function createAuthService({ userRepository, passwordHasher, tokenService }) {
  return {
    async register({ email, password, fullName }) {
      const normalizedEmail = normalizeEmail(email);

      const existing = await userRepository.findByEmail(normalizedEmail);
      if (existing) {
        throw ApiError.conflict('Email is already registered');
      }

      const passwordHash = await passwordHasher.hash(password);
      const user = await userRepository.create({
        email: normalizedEmail,
        passwordHash,
        fullName: fullName.trim(),
      });

      return { user, accessToken: tokenService.sign(user.id) };
    },

    async login({ email, password }) {
      const user = await userRepository.findByEmail(normalizeEmail(email));
      const isValid = user ? await passwordHasher.compare(password, user.passwordHash) : false;

      // Same error for unknown email and wrong password.
      if (!isValid) {
        throw ApiError.unauthorized('Invalid email or password');
      }

      const { passwordHash, ...publicUser } = user;
      return { user: publicUser, accessToken: tokenService.sign(user.id) };
    },

    async getCurrentUser(userId) {
      const user = await userRepository.findById(userId);
      if (!user) {
        throw ApiError.unauthorized('User no longer exists');
      }
      return user;
    },
  };
}

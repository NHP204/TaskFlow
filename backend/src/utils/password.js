import bcrypt from 'bcrypt';

export default function createPasswordHasher({ saltRounds }) {
  return {
    hash: (password) => bcrypt.hash(password, saltRounds),
    compare: (password, hash) => bcrypt.compare(password, hash),
  };
}

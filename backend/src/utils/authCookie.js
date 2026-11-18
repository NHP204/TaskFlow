export const AUTH_COOKIE = 'taskflow_token';

export function authCookieOptions(env) {
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: 'lax',
    path: '/api',
  };
}

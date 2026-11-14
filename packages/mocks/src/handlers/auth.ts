import {
  changePasswordSchema,
  emailRequestSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  routes,
  verifyEmailSchema,
  type User,
} from '@mitdrone/types';

import { getDb, nextId, passwordFor } from '../db';
import { ApiError, readBody, requireUser, route } from '../http';
import { issueTokens } from '../tokens';

export const authHandlers = [
  route('get', routes.auth.registrationTerms, () => ({
    buyer: 'v1',
    vendor: 'v1',
    serviceProvider: 'v1',
  })),

  route('post', routes.auth.login, async ({ request }) => {
    const { email, password } = await readBody(request, loginSchema);
    const user = getDb().users.find(
      (candidate) => candidate.email.toLowerCase() === email.toLowerCase(),
    );
    if (!user || passwordFor(email) !== password) {
      throw new ApiError(401, 'invalid_credentials', 'Incorrect email or password');
    }
    if (!user.emailVerified) {
      throw new ApiError(403, 'email_not_verified', 'Verify your email before signing in');
    }
    if (user.status === 'suspended')
      throw new ApiError(403, 'account_suspended', 'This account is suspended');
    user.lastLoginAt = new Date().toISOString();
    return Response.json(
      { user, tokens: issueTokens(user), csrfToken: 'mock-csrf-token' },
      {
        status: 200,
        headers: {
          'set-cookie': `mitdrone_session=${encodeURIComponent(user.id)}; Path=/; HttpOnly; SameSite=Lax`,
        },
      },
    );
  }),

  route('post', routes.auth.register, async ({ request }) => {
    const input = await readBody(request, registerSchema);
    const db = getDb();
    const email = input.email.toLowerCase();
    if (db.users.some((user) => user.email.toLowerCase() === email)) {
      throw new ApiError(409, 'email_taken', 'An account with this email already exists', {
        email: ['Email already in use'],
      });
    }
    const now = new Date().toISOString();
    const user: User = {
      id: nextId('usr'),
      email,
      name: input.fullName,
      phone: input.phone,
      role: 'customer',
      status: 'active',
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    };
    db.users.push(user);
    db.passwords[email] = input.password;
    return new Response(null, { status: 202 });
  }),

  route('post', routes.auth.verifyEmail, async ({ request }) => {
    const { password } = await readBody(request, verifyEmailSchema);
    const user = getDb().users.find(
      (candidate) => !candidate.emailVerified && passwordFor(candidate.email) === password,
    );
    if (!user) throw new ApiError(400, 'invalid_verification_token', 'Invalid verification token');
    user.emailVerified = true;
    return undefined;
  }),

  route('post', routes.auth.resendVerification, async ({ request }) => {
    await readBody(request, emailRequestSchema);
    return new Response(null, { status: 202 });
  }),

  route('post', routes.auth.logout, () => new Response(null, { status: 204 })),
  route('post', routes.auth.logoutAll, () => new Response(null, { status: 204 })),

  route('post', routes.auth.forgotPassword, async ({ request }) => {
    await readBody(request, emailRequestSchema);
    return new Response(null, { status: 202 });
  }),

  route('post', routes.auth.resetPassword, async ({ request }) => {
    await readBody(request, resetPasswordSchema);
    return new Response(null, { status: 204 });
  }),

  route('post', routes.auth.changePassword, async ({ request }) => {
    requireUser(request);
    await readBody(request, changePasswordSchema);
    return undefined;
  }),

  route('get', routes.auth.session, ({ request }) => {
    const user = requireUser(request);
    return Response.json({ user, csrfToken: 'mock-csrf-token' });
  }),
];

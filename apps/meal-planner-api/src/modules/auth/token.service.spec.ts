import { SignJWT } from 'jose';

import { TEST_SECRET } from '../../testing/create-test-app';
import { TokenService } from './token.service';

const make = (now = new Date('2026-03-30T10:00:00Z'), secret = TEST_SECRET) =>
  new TokenService({ secret, accessTokenMinutes: 15, now: () => now });

describe('TokenService', () => {
  it('round-trips user and session ids', async () => {
    const { token, expiresAt } = await make().signAccessToken({ userId: 'u1', sessionId: 's1' });
    expect(expiresAt.toISOString()).toBe('2026-03-30T10:15:00.000Z');
    expect(await make().verifyAccessToken(token)).toEqual({ userId: 'u1', sessionId: 's1' });
  });

  it('rejects an expired token with TOKEN_EXPIRED', async () => {
    const { token } = await make().signAccessToken({ userId: 'u1', sessionId: 's1' });
    await expect(make(new Date('2026-03-30T10:16:00Z')).verifyAccessToken(token)).rejects.toMatchObject({ code: 'TOKEN_EXPIRED', status: 401 });
  });

  it('rejects tokens signed with another secret, tampered tokens and garbage', async () => {
    const { token } = await make(undefined, 'another-secret-another-secret-another-secret').signAccessToken({ userId: 'u1', sessionId: 's1' });
    await expect(make().verifyAccessToken(token)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });

    const good = (await make().signAccessToken({ userId: 'u1', sessionId: 's1' })).token;
    const [h, p, s] = good.split('.');
    const tamperedPayload = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url').toString()), sub: 'someone-else' })).toString('base64url');
    await expect(make().verifyAccessToken(`${h}.${tamperedPayload}.${s}`)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(make().verifyAccessToken('not.a.jwt')).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects unsigned (alg=none) tokens', async () => {
    const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const none = `${enc({ alg: 'none', typ: 'JWT' })}.${enc({ sub: 'u1', sid: 's1', iss: 'ai-meal-planner-api', aud: 'ai-meal-planner-app', exp: 4102444800 })}.`;
    await expect(make().verifyAccessToken(none)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });

  it('rejects tokens with the wrong audience or missing claims', async () => {
    const key = new TextEncoder().encode(TEST_SECRET);
    const wrongAud = await new SignJWT({ sid: 's1' }).setProtectedHeader({ alg: 'HS256' }).setSubject('u1').setIssuer('ai-meal-planner-api').setAudience('someone-else').setExpirationTime('1h').sign(key);
    const noSid = await new SignJWT({}).setProtectedHeader({ alg: 'HS256' }).setSubject('u1').setIssuer('ai-meal-planner-api').setAudience('ai-meal-planner-app').setExpirationTime(4102444800).sign(key);
    await expect(new TokenService({ secret: TEST_SECRET, accessTokenMinutes: 15 }).verifyAccessToken(wrongAud)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(make(new Date('2026-03-30T10:00:00Z')).verifyAccessToken(noSid)).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
  });
});

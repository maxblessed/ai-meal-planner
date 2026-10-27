import { ScryptPasswordHasher } from './password-hasher';

const hasher = new ScryptPasswordHasher({ N: 1024, r: 8, p: 1 });

describe('ScryptPasswordHasher', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hasher.hash('correct horse battery');
    expect(await hasher.verify('correct horse battery', stored)).toBe(true);
    expect(await hasher.verify('correct horse batterz', stored)).toBe(false);
  });

  it('salts every hash and never stores the password', async () => {
    const [a, b] = [await hasher.hash('same password'), await hasher.hash('same password')];
    expect(a).not.toBe(b);
    expect(a).not.toContain('same password');
    expect(a.startsWith('scrypt$')).toBe(true);
  });

  it('reads parameters from the stored hash so they can be raised later', async () => {
    const stored = await new ScryptPasswordHasher({ N: 2048, r: 8, p: 1 }).hash('pw-12345678');
    expect(await hasher.verify('pw-12345678', stored)).toBe(true);
  });

  it.each(['', 'garbage', 'bcrypt$10$abc$def', 'scrypt$x$y$z$a$b'])('rejects malformed stored hash %p', async (stored) => {
    expect(await hasher.verify('anything', stored)).toBe(false);
  });
});

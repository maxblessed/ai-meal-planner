import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import { secureTokenStorage } from './tokenStorage';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  WHEN_UNLOCKED_THIS_DEVICE_ONLY: 6,
}));

const tokens = {
  accessToken: 'a',
  accessTokenExpiresAt: '2026-03-30T10:15:00.000Z',
  refreshToken: 'r',
  refreshTokenExpiresAt: '2026-04-29T10:00:00.000Z',
};

describe('secureTokenStorage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('writes tokens to the secure store (device-only) and never to AsyncStorage', async () => {
    await secureTokenStorage.save(tokens);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), JSON.stringify(tokens), {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    });
    expect(await AsyncStorage.getAllKeys()).toEqual([]);
  });

  it('loads valid tokens and treats corrupt data as signed out', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(JSON.stringify(tokens));
    expect(await secureTokenStorage.load()).toEqual(tokens);

    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('{"nope":true}');
    expect(await secureTokenStorage.load()).toBeNull();
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce('not json');
    expect(await secureTokenStorage.load()).toBeNull();
  });

  it('deletes tokens on clear', async () => {
    await secureTokenStorage.clear();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});

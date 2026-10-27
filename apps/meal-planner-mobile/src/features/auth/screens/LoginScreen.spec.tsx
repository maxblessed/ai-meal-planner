import { ApiError } from '@ai-meal-planner/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RegisterScreen } from './RegisterScreen';
import { LoginScreen } from './LoginScreen';

const mockLogin = jest.fn();
const mockRegister = jest.fn();
jest.mock('../AuthProvider', () => ({ useAuth: () => ({ login: mockLogin, register: mockRegister }) }));
jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));

const press = (name: string) => fireEvent.press(screen.getByRole('button', { name }));

describe('LoginScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('validates before calling the API', async () => {
    render(<LoginScreen />);
    press('Sign in');
    expect(await screen.findByText('Enter a valid email address')).toBeTruthy();
    expect(mockLogin).not.toHaveBeenCalled();
  });

  it('signs in with a normalised email', async () => {
    mockLogin.mockResolvedValue(undefined);
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), '  Ada@Example.com ');
    fireEvent.changeText(screen.getByLabelText('Password'), 'correct horse battery');
    press('Sign in');
    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'correct horse battery' }));
  });

  it('shows the server message for invalid credentials, without clearing the form', async () => {
    mockLogin.mockRejectedValue(new ApiError('INVALID_CREDENTIALS', 'Incorrect email or password.', 401));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'wrong password');
    press('Sign in');
    expect(await screen.findByText('Incorrect email or password.')).toBeTruthy();
    expect(screen.getByLabelText('Email').props.value).toBe('ada@example.com');
  });

  it('shows a network error in plain language', async () => {
    mockLogin.mockRejectedValue(new ApiError('NETWORK_ERROR', "We couldn't reach the meal planner service."));
    render(<LoginScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'whatever1');
    press('Sign in');
    expect(await screen.findByText("We couldn't reach the meal planner service.")).toBeTruthy();
  });
});

describe('RegisterScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('enforces the password length rule and creates the account', async () => {
    mockRegister.mockResolvedValue(undefined);
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'short');
    press('Create account');
    expect(await screen.findByText('Use at least 8 characters')).toBeTruthy();
    expect(mockRegister).not.toHaveBeenCalled();

    fireEvent.changeText(screen.getByLabelText('Password'), 'long enough password');
    press('Create account');
    await waitFor(() => expect(mockRegister).toHaveBeenCalledWith({ email: 'ada@example.com', password: 'long enough password', displayName: undefined }));
  });

  it('shows "already registered" on the email field', async () => {
    mockRegister.mockRejectedValue(new ApiError('EMAIL_ALREADY_REGISTERED', 'An account with this email already exists.', 409));
    render(<RegisterScreen />);
    fireEvent.changeText(screen.getByLabelText('Email'), 'ada@example.com');
    fireEvent.changeText(screen.getByLabelText('Password'), 'long enough password');
    press('Create account');
    expect(await screen.findByText('An account with this email already exists.')).toBeTruthy();
  });
});

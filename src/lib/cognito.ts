/**
 * Usługa integracji z AWS Cognito
 *
 * Ten moduł zawiera funkcje do komunikacji z usługą AWS Cognito,
 * umożliwiające autentykację, rejestrację, resetowanie haseł i zarządzanie sesją.
 */

import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  SignUpCommand,
  ConfirmSignUpCommand,
  ForgotPasswordCommand,
  ConfirmForgotPasswordCommand,
  ResendConfirmationCodeCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AuthFlowType,
  NotAuthorizedException,
  UserNotConfirmedException,
  UserNotFoundException,
  CodeMismatchException,
  ExpiredCodeException,
  LimitExceededException,
  TooManyRequestsException,
  UsernameExistsException
} from '@aws-sdk/client-cognito-identity-provider';

import AWS_COGNITO_CONFIG from './aws-config';
import { CognitoTokens } from '../types/types';
import { saveAuthTokens, getAuthTokens, clearSession } from './session-storage';

// Usunięto nieużywane importy UserProfile i prepareNewTokens

// Inicjalizacja klienta AWS Cognito
const cognitoClient = new CognitoIdentityProviderClient({
  region: AWS_COGNITO_CONFIG.REGION
});

// Typy błędów Cognito
export enum CognitoErrorType {
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  USER_NOT_CONFIRMED = 'USER_NOT_CONFIRMED',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  CODE_MISMATCH = 'CODE_MISMATCH',
  CODE_EXPIRED = 'CODE_EXPIRED',
  LIMIT_EXCEEDED = 'LIMIT_EXCEEDED',
  TOO_MANY_REQUESTS = 'TOO_MANY_REQUESTS',
  USERNAME_EXISTS = 'USERNAME_EXISTS',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

// Niestandardowy błąd Cognito
export class CognitoError extends Error {
  type: CognitoErrorType;

  constructor(message: string, type: CognitoErrorType) {
    super(message);
    this.type = type;
    this.name = 'CognitoError';
  }
}

// Usunięto nieużywany interfejs CognitoErrorResponse

/**
 * Mapuje błąd AWS Cognito na CognitoError
 * @param error Błąd oryginalny
 * @returns Zmapowany błąd CognitoError
 */
const mapCognitoError = (error: unknown): CognitoError => {
  let message = 'Wystąpił nieznany błąd podczas uwierzytelniania.';
  let type = CognitoErrorType.UNKNOWN_ERROR;

  if (error instanceof NotAuthorizedException) {
    message = 'Nieprawidłowy adres email lub hasło.';
    type = CognitoErrorType.INVALID_CREDENTIALS;
  } else if (error instanceof UserNotConfirmedException) {
    message = 'Konto nie zostało potwierdzone. Sprawdź swój email.';
    type = CognitoErrorType.USER_NOT_CONFIRMED;
  } else if (error instanceof UserNotFoundException) {
    message = 'Nie znaleziono użytkownika z podanym adresem email.';
    type = CognitoErrorType.USER_NOT_FOUND;
  } else if (error instanceof CodeMismatchException) {
    message = 'Podany kod weryfikacyjny jest nieprawidłowy.';
    type = CognitoErrorType.CODE_MISMATCH;
  } else if (error instanceof ExpiredCodeException) {
    message = 'Kod weryfikacyjny wygasł. Poproś o nowy kod.';
    type = CognitoErrorType.CODE_EXPIRED;
  } else if (error instanceof LimitExceededException) {
    message = 'Przekroczono limit prób. Spróbuj ponownie później.';
    type = CognitoErrorType.LIMIT_EXCEEDED;
  } else if (error instanceof TooManyRequestsException) {
    message = 'Zbyt wiele żądań. Spróbuj ponownie później.';
    type = CognitoErrorType.TOO_MANY_REQUESTS;
  } else if (error instanceof UsernameExistsException) {
    message = 'Użytkownik z podanym adresem email już istnieje.';
    type = CognitoErrorType.USERNAME_EXISTS;
  } else if (error instanceof Error) {
    message = error.message || message;
  }

  console.error('Cognito error:', error);
  return new CognitoError(message, type);
};

/**
 * Loguje użytkownika do systemu
 * @param email Email użytkownika
 * @param password Hasło użytkownika
 * @returns Tokeny uwierzytelniające
 */
export const signIn = async (email: string, password: string): Promise<CognitoTokens> => {
  try {
    const command = new InitiateAuthCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      throw new Error('Brak danych uwierzytelniających w odpowiedzi.');
    }

    const { AccessToken, IdToken, RefreshToken, ExpiresIn } = response.AuthenticationResult;

    if (!AccessToken || !IdToken || !RefreshToken) {
      throw new Error('Brak wymaganych tokenów w odpowiedzi.');
    }

    // Obliczanie czasu wygaśnięcia w sekundach od epoki
    const expiresAt = Math.floor(Date.now() / 1000) + (ExpiresIn || AWS_COGNITO_CONFIG.TOKEN_EXPIRES_IN);

    const tokens: CognitoTokens = {
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: RefreshToken,
      expiresAt
    };

    // Zapisanie tokenów w Session Storage
    saveAuthTokens(tokens);

    return tokens;
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Rejestruje nowego użytkownika
 * @param email Email użytkownika
 * @param password Hasło użytkownika
 * @param attributes Dodatkowe atrybuty użytkownika
 * @returns Identyfikator użytkownika (sub)
 */
export const signUp = async (
  email: string,
  password: string,
  attributes: {
    firstName: string;
    lastName: string;
    phoneNumber: string;
  }
): Promise<string> => {
  try {
    const command = new SignUpCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'name', Value: `${attributes.firstName} ${attributes.lastName}` },
        { Name: 'family_name', Value: attributes.lastName },
        { Name: 'phone_number', Value: attributes.phoneNumber }
      ]
    });

    const response = await cognitoClient.send(command);

    if (!response.UserSub) {
      throw new Error('Brak identyfikatora użytkownika w odpowiedzi.');
    }

    return response.UserSub;
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Potwierdza rejestrację użytkownika za pomocą kodu weryfikacyjnego
 * @param email Email użytkownika
 * @param code Kod weryfikacyjny
 */
export const confirmSignUp = async (email: string, code: string): Promise<void> => {
  try {
    const command = new ConfirmSignUpCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: code
    });

    await cognitoClient.send(command);
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Ponownie wysyła kod weryfikacyjny do użytkownika
 * @param email Email użytkownika
 */
export const resendConfirmationCode = async (email: string): Promise<void> => {
  try {
    const command = new ResendConfirmationCodeCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      Username: email
    });

    await cognitoClient.send(command);
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Inicjuje proces resetowania hasła
 * @param email Email użytkownika
 */
export const forgotPassword = async (email: string): Promise<void> => {
  try {
    const command = new ForgotPasswordCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      Username: email
    });

    await cognitoClient.send(command);
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Potwierdza nowe hasło po resetowaniu
 * @param email Email użytkownika
 * @param code Kod weryfikacyjny
 * @param newPassword Nowe hasło
 */
export const confirmForgotPassword = async (
  email: string,
  code: string,
  newPassword: string
): Promise<void> => {
  try {
    const command = new ConfirmForgotPasswordCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
      Password: newPassword
    });

    await cognitoClient.send(command);
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Odświeża sesję użytkownika za pomocą refresh tokena
 * @returns Nowe tokeny uwierzytelniające lub null jeśli brak tokena odświeżania
 */
export const refreshSession = async (): Promise<CognitoTokens | null> => {
  try {
    const currentTokens = getAuthTokens();

    // Zamiast rzucać wyjątek, zwracamy null gdy nie ma tokena odświeżania
    if (!currentTokens || !currentTokens.refreshToken) {
      return null;
    }

    const command = new InitiateAuthCommand({
      ClientId: AWS_COGNITO_CONFIG.USER_POOL_CLIENT_ID,
      AuthFlow: AuthFlowType.REFRESH_TOKEN_AUTH,
      AuthParameters: {
        REFRESH_TOKEN: currentTokens.refreshToken
      }
    });

    const response = await cognitoClient.send(command);

    if (!response.AuthenticationResult) {
      throw new Error('Brak danych uwierzytelniających w odpowiedzi.');
    }

    const { AccessToken, IdToken, ExpiresIn } = response.AuthenticationResult;

    if (!AccessToken || !IdToken) {
      throw new Error('Brak wymaganych tokenów w odpowiedzi.');
    }

    // Obliczanie czasu wygaśnięcia
    const expiresAt = Math.floor(Date.now() / 1000) + (ExpiresIn || AWS_COGNITO_CONFIG.TOKEN_EXPIRES_IN);

    // Przygotowanie nowych tokenów, zachowując obecny refresh token
    const tokens: CognitoTokens = {
      accessToken: AccessToken,
      idToken: IdToken,
      refreshToken: currentTokens.refreshToken,
      expiresAt
    };

    // Zapisanie tokenów w Session Storage
    saveAuthTokens(tokens);

    return tokens;
  } catch (error) {
    // Czyszczenie sesji w przypadku błędu odświeżania
    clearSession();
    throw mapCognitoError(error);
  }
};

// Interfejs dla odpowiedzi z GetUser
interface CognitoUserResponse {
  Username?: string;
  UserAttributes?: Array<{
    Name?: string;
    Value?: string;
  }>;
  [key: string]: unknown;
}

/**
 * Pobiera dane zalogowanego użytkownika
 * @param token Token dostępu (opcjonalny)
 * @returns Dane użytkownika
 */
export const getCurrentUser = async (token?: string): Promise<Record<string, string>> => {
  try {
    const accessToken = token || getAuthTokens()?.accessToken;

    if (!accessToken) {
      throw new Error('Brak tokenu dostępu. Wymagane logowanie.');
    }

    const command = new GetUserCommand({
      AccessToken: accessToken
    });

    const response = await cognitoClient.send(command) as unknown as CognitoUserResponse;

    // Przetworzenie atrybutów użytkownika na obiekt
    const userAttributes: Record<string, string> = {};

    if (response.UserAttributes) {
      response.UserAttributes.forEach(attr => {
        if (attr.Name && attr.Value) {
          userAttributes[attr.Name] = attr.Value;
        }
      });
    }

    return {
      username: response.Username || '',
      ...userAttributes
    };
  } catch (error) {
    throw mapCognitoError(error);
  }
};

/**
 * Wylogowuje użytkownika globalnie (ze wszystkich urządzeń)
 */
export const globalSignOut = async (): Promise<void> => {
  try {
    const accessToken = getAuthTokens()?.accessToken;

    if (!accessToken) {
      return; // Użytkownik już wylogowany
    }

    const command = new GlobalSignOutCommand({
      AccessToken: accessToken
    });

    await cognitoClient.send(command);

    // Czyszczenie lokalnej sesji
    clearSession();
  } catch (error) {
    // Nawet w przypadku błędu, czyścimy lokalną sesję
    clearSession();
    console.error('Error during global sign out:', error);
  }
};
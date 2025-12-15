/**
 * Konfiguracja AWS Cognito dla aplikacji HealthProCRM
 *
 * Ten plik zawiera parametry konfiguracyjne dla integracji z AWS Cognito,
 * w tym identyfikatory puli użytkowników, klienta, regionu oraz
 * ustawienia przepływów uwierzytelniania.
 */

const AWS_COGNITO_CONFIG = {
  // Parametry puli użytkowników Cognito
  REGION: 'eu-central-1',
  USER_POOL_ID: 'eu-central-1_wbvxRUvlR',
  USER_POOL_CLIENT_ID: '6lpgcdos8qhoj9osk02nob7ckk',

  // Konfiguracja przepływów uwierzytelniania
  AUTH_FLOWS: {
    ALLOW_USER_PASSWORD_AUTH: true,
    ALLOW_REFRESH_TOKEN_AUTH: true,
    ALLOW_USER_SRP_AUTH: true
  },

  // Ustawienia tokenów
  TOKEN_EXPIRES_IN: 3600, // 1 godzina w sekundach
  REFRESH_TOKEN_EXPIRES_IN: 30 * 24 * 60 * 60, // 30 dni w sekundach

  // Ustawienia komunikacji
  OAUTH: {
    DOMAIN: 'healthprocrm.auth.eu-central-1.amazoncognito.com',
    SCOPE: ['email', 'openid', 'profile'],
    RESPONSE_TYPE: 'code'
  },

  // Adresy URL zwrotne (callback)
  REDIRECT_URLS: {
    DEV: 'http://localhost:3000/api/auth/callback/cognito',
    PROD: 'https://healthprosystem.com/api/auth/callback/cognito'
  },

  // Adresy URL wylogowania
  LOGOUT_URLS: {
    DEV: 'http://localhost:3000/login',
    PROD: 'https://healthprosystem.com/login'
  }
};

export default AWS_COGNITO_CONFIG;
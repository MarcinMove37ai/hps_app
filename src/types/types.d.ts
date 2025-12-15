// Definicja typu dla ról użytkownika
type UserRole = 'ADMIN' | 'USER' | 'GOD';

// Typy dla systemu autoryzacji AWS Cognito
interface UserProfile {
  id: string;
  cognito_sub: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  supervisor_code: string;
  status: 'pending' | 'active' | 'blocked';
  role: UserRole; // dodane pole role
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

interface CognitoTokens {
  accessToken: string;
  idToken: string;
  refreshToken: string;
  expiresAt: number;
}

// Interfejs dla tokenu JWT z Cognito
interface CognitoJwtPayload {
  sub: string; // ID użytkownika w Cognito
  iss: string; // issuer - URL puli użytkowników
  client_id: string; // ID klienta aplikacji
  origin_jti: string;
  event_id: string;
  token_use: string;
  scope: string;
  auth_time: number;
  exp: number; // timestamp wygaśnięcia
  iat: number; // timestamp wystawienia
  jti: string;
  username: string;
  [key: string]: string | number | boolean | unknown; // dodatkowe pola z bardziej precyzyjnym typem
}

// Typy dla błędów Cognito
enum CognitoErrorType {
  INVALID_CREDENTIALS = 'InvalidCredentialsException',
  USER_NOT_CONFIRMED = 'UserNotConfirmedException',
  USERNAME_EXISTS = 'UsernameExistsException',
  USER_NOT_FOUND = 'UserNotFoundException',
  CODE_MISMATCH = 'CodeMismatchException',
  CODE_EXPIRED = 'ExpiredCodeException',
  UNKNOWN = 'UnknownException'
}

// Typy dla metod autoryzacji w Cognito
enum AuthMethod {
  SIGN_IN = 'signIn',
  SIGN_UP = 'signUp',
  CONFIRM_SIGN_UP = 'confirmSignUp',
  FORGOT_PASSWORD = 'forgotPassword',
  CONFIRM_FORGOT_PASSWORD = 'confirmForgotPassword',
  REFRESH_SESSION = 'refreshSession'
}

// Istniejące typy aplikacji
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  originalMessage?: string; // oryginalne pytanie bez kontekstu
  type: 'user' | 'assistant';
  timestamp?: number;
}

interface Source {
  id: string | number; // Dodane pole id jako wymagane
  [key: string]: string | number | boolean | string[] | undefined; // Rozszerzone o string[]
  PMID?: string;
  title?: string;
  abstract?: string;
  publication_date?: string;
  country?: string;
  journal?: string;
  domain_primary?: string;
  domain_secondary?: string;
  trial_population?: string;
  population?: string; // Dodane pole z StudyCard
  measured_outcomes?: string | string[]; // Rozszerzone o string[]
  observed_outcomes?: string | string[]; // Rozszerzone o string[]
  similarity?: number;
  url?: string;
}

// Zaktualizowany interfejs StudyData by pasował do wymagań komponenetu StudyCard
interface StudyData extends Source {
  PMID: string; // wymagane
  title: string; // wymagane
  journal: string; // wymagane - dostosowane do StudyCard
  domain_primary: string; // wymagane - dostosowane do StudyCard
}

interface SearchParams {
  search_type: 'semantic' | 'statistical' | 'hybrid';
  query_mode: 'last' | 'all';
  top_k: number;
  alpha?: number;  // Wymagane tylko dla hybrid
}

interface SearchResponse {
  results: Source[];
  total_found: number;
}

interface ChatResponse {
  response: string;
  sources: Source[];
}

// Typy dla modułu wyszukiwania
interface SearchModuleParams {
  queries: string[];
  searchType: 'semantic' | 'statistical' | 'hybrid';
  topK: number;
  alpha?: number;
}

interface SearchModuleResponse {
  results: Source[];
  total_found: number;
}

// Typy dla interfejsu partnerów
interface PartnerViewData {
  id: string;
  cognito_sub: string;
  name: string;
  first_name: string;
  last_name: string;
  contact: string;
  email: string;
  phone: string;
  status: 'active' | 'pending' | 'blocked';
  role: UserRole;
  admin_comment: string;
  supervisor_code: string;
  created_at: string;
  updated_at: string;
}

interface PartnerStats {
  total: number;
  active: number;
  pending: number;
  blocked: number;
}

interface SupervisorCode {
  code: string;
  description: string;
  is_active?: boolean;
}

interface PartnersApiResponse {
  partners: PartnerViewData[];
  stats: PartnerStats;
  supervisors: SupervisorCode[];
}

interface UpdatePartnerStatusRequest {
  status: 'active' | 'pending' | 'blocked';
}

interface UpdatePartnerCommentRequest {
  admin_comment: string | null;
}

export type {
  // Nowe typy dla autoryzacji
  UserRole, // eksport typu UserRole
  UserProfile,
  CognitoTokens,
  CognitoJwtPayload,

  // Enumy dla autoryzacji
  CognitoErrorType,
  AuthMethod,

  // Istniejące typy
  ChatMessage,
  Source,
  StudyData,
  SearchParams,
  SearchResponse,
  ChatResponse,
  SearchModuleParams,
  SearchModuleResponse,

  // Typy dla interfejsu partnerów
  PartnerViewData,
  PartnerStats,
  SupervisorCode,
  PartnersApiResponse,
  UpdatePartnerStatusRequest,
  UpdatePartnerCommentRequest
};
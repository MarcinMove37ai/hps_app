// src/app/api/types.ts
// Ten plik zawiera lokalne definicje typów używane w API routes

// Definicja typu dla ról użytkownika
export type UserRole = 'ADMIN' | 'USER' | 'GOD';

// Typy dla interfejsu użytkownika
export interface UserProfile {
  id: string;
  cognito_sub: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  supervisor_code: string;
  status: 'pending' | 'active' | 'blocked';
  role: UserRole;
  admin_comment?: string;
  created_at: string;
  updated_at: string;
}

// Typy dla interfejsu partnerów
export interface PartnerViewData {
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

export interface PartnerStats {
  total: number;
  active: number;
  pending: number;
  blocked: number;
}

export interface SupervisorCode {
  code: string;
  description: string;
  is_active?: boolean;
}

export interface PartnersApiResponse {
  partners: PartnerViewData[];
  stats: PartnerStats;
  supervisors: SupervisorCode[];
}

export interface UpdatePartnerStatusRequest {
  status: 'active' | 'pending' | 'blocked';
}

export interface UpdatePartnerCommentRequest {
  admin_comment: string | null;
}
import type { UserRole } from '../types/database';

export interface UserSessionInfo {
  name: string;
  email: string;
  roleLabel: string;
  avatarInitials: string;
  avatarColor: string;
}

export const ROLE_USER_MAP: Record<UserRole, UserSessionInfo> = {
  SUPERADMIN: {
    name: 'Alexandre Lynx',
    email: 'admin@lynxems.com.br',
    roleLabel: 'Superadmin Plataforma',
    avatarInitials: 'AL',
    avatarColor: 'from-purple-600 to-indigo-600',
  },
  RESTAURANT_ADMIN: {
    name: 'Carlos Eduardo',
    email: 'carlos@sabordavila.com.br',
    roleLabel: 'Dono / Administrador Master',
    avatarInitials: 'CE',
    avatarColor: 'from-emerald-600 to-teal-500',
  },
  CASHIER: {
    name: 'Mariana Atendente',
    email: 'caixa@sabordavila.com.br',
    roleLabel: 'Atendente de Balcão',
    avatarInitials: 'MA',
    avatarColor: 'from-blue-600 to-cyan-500',
  },
  COMPANY_MANAGER: {
    name: 'Roberto RH (São Jorge)',
    email: 'roberto@oficinasaojorge.com.br',
    roleLabel: 'Gestor Convênio Empresa',
    avatarInitials: 'RR',
    avatarColor: 'from-amber-600 to-orange-500',
  },
  CONSUMER: {
    name: 'Carlos Alberto Mecânico',
    email: 'carlos.mecanico@email.com',
    roleLabel: 'Consumidor Conveniado',
    avatarInitials: 'CM',
    avatarColor: 'from-emerald-500 to-emerald-700',
  },
};

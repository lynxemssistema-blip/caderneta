export type UserRole = 
  | 'SUPERADMIN' 
  | 'RESTAURANT_ADMIN' 
  | 'CASHIER' 
  | 'COMPANY_MANAGER' 
  | 'CONSUMER';

export type BillingCycle = 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
export type InvoiceStatus = 'OPEN' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';
export type ProductCategory = 'MEAL' | 'BEVERAGE' | 'DESSERT' | 'OTHER';
export type ApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';

export interface Tenant {
  id: string;
  created_at: string;
  trade_name: string;
  document_number: string;
  phone: string;
  pix_key: string;
  pix_key_type: 'CPF' | 'CNPJ' | 'EMAIL' | 'TELEFONE' | 'ALEATORIA';
  subscription_status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELLED';
  trial_until?: string;
}

export interface Profile {
  id: string;
  user_id?: string;
  tenant_id?: string;
  role: UserRole;
  full_name: string;
  phone: string;
  email?: string;
  photo_url?: string;
  pin_hash?: string;
  approval_status?: ApprovalStatus;
  created_at: string;
}

export interface CorporateClient {
  id: string;
  tenant_id: string;
  manager_profile_id?: string;
  company_name: string;
  cnpj?: string;
  billing_cycle: BillingCycle;
  closing_day: number;
  payment_terms_days: number;
  spending_limit_per_user: number;
  company_covers_only_meal: boolean;
  created_at: string;
  // Computed client-side
  total_pending?: number;
  employee_count?: number;
}

export interface Consumer {
  id: string;
  tenant_id: string;
  profile_id?: string;
  corporate_client_id?: string;
  name: string;
  phone: string;
  email?: string;
  photo_url?: string;
  pin_hash?: string;
  has_individual_account: boolean;
  individual_credit_limit: number;
  individual_billing_cycle: BillingCycle;
  status: 'ACTIVE' | 'BLOCKED';
  email_verified: boolean;
  verification_code?: string;
  verification_code_expires_at?: string;
  approval_status: ApprovalStatus;
  approved_at?: string;
  company_covers_beverage?: boolean; // Se a empresa cobre bebida/extra deste funcionário
  daily_spending_limit?: number; // Limite diário específico (0 para padrão da empresa)
  created_at: string;
  // Joins
  corporate_client?: CorporateClient;
  total_pending?: number;
}

export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  category: ProductCategory;
  price: number;
  is_active: boolean;
  image_url?: string;
  created_at?: string;
}

export interface LedgerEntry {
  id: string;
  tenant_id: string;
  consumer_id: string;
  corporate_client_id?: string;
  payer_type: 'COMPANY' | 'INDIVIDUAL';
  meal_amount: number;
  extra_amount: number;
  total_amount: number;
  description?: string;
  signature_verified: boolean;
  invoice_id?: string;
  status: 'PENDING' | 'BILLED' | 'PAID' | 'CANCELLED';
  created_at: string;
  consumer?: Consumer;
  corporate_client?: CorporateClient;
  items?: LedgerEntryItem[];
}

export interface LedgerEntryItem {
  id: string;
  ledger_entry_id: string;
  product_id?: string;
  product_name: string;
  category: ProductCategory;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at?: string;
}

export interface Invoice {
  id: string;
  tenant_id: string;
  corporate_client_id?: string;
  consumer_id?: string;
  type: 'COMPANY_INVOICE' | 'INDIVIDUAL_INVOICE';
  cycle_start: string;
  cycle_end: string;
  due_date: string;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  paid_at?: string;
  payment_method?: 'PIX' | 'DINHEIRO' | 'CARTAO';
  created_at: string;
  corporate_client?: CorporateClient;
  consumer?: Consumer;
}

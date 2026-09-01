export type UserRole = 'patient' | 'doctor' | 'assistant' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  is_verified?: boolean;
  is_active?: boolean;
  clinic_id?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Clinic {
  id: string;
  owner_id: string;
  name: string;
  tagline?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  logo_url?: string;
  cover_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  owner_first_name?: string;
  owner_last_name?: string;
  owner_email?: string;
  patient_count?: number;
  appointment_count?: number;
  plan_name?: string;
}

export interface Patient {
  id: string;
  clinic_id: string;
  user_id?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender?: 'male' | 'female' | 'other';
  phone?: string;
  email?: string;
  address?: string;
  blood_group?: string;
  allergies?: string;
  chronic_conditions?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface DoctorProfile {
  id?: string;
  user_id: string;
  specialization?: string;
  qualifications?: string;
  experience_years?: number;
  consultation_fee?: number;
  bio?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  clinic_name?: string;
  clinic_id?: string;
  avg_rating?: number;
  review_count?: number;
}

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type AppointmentType = 'in-person' | 'video' | 'phone';

export interface Appointment {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id: string;
  service_id?: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  notes?: string;
  cancellation_reason?: string;
  created_at?: string;
  updated_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_phone?: string;
  patient_email?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  doctor_specialization?: string;
  service_name?: string;
  service_price?: number;
  clinic_name?: string;
}

export interface MedicalRecord {
  id: string;
  patient_id: string;
  clinic_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis?: string;
  symptoms?: string;
  treatment_plan?: string;
  notes?: string;
  follow_up_date?: string;
  is_confidential?: boolean;
  created_at?: string;
  updated_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
}

export interface PrescriptionItem {
  id?: string;
  prescription_id?: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  patient_id: string;
  clinic_id: string;
  doctor_id: string;
  appointment_id?: string;
  diagnosis?: string;
  notes?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  items?: PrescriptionItem[];
}

export type PaymentMethod = 'cash' | 'card' | 'online' | 'mobile_banking';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Payment {
  id: string;
  clinic_id: string;
  patient_id: string;
  appointment_id?: string;
  invoice_number: string;
  amount: number;
  discount: number;
  tax: number;
  total_amount: number;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  transaction_id?: string;
  payment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  patient_phone?: string;
  service_name?: string;
  clinic_name?: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string;
  price: number;
  billing_cycle: 'monthly' | 'quarterly' | 'yearly';
  max_doctors?: number | null;
  max_patients?: number | null;
  max_staff?: number | null;
  features: string[];
  structured_features?: Record<string, boolean>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ClinicSubscription {
  id?: string;
  clinic_id: string;
  plan_id?: string;
  status: 'active' | 'cancelled' | 'expired';
  start_date?: string;
  end_date?: string;
  plan_name?: string;
  price?: number;
  billing_cycle?: string;
  features?: string[];
  structured_features?: Record<string, boolean>;
  is_default?: boolean;
  max_doctors?: number | null;
  max_patients?: number | null;
  max_staff?: number | null;
}

export interface Review {
  id: string;
  clinic_id: string;
  patient_id: string;
  doctor_id?: string;
  appointment_id?: string;
  rating: number;
  comment?: string;
  is_approved?: boolean;
  created_at?: string;
  updated_at?: string;
  patient_first_name?: string;
  patient_last_name?: string;
  doctor_first_name?: string;
  doctor_last_name?: string;
  clinic_name?: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  reference_type?: string;
  reference_id?: string;
  created_at: string;
}

export interface DirectMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  clinic_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_first_name?: string;
  sender_last_name?: string;
  receiver_first_name?: string;
  receiver_last_name?: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  action: string;
  entity_type?: string;
  entity_id?: string;
  details?: any;
  ip_address?: string;
  created_at: string;
  user_email?: string;
  user_role?: string;
}

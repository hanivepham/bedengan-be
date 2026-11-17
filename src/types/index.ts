import { Request } from 'express';

/**
 * Extended Express Request with Authenticated Admin
 */
export interface AuthRequest extends Request {
  admin?: AdminEntity;
  file?: any;
}

/**
 * Entity: Admin
 */
export interface AdminEntity {
  id: number;
  name: string;
  email: string;
  password?: string;
  role?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

/**
 * DTO: Auth Login
 */
export interface LoginDTO {
  email?: string;
  password?: string;
}

/**
 * DTO: Admin Update Profile
 */
export interface UpdateProfileDTO {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

/**
 * Entity: Ground
 */
export interface GroundEntity {
  id: number;
  code: string;
  name: string;
  capacity_badge: string;
  description?: string;
  area_size?: string;
  terrain_feature?: string;
  nearby_facility?: string;
  toilet_distance?: string;
  highlight_text?: string;
  highlight_theme?: string;
  image_url?: string | null;
  file_url?: string | null;
  is_active?: boolean | number;
  created_at?: string | Date;
  updated_at?: string | Date;
  specs?: {
    area_size: string;
    terrain_feature: string;
    nearby_facility: string;
    toilet_distance: string;
  };
}

/**
 * DTO: Create Ground
 */
export interface CreateGroundDTO {
  code: string;
  name: string;
  capacity_badge: string;
  description?: string;
  area_size?: string;
  terrain_feature?: string;
  nearby_facility?: string;
  toilet_distance?: string;
  highlight_text?: string;
  highlight_theme?: string;
  image_url?: string | null;
  is_active?: boolean | number | string;
}

/**
 * DTO: Update Ground
 */
export interface UpdateGroundDTO {
  code?: string;
  name?: string;
  capacity_badge?: string;
  description?: string;
  area_size?: string;
  terrain_feature?: string;
  nearby_facility?: string;
  toilet_distance?: string;
  highlight_text?: string;
  highlight_theme?: string;
  image_url?: string | null;
  is_active?: boolean | number | string;
}

/**
 * Entity: Catalog
 */
export interface CatalogEntity {
  id: number;
  category: 'rental' | 'warung' | 'photographer';
  name: string;
  price_text?: string;
  description?: string;
  location_note?: string;
  contact_phone?: string;
  operating_hours?: string;
  image_url?: string | null;
  file_url?: string | null;
  banner_url?: string | null;
  status: 'approved' | 'pending' | 'rejected';
  applicant_name?: string | null;
  social_handle?: string | null;
  tags?: string[] | string | null;
  tags_raw?: string;
  created_at?: string | Date;
  updated_at?: string | Date;
}

/**
 * DTO: Catalog Filter
 */
export interface CatalogFilterDTO {
  category?: string;
  status?: string;
  search?: string;
}

/**
 * DTO: Create Catalog
 */
export interface CreateCatalogDTO {
  category?: string;
  name?: string;
  price_text?: string;
  price?: string;
  description?: string;
  location_note?: string;
  address?: string;
  location?: string;
  contact_phone?: string;
  whatsapp?: string;
  phone?: string;
  operating_hours?: string;
  openingTime?: string;
  closingTime?: string;
  image_url?: string | null;
  image?: string;
  status?: string;
  applicant_name?: string;
  applicantName?: string;
  social_handle?: string;
  instagramUsername?: string;
  instagram?: string;
  tags?: any;
}

/**
 * DTO: Update Catalog
 */
export interface UpdateCatalogDTO extends Partial<CreateCatalogDTO> {}

/**
 * Entity: Guide Rule / Warning / Etiquette
 */
export interface GuideRuleEntity {
  id: number;
  type: 'rule' | 'warning' | 'etiquette';
  title: string;
  description?: string;
  icon_name?: string;
  display_order?: number;
  created_at?: string | Date;
}

/**
 * DTO: Create Guide Rule
 */
export interface CreateGuideRuleDTO {
  type: 'rule' | 'warning' | 'etiquette' | string;
  title: string;
  description?: string;
  icon_name?: string;
  display_order?: number | string;
}

/**
 * Entity: Emergency Contact
 */
export interface EmergencyContactEntity {
  id: number;
  title: string;
  phone_number: string;
  location_detail?: string;
  icon_name?: string;
  created_at?: string | Date;
}

/**
 * DTO: Create Emergency Contact
 */
export interface CreateEmergencyContactDTO {
  title: string;
  phone_number: string;
  location_detail?: string;
  icon_name?: string;
}

/**
 * Entity: Review
 */
export interface ReviewEntity {
  id: number;
  visitor_name: string;
  rating: number;
  comment: string;
  visit_date?: string;
  is_published?: number | boolean;
  created_at?: string | Date;
}

/**
 * DTO: Create Review
 */
export interface CreateReviewDTO {
  visitor_name: string;
  rating: number | string;
  comment: string;
  visit_date?: string;
}

/**
 * Standard API Response Structure
 */
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  error?: any;
}


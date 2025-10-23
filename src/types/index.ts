export enum UserRole {
  CUSTOMER = 'customer',
  RESTAURANT_OWNER = 'restaurant_owner',
  DRIVER = 'driver',
  ADMIN = 'admin',
  SUPPORT = 'support'
}

export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  FAILED = 'failed',
  REFUNDED = 'refunded'
}

export enum ActivityLevel {
  SEDENTARY = 'sedentary',
  LIGHT = 'light',
  MODERATE = 'moderate',
  ACTIVE = 'active',
  VERY_ACTIVE = 'very_active'
}

export enum FitnessGoal {
  WEIGHT_LOSS = 'weight_loss',
  MAINTENANCE = 'maintenance',
  BULKING = 'bulking',
  MUSCLE_GAIN = 'muscle_gain'
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other'
}

export enum MealCategory {
  BREAKFAST = 'breakfast',
  LUNCH = 'lunch',
  DINNER = 'dinner',
  SNACKS = 'snacks',
  BEVERAGES = 'beverages'
}

export interface User {
  id: string;
  email: string;
  phone?: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: UserRole;
  created_at: Date;
  updated_at: Date;
  last_login?: Date;
}

export interface Restaurant {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  cuisine_type: string[];
  address: any;
  phone: string;
  email: string;
  commission_rate: number;
  is_active: boolean;
  operating_hours: any;
  average_prep_time: number;
  created_at: Date;
  updated_at: Date;
}

export interface MenuItem {
  id: string;
  restaurant_id: string;
  name: string;
  description?: string;
  image_url?: string;
  base_price: number;
  category: MealCategory;
  is_available: boolean;
  availability_schedule?: any;
  prep_time?: number;
  created_at: Date;
  updated_at: Date;
}

export interface NutritionalInfo {
  id: string;
  menu_item_id: string;
  variant_id?: string;
  serving_size: string;
  calories: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  allergens?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  restaurants: string[];
  status: OrderStatus;
  delivery_address: any;
  delivery_instructions?: string;
  scheduled_for?: Date;
  subtotal: number;
  delivery_fee: number;
  service_fee: number;
  total_amount: number;
  payment_intent_id?: string;
  payment_status: PaymentStatus;
  driver_id?: string;
  estimated_delivery_time?: Date;
  actual_delivery_time?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

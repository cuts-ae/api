import { UserRole, Gender, ActivityLevel, FitnessGoal, MealCategory } from '../../src/types';

export const testUsers = {
  customer: {
    email: 'customer@cuts.ae',
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'Customer',
    phone: '+971501234567',
    role: UserRole.CUSTOMER
  },
  restaurantOwner: {
    email: 'owner@cuts.ae',
    password: 'Password123!',
    first_name: 'Restaurant',
    last_name: 'Owner',
    phone: '+971501234568',
    role: UserRole.RESTAURANT_OWNER
  },
  admin: {
    email: 'admin@cuts.ae',
    password: 'Password123!',
    first_name: 'Admin',
    last_name: 'User',
    phone: '+971501234569',
    role: UserRole.ADMIN
  },
  driver: {
    email: 'driver@cuts.ae',
    password: 'Password123!',
    first_name: 'Test',
    last_name: 'Driver',
    phone: '+971501234570',
    role: UserRole.DRIVER
  }
};

export const testRestaurant = {
  name: 'Healthy Bites',
  slug: 'healthy-bites',
  description: 'Fresh and healthy meals',
  cuisine_type: ['healthy', 'mediterranean'],
  address: {
    street: '123 Sheikh Zayed Road',
    city: 'Dubai',
    emirate: 'Dubai',
    postal_code: '00000'
  },
  phone: '+971501234571',
  email: 'restaurant@cuts.ae',
  commission_rate: 15,
  is_active: true,
  operating_hours: {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '22:00' },
    saturday: { open: '09:00', close: '22:00' },
    sunday: { open: '09:00', close: '22:00' }
  },
  average_prep_time: 30
};

export const testMenuItem = {
  name: 'Grilled Chicken Salad',
  description: 'Fresh grilled chicken with mixed greens',
  base_price: 45.00,
  category: MealCategory.LUNCH,
  is_available: true,
  prep_time: 15
};

export const testNutrition = {
  serving_size: '350g',
  calories: 450,
  protein: 35,
  carbohydrates: 25,
  fat: 15,
  fiber: 8,
  sugar: 5,
  sodium: 600,
  allergens: []
};

export const testCustomerProfile = {
  height: 175,
  weight: 75,
  age: 30,
  gender: Gender.MALE,
  activity_level: ActivityLevel.MODERATE,
  goal: FitnessGoal.MAINTENANCE,
  dietary_restrictions: ['gluten-free']
};

export const testOrder = {
  items: [
    {
      menu_item_id: '',
      restaurant_id: '',
      quantity: 2,
      selected_variants: [],
      special_instructions: 'No onions please'
    }
  ],
  delivery_address: {
    street: '456 Palm Jumeirah',
    city: 'Dubai',
    emirate: 'Dubai',
    postal_code: '00000',
    building: 'Golden Mile 5',
    apartment: '501'
  },
  delivery_instructions: 'Call upon arrival'
};

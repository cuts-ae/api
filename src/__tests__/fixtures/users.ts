import { UserRole } from '../../types';

export const testUsers = {
  restaurantOwner: {
    email: 'test-owner@cuts.ae',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'Owner',
    phone: '+971501111111',
    role: UserRole.RESTAURANT_OWNER
  },
  customer: {
    email: 'test-customer@cuts.ae',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'Customer',
    phone: '+971502222222',
    role: UserRole.CUSTOMER
  },
  admin: {
    email: 'test-admin@cuts.ae',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'Admin',
    phone: '+971503333333',
    role: UserRole.ADMIN
  },
  driver: {
    email: 'test-driver@cuts.ae',
    password: 'TestPassword123!',
    first_name: 'Test',
    last_name: 'Driver',
    phone: '+971504444444',
    role: UserRole.DRIVER
  }
};

export const testRestaurant = {
  name: 'Test Restaurant',
  description: 'A test restaurant for automated testing',
  cuisine_type: ['Test', 'Healthy'],
  address: {
    street: '123 Test Street',
    city: 'Abu Dhabi',
    state: 'Abu Dhabi',
    postal_code: '12345',
    country: 'UAE'
  },
  phone: '+971501234567',
  email: 'test@cuts.ae',
  operating_hours: {
    monday: { open: '09:00', close: '22:00' },
    tuesday: { open: '09:00', close: '22:00' },
    wednesday: { open: '09:00', close: '22:00' },
    thursday: { open: '09:00', close: '22:00' },
    friday: { open: '09:00', close: '22:00' },
    saturday: { open: '10:00', close: '23:00' },
    sunday: { open: '10:00', close: '23:00' }
  },
  average_prep_time: 30
};

export const testMenuItem = {
  name: 'Test Grilled Chicken',
  description: 'Test menu item for automated testing',
  base_price: 45.00,
  category: 'lunch',
  is_available: true,
  prep_time: 15
};

export const testNutrition = {
  serving_size: '1 plate (350g)',
  calories: 450,
  protein: 42,
  carbohydrates: 28,
  fat: 18,
  fiber: 6,
  sugar: 4,
  sodium: 680,
  allergens: ['dairy']
};

/**
 * Test data generators for E2E tests
 */

export function generateUniqueEmail(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7)}@cuts.ae`;
}

export function generateCustomerData() {
  return {
    email: generateUniqueEmail('customer'),
    password: 'Test123!@#',
    first_name: 'John',
    last_name: 'Doe',
    phone: '+971501234567',
    role: 'customer',
  };
}

export function generateRestaurantOwnerData() {
  return {
    email: generateUniqueEmail('owner'),
    password: 'Test123!@#',
    first_name: 'Restaurant',
    last_name: 'Owner',
    phone: '+971507654321',
    role: 'restaurant_owner',
  };
}

export function generateAdminData() {
  return {
    email: generateUniqueEmail('admin'),
    password: 'Test123!@#',
    first_name: 'Admin',
    last_name: 'User',
    phone: '+971509876543',
    role: 'admin',
  };
}

export function generateRestaurantData() {
  return {
    name: `Test Restaurant ${Date.now()}`,
    cuisine_type: 'Italian',
    description: 'A test restaurant for E2E testing',
    address: {
      street: '123 Test Street',
      city: 'Dubai',
      state: 'Dubai',
      country: 'UAE',
      postal_code: '12345',
    },
    phone: '+971501111111',
    email: generateUniqueEmail('restaurant'),
    operating_hours: {
      monday: { open: '09:00', close: '22:00', is_open: true },
      tuesday: { open: '09:00', close: '22:00', is_open: true },
      wednesday: { open: '09:00', close: '22:00', is_open: true },
      thursday: { open: '09:00', close: '22:00', is_open: true },
      friday: { open: '09:00', close: '22:00', is_open: true },
      saturday: { open: '09:00', close: '22:00', is_open: true },
      sunday: { open: '09:00', close: '22:00', is_open: true },
    },
    delivery_fee: 10,
    minimum_order: 20,
    estimated_delivery_time: 30,
  };
}

export function generateMenuItemData(restaurantId: string) {
  return {
    restaurant_id: restaurantId,
    name: `Test Menu Item ${Date.now()}`,
    description: 'A delicious test item',
    category: 'Main Course',
    base_price: 45.99,
    is_available: true,
    dietary_info: ['vegetarian'],
    allergen_info: ['nuts'],
    preparation_time: 15,
  };
}

export function generateDeliveryAddress() {
  return {
    street: '456 Customer Avenue',
    city: 'Dubai',
    state: 'Dubai',
    country: 'UAE',
    postal_code: '54321',
    latitude: 25.2048,
    longitude: 55.2708,
  };
}

export function generateOrderData(
  menuItemId: string,
  restaurantId: string,
  quantity: number = 2
) {
  return {
    items: [
      {
        menu_item_id: menuItemId,
        restaurant_id: restaurantId,
        quantity: quantity,
        special_instructions: 'Extra spicy please',
      },
    ],
    delivery_address: generateDeliveryAddress(),
    delivery_instructions: 'Ring the doorbell twice',
  };
}

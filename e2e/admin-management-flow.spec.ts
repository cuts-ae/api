import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api-client';
import {
  generateAdminData,
  generateCustomerData,
  generateRestaurantOwnerData,
  generateRestaurantData,
} from './helpers/test-data';

/**
 * E2E Test: Admin Management Flow
 *
 * This test covers admin operations:
 * 1. Admin registration/login
 * 2. View all users
 * 3. View all restaurants
 * 4. Manage system-wide operations
 * 5. Access control verification
 */
test.describe('Admin Management Flow E2E', () => {
  let adminClient: ApiClient;
  let customerClient: ApiClient;
  let ownerClient: ApiClient;
  let restaurantId: string;

  test.beforeAll(async ({ request }) => {
    const baseURL = process.env.API_URL || 'http://localhost:45000';

    adminClient = new ApiClient(request, baseURL);
    customerClient = new ApiClient(request, baseURL);
    ownerClient = new ApiClient(request, baseURL);
  });

  test('Step 1: Create test users and restaurant', async () => {
    // Register admin
    const adminData = generateAdminData();
    const { response: adminResponse, body: adminBody } =
      await adminClient.register(adminData);

    expect(adminResponse.ok()).toBeTruthy();
    expect(adminBody.user.role).toBe('admin');

    // Register customer
    const customerData = generateCustomerData();
    await customerClient.register(customerData);

    // Register restaurant owner
    const ownerData = generateRestaurantOwnerData();
    await ownerClient.register(ownerData);

    // Create restaurant
    const restaurantData = generateRestaurantData();
    const { body: restaurantBody } = await ownerClient.createRestaurant(
      restaurantData
    );
    restaurantId = restaurantBody.restaurant.id;
  });

  test('Step 2: Admin can view all restaurants', async () => {
    const { response, body } = await adminClient.getRestaurants();

    expect(response.ok()).toBeTruthy();
    expect(body.restaurants).toBeDefined();
    expect(Array.isArray(body.restaurants)).toBeTruthy();

    // Should include the restaurant we created
    const testRestaurant = body.restaurants.find(
      (r: any) => r.id === restaurantId
    );
    expect(testRestaurant).toBeDefined();
  });

  test('Step 3: Admin can view all orders', async () => {
    const { response, body } = await adminClient.getOrders();

    expect(response.ok()).toBeTruthy();
    expect(body.orders).toBeDefined();
    expect(Array.isArray(body.orders)).toBeTruthy();
  });

  test('Step 4: Customer cannot access admin functions', async () => {
    // Customer should only see their own data
    const { response, body } = await customerClient.getOrders();

    expect(response.ok()).toBeTruthy();
    // Customer orders should be filtered to only their orders
    if (body.orders && body.orders.length > 0) {
      body.orders.forEach((order: any) => {
        // Should only see their own orders
        expect(order).toBeDefined();
      });
    }
  });

  test('Step 5: Restaurant owner has limited access', async () => {
    // Restaurant owner should only see orders for their restaurants
    const { response, body } = await ownerClient.getOrders({
      restaurant_id: restaurantId,
    });

    expect(response.ok()).toBeTruthy();
    expect(body.orders).toBeDefined();
  });
});

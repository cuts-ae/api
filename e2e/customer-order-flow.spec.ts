import { test, expect } from '@playwright/test';
import { ApiClient } from './helpers/api-client';
import {
  generateCustomerData,
  generateRestaurantOwnerData,
  generateRestaurantData,
  generateMenuItemData,
  generateOrderData,
} from './helpers/test-data';

/**
 * E2E Test: Complete Customer Order Flow
 *
 * This test covers the entire customer journey:
 * 1. Customer registration
 * 2. Login
 * 3. Browse restaurants (created by restaurant owner)
 * 4. View menu items
 * 5. Create order
 * 6. View order details
 * 7. Track order status
 */
test.describe('Customer Order Flow E2E', () => {
  let customerClient: ApiClient;
  let ownerClient: ApiClient;
  let restaurantId: string;
  let menuItemId: string;
  let orderId: string;

  test.beforeAll(async ({ request }) => {
    const baseURL = process.env.API_URL || 'http://localhost:45000';

    customerClient = new ApiClient(request, baseURL);
    ownerClient = new ApiClient(request, baseURL);
  });

  test('Step 1: Restaurant owner creates account and sets up restaurant', async () => {
    // Register restaurant owner
    const ownerData = generateRestaurantOwnerData();
    const { response: registerResponse, body: registerBody } =
      await ownerClient.register(ownerData);

    expect(registerResponse.ok()).toBeTruthy();
    expect(registerBody.token).toBeDefined();
    expect(registerBody.user.role).toBe('restaurant_owner');

    // Create restaurant
    const restaurantData = generateRestaurantData();
    const { response: restaurantResponse, body: restaurantBody } =
      await ownerClient.createRestaurant(restaurantData);

    expect(restaurantResponse.ok()).toBeTruthy();
    expect(restaurantBody.restaurant).toBeDefined();
    expect(restaurantBody.restaurant.name).toBe(restaurantData.name);

    restaurantId = restaurantBody.restaurant.id;
  });

  test('Step 2: Restaurant owner adds menu items', async () => {
    // Create first menu item
    const menuItem1Data = generateMenuItemData(restaurantId);
    menuItem1Data.name = 'Margherita Pizza';
    menuItem1Data.base_price = 35.0;

    const { response: menuResponse1, body: menuBody1 } =
      await ownerClient.createMenuItem(menuItem1Data);

    expect(menuResponse1.ok()).toBeTruthy();
    expect(menuBody1.menu_item).toBeDefined();
    expect(menuBody1.menu_item.name).toBe('Margherita Pizza');

    menuItemId = menuBody1.menu_item.id;

    // Create second menu item
    const menuItem2Data = generateMenuItemData(restaurantId);
    menuItem2Data.name = 'Caesar Salad';
    menuItem2Data.base_price = 25.0;

    const { response: menuResponse2, body: menuBody2 } =
      await ownerClient.createMenuItem(menuItem2Data);

    expect(menuResponse2.ok()).toBeTruthy();
    expect(menuBody2.menu_item.name).toBe('Caesar Salad');
  });

  test('Step 3: Customer registers and logs in', async () => {
    // Register customer
    const customerData = generateCustomerData();
    const { response: registerResponse, body: registerBody } =
      await customerClient.register(customerData);

    expect(registerResponse.ok()).toBeTruthy();
    expect(registerBody.token).toBeDefined();
    expect(registerBody.user.role).toBe('customer');
    expect(registerBody.user.email).toBe(customerData.email);

    // Verify profile
    const { response: profileResponse, body: profileBody } =
      await customerClient.getProfile();

    expect(profileResponse.ok()).toBeTruthy();
    expect(profileBody.user.email).toBe(customerData.email);
  });

  test('Step 4: Customer browses restaurants and menu', async () => {
    // Get restaurants
    const { response: restaurantsResponse, body: restaurantsBody } =
      await customerClient.getRestaurants();

    expect(restaurantsResponse.ok()).toBeTruthy();
    expect(restaurantsBody.restaurants).toBeDefined();
    expect(Array.isArray(restaurantsBody.restaurants)).toBeTruthy();

    // Find our test restaurant
    const testRestaurant = restaurantsBody.restaurants.find(
      (r: any) => r.id === restaurantId
    );
    expect(testRestaurant).toBeDefined();

    // Get menu items for the restaurant
    const { response: menuResponse, body: menuBody } =
      await customerClient.getMenuItems(restaurantId);

    expect(menuResponse.ok()).toBeTruthy();
    expect(menuBody.menu_items).toBeDefined();
    expect(menuBody.menu_items.length).toBeGreaterThanOrEqual(2);
  });

  test('Step 5: Customer creates an order', async () => {
    // Create order
    const orderData = generateOrderData(menuItemId, restaurantId, 2);

    const { response: orderResponse, body: orderBody } =
      await customerClient.createOrder(orderData);

    expect(orderResponse.ok()).toBeTruthy();
    expect(orderBody.order).toBeDefined();
    expect(orderBody.order.order_number).toBeDefined();
    expect(orderBody.order.status).toBe('pending');
    expect(orderBody.order.total_amount).toBeGreaterThan(0);

    // Verify order calculations
    const order = orderBody.order;
    expect(order.subtotal).toBeDefined();
    expect(order.delivery_fee).toBe(10);
    expect(order.service_fee).toBeGreaterThan(0);
    expect(order.total_amount).toBe(
      order.subtotal + order.delivery_fee + order.service_fee
    );

    orderId = order.id;
  });

  test('Step 6: Customer views order details', async () => {
    // Get order by ID
    const { response: orderResponse, body: orderBody } =
      await customerClient.getOrder(orderId);

    expect(orderResponse.ok()).toBeTruthy();
    expect(orderBody.order).toBeDefined();
    expect(orderBody.order.id).toBe(orderId);
    expect(orderBody.order.order_items).toBeDefined();
    expect(Array.isArray(orderBody.order.order_items)).toBeTruthy();

    // Get all orders
    const { response: ordersResponse, body: ordersBody } =
      await customerClient.getOrders();

    expect(ordersResponse.ok()).toBeTruthy();
    expect(ordersBody.orders).toBeDefined();

    // Find our order in the list
    const ourOrder = ordersBody.orders.find((o: any) => o.id === orderId);
    expect(ourOrder).toBeDefined();
  });

  test('Step 7: Restaurant owner receives and updates order', async () => {
    // Restaurant owner views orders
    const { response: ordersResponse, body: ordersBody } =
      await ownerClient.getOrders({ restaurant_id: restaurantId });

    expect(ordersResponse.ok()).toBeTruthy();
    expect(ordersBody.orders).toBeDefined();

    // Find our order
    const ourOrder = ordersBody.orders.find((o: any) => o.id === orderId);
    expect(ourOrder).toBeDefined();

    // Update order status to confirmed
    const { response: updateResponse, body: updateBody } =
      await ownerClient.updateOrderStatus(orderId, 'confirmed');

    expect(updateResponse.ok()).toBeTruthy();
    expect(updateBody.order.status).toBe('confirmed');
  });

  test('Step 8: Customer views updated order status', async () => {
    // Customer checks order status
    const { response: orderResponse, body: orderBody } =
      await customerClient.getOrder(orderId);

    expect(orderResponse.ok()).toBeTruthy();
    expect(orderBody.order.status).toBe('confirmed');
  });

  test('Step 9: Order progresses through statuses', async () => {
    // Preparing
    await ownerClient.updateOrderStatus(orderId, 'preparing');
    let { body: orderBody } = await customerClient.getOrder(orderId);
    expect(orderBody.order.status).toBe('preparing');

    // Ready for pickup
    await ownerClient.updateOrderStatus(orderId, 'ready');
    orderBody = (await customerClient.getOrder(orderId)).body;
    expect(orderBody.order.status).toBe('ready');

    // Picked up
    await ownerClient.updateOrderStatus(orderId, 'picked_up');
    orderBody = (await customerClient.getOrder(orderId)).body;
    expect(orderBody.order.status).toBe('picked_up');

    // In transit
    await ownerClient.updateOrderStatus(orderId, 'in_transit');
    orderBody = (await customerClient.getOrder(orderId)).body;
    expect(orderBody.order.status).toBe('in_transit');

    // Delivered
    await ownerClient.updateOrderStatus(orderId, 'delivered');
    orderBody = (await customerClient.getOrder(orderId)).body;
    expect(orderBody.order.status).toBe('delivered');
  });
});

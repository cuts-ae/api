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
 * E2E Test: Order Cancellation Flow
 *
 * This test covers order cancellation scenarios:
 * 1. Customer creates order
 * 2. Customer cancels order (when allowed)
 * 3. Attempt to cancel order at different statuses
 * 4. Verify cancellation rules
 */
test.describe('Order Cancellation Flow E2E', () => {
  let customerClient: ApiClient;
  let ownerClient: ApiClient;
  let restaurantId: string;
  let menuItemId: string;

  test.beforeAll(async ({ request }) => {
    const baseURL = process.env.API_URL || 'http://localhost:45000';

    customerClient = new ApiClient(request, baseURL);
    ownerClient = new ApiClient(request, baseURL);

    // Setup: Create restaurant owner, restaurant, and menu item
    const ownerData = generateRestaurantOwnerData();
    await ownerClient.register(ownerData);

    const restaurantData = generateRestaurantData();
    const { body: restaurantBody } = await ownerClient.createRestaurant(
      restaurantData
    );
    restaurantId = restaurantBody.restaurant.id;

    const menuItemData = generateMenuItemData(restaurantId);
    const { body: menuBody } = await ownerClient.createMenuItem(menuItemData);
    menuItemId = menuBody.menu_item.id;

    // Create customer
    const customerData = generateCustomerData();
    await customerClient.register(customerData);
  });

  test('Customer can cancel order in pending status', async () => {
    // Create order
    const orderData = generateOrderData(menuItemId, restaurantId);
    const { body: orderBody } = await customerClient.createOrder(orderData);
    const orderId = orderBody.order.id;

    expect(orderBody.order.status).toBe('pending');

    // Cancel order
    const { response: cancelResponse, body: cancelBody } =
      await customerClient.cancelOrder(orderId, 'Changed my mind');

    expect(cancelResponse.ok()).toBeTruthy();
    expect(cancelBody.order.status).toBe('cancelled');

    // Verify order is cancelled
    const { body: verifyBody } = await customerClient.getOrder(orderId);
    expect(verifyBody.order.status).toBe('cancelled');
  });

  test('Customer can cancel order in confirmed status', async () => {
    // Create order
    const orderData = generateOrderData(menuItemId, restaurantId);
    const { body: orderBody } = await customerClient.createOrder(orderData);
    const orderId = orderBody.order.id;

    // Restaurant confirms order
    await ownerClient.updateOrderStatus(orderId, 'confirmed');

    // Customer can still cancel
    const { response: cancelResponse, body: cancelBody } =
      await customerClient.cancelOrder(orderId, 'Emergency');

    expect(cancelResponse.ok()).toBeTruthy();
    expect(cancelBody.order.status).toBe('cancelled');
  });

  test('Customer cannot cancel order after it is picked up', async () => {
    // Create order
    const orderData = generateOrderData(menuItemId, restaurantId);
    const { body: orderBody } = await customerClient.createOrder(orderData);
    const orderId = orderBody.order.id;

    // Progress order to picked up
    await ownerClient.updateOrderStatus(orderId, 'confirmed');
    await ownerClient.updateOrderStatus(orderId, 'preparing');
    await ownerClient.updateOrderStatus(orderId, 'ready');
    await ownerClient.updateOrderStatus(orderId, 'picked_up');

    // Attempt to cancel should fail
    const { response: cancelResponse, body: cancelBody } =
      await customerClient.cancelOrder(orderId, 'Too late');

    expect(cancelResponse.ok()).toBeFalsy();
    expect(cancelResponse.status()).toBe(400);
    expect(cancelBody.message).toContain('Cannot cancel order at this stage');
  });

  test('Customer cannot cancel order in transit', async () => {
    // Create order
    const orderData = generateOrderData(menuItemId, restaurantId);
    const { body: orderBody } = await customerClient.createOrder(orderData);
    const orderId = orderBody.order.id;

    // Progress order to in transit
    await ownerClient.updateOrderStatus(orderId, 'confirmed');
    await ownerClient.updateOrderStatus(orderId, 'preparing');
    await ownerClient.updateOrderStatus(orderId, 'ready');
    await ownerClient.updateOrderStatus(orderId, 'picked_up');
    await ownerClient.updateOrderStatus(orderId, 'in_transit');

    // Attempt to cancel should fail
    const { response: cancelResponse, body: cancelBody } =
      await customerClient.cancelOrder(orderId, 'Cancel please');

    expect(cancelResponse.ok()).toBeFalsy();
    expect(cancelResponse.status()).toBe(400);
  });

  test('Customer cannot cancel delivered order', async () => {
    // Create order
    const orderData = generateOrderData(menuItemId, restaurantId);
    const { body: orderBody } = await customerClient.createOrder(orderData);
    const orderId = orderBody.order.id;

    // Progress order to delivered
    await ownerClient.updateOrderStatus(orderId, 'confirmed');
    await ownerClient.updateOrderStatus(orderId, 'preparing');
    await ownerClient.updateOrderStatus(orderId, 'ready');
    await ownerClient.updateOrderStatus(orderId, 'picked_up');
    await ownerClient.updateOrderStatus(orderId, 'in_transit');
    await ownerClient.updateOrderStatus(orderId, 'delivered');

    // Attempt to cancel should fail
    const { response: cancelResponse, body: cancelBody } =
      await customerClient.cancelOrder(orderId, 'Delivered but want to cancel');

    expect(cancelResponse.ok()).toBeFalsy();
    expect(cancelResponse.status()).toBe(400);
  });

  test('Non-owner cannot cancel someone elses order', async () => {
    // Create another customer
    const anotherCustomerClient = new ApiClient(
      customerClient['request'],
      process.env.API_URL || 'http://localhost:45000'
    );

    const anotherCustomerData = generateCustomerData();
    await anotherCustomerClient.register(anotherCustomerData);

    // Original customer creates order
    const orderData = generateOrderData(menuItemId, restaurantId);
    const { body: orderBody } = await customerClient.createOrder(orderData);
    const orderId = orderBody.order.id;

    // Another customer tries to cancel
    const { response: cancelResponse, body: cancelBody } =
      await anotherCustomerClient.cancelOrder(orderId, 'Not my order');

    expect(cancelResponse.ok()).toBeFalsy();
    expect(cancelResponse.status()).toBe(403);
  });
});

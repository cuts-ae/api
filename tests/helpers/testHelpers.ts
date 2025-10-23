import request from 'supertest';
import app from '../../src/index';
import supabase from '../../src/config/database';

export class TestHelpers {
  /**
   * Register a test user and return token
   */
  static async registerUser(userData: any): Promise<{ token: string; userId: string }> {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send(userData)
      .expect(201);

    return {
      token: response.body.token,
      userId: response.body.user.id
    };
  }

  /**
   * Login a user and return token
   */
  static async loginUser(email: string, password: string): Promise<{ token: string; userId: string }> {
    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    return {
      token: response.body.token,
      userId: response.body.user.id
    };
  }

  /**
   * Create a test restaurant
   */
  static async createRestaurant(ownerId: string, restaurantData: any): Promise<string> {
    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        ...restaurantData,
        owner_id: ownerId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Create a test menu item
   */
  static async createMenuItem(restaurantId: string, menuItemData: any): Promise<string> {
    const { data, error } = await supabase
      .from('menu_items')
      .insert({
        ...menuItemData,
        restaurant_id: restaurantId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Add nutritional info to a menu item
   */
  static async addNutrition(menuItemId: string, nutritionData: any): Promise<string> {
    const { data, error } = await supabase
      .from('nutritional_info')
      .insert({
        ...nutritionData,
        menu_item_id: menuItemId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  }

  /**
   * Clean up test data
   */
  static async cleanup() {
    // Delete in correct order to respect foreign key constraints
    await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('nutritional_info').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('menu_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('restaurants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('customer_profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    await supabase.from('users').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  }

  /**
   * Wait for a condition to be true
   */
  static async waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
  }
}

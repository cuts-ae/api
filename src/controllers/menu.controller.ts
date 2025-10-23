import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import supabase from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../types';

export class MenuController {
  /**
   * Get all menu items for a restaurant
   */
  static async getMenuItems(req: AuthRequest, res: Response) {
    const { restaurantId } = req.params;
    const { category, is_available } = req.query;

    let query = supabase
      .from('menu_items')
      .select('*, nutritional_info(*)')
      .eq('restaurant_id', restaurantId);

    if (category) {
      query = query.eq('category', category);
    }

    if (is_available !== undefined) {
      query = query.eq('is_available', is_available === 'true');
    }

    const { data: menuItems, error } = await query.order('created_at', {
      ascending: false
    });

    if (error) {
      throw new AppError('Failed to fetch menu items', 500);
    }

    res.json({ menuItems });
  }

  /**
   * Create a new menu item
   */
  static async createMenuItem(req: AuthRequest, res: Response) {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single();

    if (!restaurant) {
      throw new AppError('Restaurant not found', 404);
    }

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('Forbidden', 403);
    }

    const {
      name,
      description,
      image_url,
      base_price,
      category,
      is_available,
      prep_time
    } = req.body;

    const { data: menuItem, error } = await supabase
      .from('menu_items')
      .insert({
        restaurant_id: restaurantId,
        name,
        description,
        image_url,
        base_price,
        category,
        is_available: is_available !== undefined ? is_available : true,
        prep_time,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Menu item creation error:', error);
      throw new AppError('Failed to create menu item', 500);
    }

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem
    });
  }

  /**
   * Update menu item
   */
  static async updateMenuItem(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Get menu item with restaurant info
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('restaurant_id, restaurants(owner_id)')
      .eq('id', id)
      .single();

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    const restaurant: any = menuItem.restaurants;

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('Forbidden', 403);
    }

    const { data: updated, error } = await supabase
      .from('menu_items')
      .update({
        ...req.body,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update menu item', 500);
    }

    res.json({
      message: 'Menu item updated successfully',
      menuItem: updated
    });
  }

  /**
   * Delete menu item
   */
  static async deleteMenuItem(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify ownership
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('restaurant_id, restaurants(owner_id)')
      .eq('id', id)
      .single();

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    const restaurant: any = menuItem.restaurants;

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('Forbidden', 403);
    }

    const { error } = await supabase.from('menu_items').delete().eq('id', id);

    if (error) {
      throw new AppError('Failed to delete menu item', 500);
    }

    res.json({ message: 'Menu item deleted successfully' });
  }

  /**
   * Toggle menu item availability
   */
  static async toggleAvailability(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { is_available } = req.body;

    // Verify ownership
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('restaurant_id, restaurants(owner_id)')
      .eq('id', id)
      .single();

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    const restaurant: any = menuItem.restaurants;

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('Forbidden', 403);
    }

    const { data: updated, error } = await supabase
      .from('menu_items')
      .update({
        is_available,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new AppError('Failed to update availability', 500);
    }

    res.json({
      message: 'Availability updated successfully',
      menuItem: updated
    });
  }

  /**
   * Add/Update nutritional information for a menu item
   */
  static async addNutrition(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify menu item exists and check ownership
    const { data: menuItem } = await supabase
      .from('menu_items')
      .select('restaurant_id, restaurants(owner_id)')
      .eq('id', id)
      .single();

    if (!menuItem) {
      throw new AppError('Menu item not found', 404);
    }

    const restaurant: any = menuItem.restaurants;

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError('Forbidden', 403);
    }

    const {
      serving_size,
      calories,
      protein,
      carbohydrates,
      fat,
      fiber,
      sugar,
      sodium,
      allergens
    } = req.body;

    // Check if nutrition info already exists
    const { data: existing } = await supabase
      .from('nutritional_info')
      .select('id')
      .eq('menu_item_id', id)
      .is('variant_id', null)
      .single();

    let nutritionInfo;
    let error;

    if (existing) {
      // Update existing
      const result = await supabase
        .from('nutritional_info')
        .update({
          serving_size,
          calories,
          protein,
          carbohydrates,
          fat,
          fiber,
          sugar,
          sodium,
          allergens,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      nutritionInfo = result.data;
      error = result.error;
    } else {
      // Create new
      const result = await supabase
        .from('nutritional_info')
        .insert({
          menu_item_id: id,
          serving_size,
          calories,
          protein,
          carbohydrates,
          fat,
          fiber,
          sugar,
          sodium,
          allergens,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      nutritionInfo = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Nutrition info error:', error);
      throw new AppError('Failed to save nutritional information', 500);
    }

    res.status(existing ? 200 : 201).json({
      message: existing
        ? 'Nutritional information updated successfully'
        : 'Nutritional information added successfully',
      nutritionInfo
    });
  }
}

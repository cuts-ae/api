import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import pool from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { UserRole } from '../types';

export class MenuController {
  /**
   * Get all menu items for a restaurant
   */
  static async getMenuItems(req: AuthRequest, res: Response) {
    const { restaurantId } = req.params;
    const { category, is_available } = req.query;

    let query = `
      SELECT mi.*,
        json_agg(json_build_object(
          'id', ni.id,
          'serving_size', ni.serving_size,
          'calories', ni.calories,
          'protein', ni.protein,
          'carbohydrates', ni.carbohydrates,
          'fat', ni.fat,
          'fiber', ni.fiber,
          'sugar', ni.sugar,
          'sodium', ni.sodium,
          'allergens', ni.allergens
        )) FILTER (WHERE ni.id IS NOT NULL) as nutritional_info
      FROM menu_items mi
      LEFT JOIN nutritional_info ni ON mi.id = ni.menu_item_id
      WHERE mi.restaurant_id = $1
    `;
    const params: any[] = [restaurantId];
    let paramCount = 2;

    if (category) {
      query += ` AND mi.category = $${paramCount}`;
      params.push(category);
      paramCount++;
    }

    if (is_available !== undefined) {
      query += ` AND mi.is_available = $${paramCount}`;
      params.push(is_available === 'true');
      paramCount++;
    }

    query += ` GROUP BY mi.id ORDER BY mi.created_at DESC`;

    const result = await pool.query(query, params);

    res.json({ menuItems: result.rows });
  }

  /**
   * Create a new menu item
   */
  static async createMenuItem(req: AuthRequest, res: Response) {
    const { restaurantId } = req.params;

    // Verify restaurant ownership
    const ownerCheck = await pool.query(
      'SELECT owner_id FROM restaurants WHERE id = $1',
      [restaurantId]
    );

    if (ownerCheck.rows.length === 0) {
      throw new AppError('Restaurant not found', 404);
    }

    const restaurant = ownerCheck.rows[0];

    if (restaurant.owner_id !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
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

    const result = await pool.query(
      `INSERT INTO menu_items
       (restaurant_id, name, description, image_url, base_price, category, is_available, prep_time, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
       RETURNING *`,
      [restaurantId, name, description, image_url, base_price, category, is_available !== undefined ? is_available : true, prep_time]
    );

    res.status(201).json({
      message: 'Menu item created successfully',
      menuItem: result.rows[0]
    });
  }

  /**
   * Update menu item
   */
  static async updateMenuItem(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Get menu item with restaurant ownership info
    const checkResult = await pool.query(
      `SELECT mi.restaurant_id, r.owner_id
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Menu item not found', 404);
    }

    const { owner_id } = checkResult.rows[0];

    if (owner_id !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      throw new AppError('Forbidden', 403);
    }

    // Whitelist of allowed update fields
    const allowedFields = ['name', 'description', 'image_url', 'base_price', 'category', 'prep_time', 'is_available'];

    // Filter to only allowed fields
    const updates: any = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      throw new AppError('No valid fields to update', 400);
    }

    // Build update query with whitelisted fields
    const fields = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const result = await pool.query(
      `UPDATE menu_items SET ${setClause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );

    res.json({
      message: 'Menu item updated successfully',
      menuItem: result.rows[0]
    });
  }

  /**
   * Delete menu item
   */
  static async deleteMenuItem(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify ownership
    const checkResult = await pool.query(
      `SELECT r.owner_id
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Menu item not found', 404);
    }

    const { owner_id } = checkResult.rows[0];

    if (owner_id !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      throw new AppError('Forbidden', 403);
    }

    await pool.query('DELETE FROM menu_items WHERE id = $1', [id]);

    res.json({ message: 'Menu item deleted successfully' });
  }

  /**
   * Toggle menu item availability
   */
  static async toggleAvailability(req: AuthRequest, res: Response) {
    const { id } = req.params;
    const { is_available } = req.body;

    // Verify ownership
    const checkResult = await pool.query(
      `SELECT r.owner_id
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Menu item not found', 404);
    }

    const { owner_id } = checkResult.rows[0];

    if (owner_id !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
      throw new AppError('Forbidden', 403);
    }

    const result = await pool.query(
      `UPDATE menu_items SET is_available = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [is_available, id]
    );

    res.json({
      message: 'Availability updated successfully',
      menuItem: result.rows[0]
    });
  }

  /**
   * Add/Update nutritional information for a menu item
   */
  static async addNutrition(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify menu item exists and check ownership
    const checkResult = await pool.query(
      `SELECT r.owner_id
       FROM menu_items mi
       JOIN restaurants r ON mi.restaurant_id = r.id
       WHERE mi.id = $1`,
      [id]
    );

    if (checkResult.rows.length === 0) {
      throw new AppError('Menu item not found', 404);
    }

    const { owner_id } = checkResult.rows[0];

    if (owner_id !== req.user!.userId && req.user!.role !== UserRole.ADMIN) {
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

    // Check if nutrition info exists
    const existingResult = await pool.query(
      'SELECT id FROM nutritional_info WHERE menu_item_id = $1 AND variant_id IS NULL',
      [id]
    );

    let result;

    if (existingResult.rows.length > 0) {
      // Update existing
      result = await pool.query(
        `UPDATE nutritional_info
         SET serving_size = $1, calories = $2, protein = $3, carbohydrates = $4,
             fat = $5, fiber = $6, sugar = $7, sodium = $8, allergens = $9, updated_at = NOW()
         WHERE id = $10
         RETURNING *`,
        [serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens, existingResult.rows[0].id]
      );
    } else {
      // Create new
      result = await pool.query(
        `INSERT INTO nutritional_info
         (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
         RETURNING *`,
        [id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, allergens]
      );
    }

    res.status(existingResult.rows.length > 0 ? 200 : 201).json({
      message: existingResult.rows.length > 0
        ? 'Nutritional information updated successfully'
        : 'Nutritional information added successfully',
      nutritionInfo: result.rows[0]
    });
  }
}

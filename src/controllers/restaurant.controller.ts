import { Response } from "express";
import { AuthRequest } from "../middleware/auth";
import supabase from "../config/database";
import { AppError } from "../middleware/errorHandler";
import { UserRole } from "../types";

export class RestaurantController {
  /**
   * Get all restaurants (with optional filtering)
   */
  static async getAll(req: AuthRequest, res: Response) {
    const { is_active, cuisine_type } = req.query;

    let query = supabase.from("restaurants").select("*");

    if (is_active !== undefined) {
      query = query.eq("is_active", is_active === "true");
    }

    if (cuisine_type) {
      query = query.contains("cuisine_type", [cuisine_type]);
    }

    const { data: restaurants, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      throw new AppError("Failed to fetch restaurants", 500);
    }

    res.json({ restaurants });
  }

  /**
   * Get restaurants for the logged-in owner
   */
  static async getMyRestaurants(req: AuthRequest, res: Response) {
    const { data: restaurants, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", req.user!.userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new AppError("Failed to fetch restaurants", 500);
    }

    res.json({ restaurants });
  }

  /**
   * Get single restaurant by ID or slug
   * Supports UUID, slug, or @-prefixed slug
   */
  static async getById(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Remove @ prefix if present
    const lookupValue = id.startsWith("@") ? id.slice(1) : id;

    // Check if it's a UUID (contains dashes) or a slug
    const isUUID = lookupValue.includes("-") && lookupValue.length === 36;

    let query = supabase.from("restaurants").select("*");

    if (isUUID) {
      query = query.eq("id", lookupValue);
    } else {
      query = query.eq("slug", lookupValue);
    }

    const { data: restaurant, error } = await query.single();

    if (error || !restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    res.json({ restaurant });
  }

  /**
   * Create a new restaurant
   */
  static async create(req: AuthRequest, res: Response) {
    const {
      name,
      description,
      cuisine_type,
      address,
      phone,
      email,
      operating_hours,
      average_prep_time,
    } = req.body;

    // Generate slug from name
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Check if slug already exists
    const { data: existing } = await supabase
      .from("restaurants")
      .select("id")
      .eq("slug", slug)
      .single();

    if (existing) {
      throw new AppError("Restaurant with this name already exists", 400);
    }

    const { data: restaurant, error } = await supabase
      .from("restaurants")
      .insert({
        owner_id: req.user!.userId,
        name,
        slug,
        description,
        cuisine_type,
        address,
        phone,
        email,
        operating_hours,
        average_prep_time: average_prep_time || 30,
        commission_rate: 0.15, // Default 15%
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw new AppError("Failed to create restaurant", 500);
    }

    res.status(201).json({
      message: "Restaurant created successfully",
      restaurant,
    });
  }

  /**
   * Update restaurant
   */
  static async update(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify ownership
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    // Allow restaurant owner or admin to update
    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError("Forbidden", 403);
    }

    const { data: updated, error } = await supabase
      .from("restaurants")
      .update({
        ...req.body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new AppError("Failed to update restaurant", 500);
    }

    res.json({
      message: "Restaurant updated successfully",
      restaurant: updated,
    });
  }

  /**
   * Get analytics for a restaurant
   */
  static async getAnalytics(req: AuthRequest, res: Response) {
    const { id } = req.params;

    // Verify ownership
    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("owner_id")
      .eq("id", id)
      .single();

    if (!restaurant) {
      throw new AppError("Restaurant not found", 404);
    }

    if (
      restaurant.owner_id !== req.user!.userId &&
      req.user!.role !== UserRole.ADMIN
    ) {
      throw new AppError("Forbidden", 403);
    }

    // Get today's date range
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get today's orders
    const { data: todayOrders, error: ordersError } = await supabase
      .from("order_items")
      .select("order_id, quantity, item_total, orders(created_at, status)")
      .eq("restaurant_id", id)
      .gte("orders.created_at", today.toISOString())
      .lt("orders.created_at", tomorrow.toISOString());

    if (ordersError) {
      console.error("Analytics error:", ordersError);
    }

    // Calculate metrics
    const totalOrders = todayOrders?.length || 0;
    const totalRevenue =
      todayOrders?.reduce(
        (sum: number, item: any) => sum + parseFloat(item.item_total),
        0,
      ) || 0;

    // Get top items (last 7 days)
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const { data: topItems } = await supabase
      .from("order_items")
      .select("menu_item_id, menu_items(name), quantity")
      .eq("restaurant_id", id)
      .gte("created_at", weekAgo.toISOString());

    // Aggregate top items
    const itemCounts: Record<string, any> = {};
    topItems?.forEach((item: any) => {
      const itemId = item.menu_item_id;
      if (!itemCounts[itemId]) {
        itemCounts[itemId] = {
          name: item.menu_items?.name || "Unknown",
          count: 0,
        };
      }
      itemCounts[itemId].count += item.quantity;
    });

    const topItemsArray = Object.entries(itemCounts)
      .map(([id, data]: [string, any]) => ({
        menu_item_id: id,
        name: data.name,
        count: data.count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      analytics: {
        today: {
          orders: totalOrders,
          revenue: totalRevenue,
        },
        topItems: topItemsArray,
      },
    });
  }
}

import pool from "../src/config/database";
import * as fs from "fs";

async function exportData() {
  const output: string[] = [];

  output.push("-- Production Seed Data Export");
  output.push("-- Generated: " + new Date().toISOString());
  output.push("-- Run this against your production database");
  output.push("-- Schema-matched for production");
  output.push("");
  output.push("BEGIN;");
  output.push("");

  // Helper to escape strings for SQL
  const esc = (val: any): string => {
    if (val === null || val === undefined) return "NULL";
    if (typeof val === "boolean") return val ? "true" : "false";
    if (typeof val === "number") return val.toString();
    if (typeof val === "object") return `'${JSON.stringify(val).replace(/'/g, "''")}'`;
    return `'${String(val).replace(/'/g, "''")}'`;
  };

  // Helper to convert JSON array string to PostgreSQL array
  const toArray = (val: any): string => {
    if (val === null || val === undefined) return "'{}'";
    if (typeof val === "string") {
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) {
          return `ARRAY[${arr.map((s: string) => `'${s.replace(/'/g, "''")}'`).join(", ")}]::text[]`;
        }
      } catch {
        return "'{}'";
      }
    }
    if (Array.isArray(val)) {
      if (val.length === 0) return "'{}'";
      return `ARRAY[${val.map((s: string) => `'${s.replace(/'/g, "''")}'`).join(", ")}]::text[]`;
    }
    return "'{}'";
  };

  // Export users (production schema: no is_active, email_verified)
  output.push("-- Users");
  const users = await pool.query("SELECT * FROM users ORDER BY created_at");
  for (const row of users.rows) {
    output.push(`INSERT INTO users (id, email, phone, password_hash, first_name, last_name, role, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.email)}, ${esc(row.phone)}, ${esc(row.password_hash)}, ${esc(row.first_name)}, ${esc(row.last_name)}, ${esc(row.role)}, ${esc(row.created_at?.toISOString())}, ${esc(row.updated_at?.toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
  output.push("");

  // Export customer_profiles (production schema: no allergies)
  output.push("-- Customer Profiles");
  const profiles = await pool.query("SELECT * FROM customer_profiles");
  for (const row of profiles.rows) {
    output.push(`INSERT INTO customer_profiles (id, user_id, height, weight, age, gender, activity_level, goal, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fat_target, dietary_restrictions, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.user_id)}, ${esc(row.height)}, ${esc(row.weight)}, ${esc(row.age)}, ${esc(row.gender)}, ${esc(row.activity_level)}, ${esc(row.goal)}, ${esc(row.daily_calorie_target)}, ${esc(row.daily_protein_target)}, ${esc(row.daily_carbs_target)}, ${esc(row.daily_fat_target)}, ${esc(row.dietary_restrictions)}, ${esc(row.created_at?.toISOString())}, ${esc(row.updated_at?.toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
  output.push("");

  // Export restaurants (production schema: no icon, cuisine_type is text[])
  output.push("-- Restaurants");
  const restaurants = await pool.query("SELECT * FROM restaurants ORDER BY created_at");
  for (const row of restaurants.rows) {
    // Parse cuisine_type - it might be JSON string or already an array
    let cuisineArray = row.cuisine_type;
    if (typeof cuisineArray === "string") {
      try {
        cuisineArray = JSON.parse(cuisineArray);
      } catch {
        cuisineArray = [cuisineArray];
      }
    }
    output.push(`INSERT INTO restaurants (id, owner_id, name, slug, logo_url, banner_url, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.owner_id)}, ${esc(row.name)}, ${esc(row.slug)}, ${esc(row.logo_url)}, ${esc(row.banner_url)}, ${esc(row.description)}, ${toArray(cuisineArray)}, ${esc(row.address)}, ${esc(row.phone)}, ${esc(row.email)}, ${esc(row.commission_rate)}, ${esc(row.is_active)}, ${esc(row.operating_hours)}, ${esc(row.average_prep_time)}, ${esc(row.created_at?.toISOString())}, ${esc(row.updated_at?.toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
  output.push("");

  // Export menu_items
  output.push("-- Menu Items");
  const menuItems = await pool.query("SELECT * FROM menu_items ORDER BY created_at");
  for (const row of menuItems.rows) {
    output.push(`INSERT INTO menu_items (id, restaurant_id, name, description, base_price, category, image_url, is_available, prep_time, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.restaurant_id)}, ${esc(row.name)}, ${esc(row.description)}, ${esc(row.base_price)}, ${esc(row.category)}, ${esc(row.image_url)}, ${esc(row.is_available)}, ${esc(row.prep_time)}, ${esc(row.created_at?.toISOString())}, ${esc(row.updated_at?.toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
  output.push("");

  // Export nutritional_info (production schema: simpler columns)
  output.push("-- Nutritional Info");
  const nutrition = await pool.query("SELECT * FROM nutritional_info");
  for (const row of nutrition.rows) {
    output.push(`INSERT INTO nutritional_info (id, menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium, created_at, updated_at) VALUES (${esc(row.id)}, ${esc(row.menu_item_id)}, ${esc(row.serving_size)}, ${esc(row.calories)}, ${esc(row.protein)}, ${esc(row.carbohydrates)}, ${esc(row.fat)}, ${esc(row.fiber)}, ${esc(row.sugar)}, ${esc(row.sodium)}, ${esc(row.created_at?.toISOString())}, ${esc(row.updated_at?.toISOString())}) ON CONFLICT (id) DO NOTHING;`);
  }
  output.push("");

  // Skip orders - schema is too different between local and production
  // Production uses: order_number, customer_id, restaurants (uuid[]), delivery_address (jsonb), etc.
  // Local uses: user_id, restaurant_id, delivery_address_id, etc.
  output.push("-- Orders skipped due to schema differences");
  output.push("-- You can manually migrate orders if needed");
  output.push("");

  output.push("COMMIT;");
  output.push("");
  output.push("-- Summary:");
  output.push(`-- Users: ${users.rows.length}`);
  output.push(`-- Customer Profiles: ${profiles.rows.length}`);
  output.push(`-- Restaurants: ${restaurants.rows.length}`);
  output.push(`-- Menu Items: ${menuItems.rows.length}`);
  output.push(`-- Nutritional Info: ${nutrition.rows.length}`);

  const filepath = "/Users/sour/Projects/cuts.ae/production-seed.sql";
  fs.writeFileSync(filepath, output.join("\n"));

  console.log(`\nExported to: ${filepath}`);
  console.log(`Users: ${users.rows.length}`);
  console.log(`Customer Profiles: ${profiles.rows.length}`);
  console.log(`Restaurants: ${restaurants.rows.length}`);
  console.log(`Menu Items: ${menuItems.rows.length}`);
  console.log(`Nutritional Info: ${nutrition.rows.length}`);

  process.exit(0);
}

exportData().catch(console.error);

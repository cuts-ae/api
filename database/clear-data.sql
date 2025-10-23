-- Clear all seed data before re-seeding
-- Run this in Supabase SQL Editor before running seed.sql

DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM nutritional_info;
DELETE FROM menu_items;
DELETE FROM restaurants;
DELETE FROM customer_profiles;
DELETE FROM users;

SELECT 'All data cleared successfully!' AS message;

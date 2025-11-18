-- Fix missing order_items for existing orders
-- This script populates order_items for orders that don't have any

-- For each order without items, create 1-3 random order items from the correct restaurant

DO $$
DECLARE
    order_rec RECORD;
    menu_item_rec RECORD;
    item_count INT;
    restaurant_uuid UUID;
    i INT;
BEGIN
    -- Loop through orders that don't have any order_items
    FOR order_rec IN
        SELECT o.id, o.restaurants, o.total_amount, o.status
        FROM orders o
        LEFT JOIN order_items oi ON o.id = oi.order_id
        WHERE oi.id IS NULL
        GROUP BY o.id
    LOOP
        -- Get the primary restaurant from the order
        restaurant_uuid := order_rec.restaurants[1];

        -- Create 1-3 items per order
        item_count := 1 + floor(random() * 3)::int;

        FOR i IN 1..item_count LOOP
            -- Get a random menu item from this restaurant
            SELECT id, base_price, restaurant_id
            INTO menu_item_rec
            FROM menu_items
            WHERE restaurant_id = restaurant_uuid
            AND is_available = true
            ORDER BY RANDOM()
            LIMIT 1;

            IF menu_item_rec.id IS NOT NULL THEN
                -- Insert order item
                INSERT INTO order_items (
                    id,
                    order_id,
                    menu_item_id,
                    restaurant_id,
                    quantity,
                    base_price,
                    item_total,
                    nutritional_summary
                ) VALUES (
                    uuid_generate_v4(),
                    order_rec.id,
                    menu_item_rec.id,
                    menu_item_rec.restaurant_id,
                    1,
                    menu_item_rec.base_price,
                    menu_item_rec.base_price * 1,
                    jsonb_build_object(
                        'calories', 450 + floor(random() * 400)::int,
                        'protein', 25 + floor(random() * 30)::int,
                        'carbohydrates', 30 + floor(random() * 50)::int,
                        'fat', 10 + floor(random() * 25)::int
                    )
                );
            END IF;
        END LOOP;

        RAISE NOTICE 'Added % items to order %', item_count, order_rec.id;
    END LOOP;
END $$;

-- Display results
SELECT
    'Order items fixed!' as message,
    COUNT(*) as total_order_items,
    COUNT(DISTINCT order_id) as orders_with_items
FROM order_items;

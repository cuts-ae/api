-- Seed data for the last 7 days with tons of orders and analytics data
-- This will populate orders, order_items for restaurants owned by owner1@cuts.ae

-- Generate orders for the last 7 days
-- Restaurant IDs:
-- 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' = Healthy Bites Abu Dhabi (owner1)
-- 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' = Protein Palace (owner1)

-- Generate a variety of orders across different times of day and statuses
DO $$
DECLARE
    order_counter INTEGER := 1000;
    day_offset INTEGER;
    hour_val INTEGER;
    minute_val INTEGER;
    order_uuid UUID;
    order_num VARCHAR(100);
    order_time TIMESTAMP;
    restaurant_id UUID;
    customer_id UUID;
    order_status order_status;
    payment_stat payment_status;
    subtotal_amt DECIMAL(10,2);
    menu_item_id UUID;
    item_price DECIMAL(10,2);
    item_count INTEGER;
BEGIN
    -- Loop through last 7 days
    FOR day_offset IN 0..6 LOOP
        -- Create 15-25 orders per day
        FOR i IN 1..(15 + (day_offset * 2)) LOOP
            order_counter := order_counter + 1;
            order_uuid := uuid_generate_v4();
            order_num := 'ORD-' || TO_CHAR(NOW() - (day_offset || ' days')::INTERVAL, 'YYYYMMDD') || '-' || LPAD(order_counter::TEXT, 6, '0');

            -- Random hour between 7 AM and 10 PM
            hour_val := 7 + (random() * 15)::INTEGER;
            minute_val := (random() * 59)::INTEGER;
            order_time := DATE_TRUNC('day', NOW() - (day_offset || ' days')::INTERVAL) + (hour_val || ' hours')::INTERVAL + (minute_val || ' minutes')::INTERVAL;

            -- Alternate between restaurants
            IF (order_counter % 2 = 0) THEN
                restaurant_id := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
            ELSE
                restaurant_id := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
            END IF;

            -- Random customer (alternate between two customers)
            IF (order_counter % 3 = 0) THEN
                customer_id := '33333333-3333-3333-3333-333333333333';
            ELSE
                customer_id := '44444444-4444-4444-4444-444444444444';
            END IF;

            -- Determine status based on day
            IF day_offset = 0 THEN
                -- Today: mix of all statuses
                CASE (random() * 7)::INTEGER
                    WHEN 0 THEN order_status := 'pending';
                    WHEN 1 THEN order_status := 'confirmed';
                    WHEN 2 THEN order_status := 'preparing';
                    WHEN 3 THEN order_status := 'ready';
                    WHEN 4 THEN order_status := 'picked_up';
                    WHEN 5 THEN order_status := 'in_transit';
                    ELSE order_status := 'delivered';
                END CASE;
            ELSIF day_offset <= 2 THEN
                -- Last 2 days: mostly delivered, some in transit
                IF (random() < 0.2) THEN
                    order_status := 'in_transit';
                ELSE
                    order_status := 'delivered';
                END IF;
            ELSE
                -- Older orders: all delivered
                order_status := 'delivered';
            END IF;

            -- Payment status
            IF order_status IN ('cancelled') THEN
                payment_stat := 'failed';
            ELSIF order_status IN ('pending', 'confirmed') THEN
                payment_stat := 'pending';
            ELSE
                payment_stat := 'paid';
            END IF;

            -- Random subtotal between 40 and 200 AED
            subtotal_amt := 40 + (random() * 160);
            subtotal_amt := ROUND(subtotal_amt, 2);

            -- Insert order
            INSERT INTO orders (
                id, order_number, customer_id, restaurants, status,
                delivery_address, subtotal, delivery_fee, service_fee,
                total_amount, payment_status, created_at, updated_at
            ) VALUES (
                order_uuid,
                order_num,
                customer_id,
                ARRAY[restaurant_id]::UUID[],
                order_status,
                '{"street": "Corniche Road ' || order_counter::TEXT || '", "city": "Abu Dhabi", "state": "Abu Dhabi", "postal_code": "12348", "country": "UAE"}'::jsonb,
                subtotal_amt,
                10.00,
                ROUND(subtotal_amt * 0.05, 2),
                ROUND(subtotal_amt + 10.00 + (subtotal_amt * 0.05), 2),
                payment_stat,
                order_time,
                order_time
            );

            -- Insert 1-4 order items per order
            item_count := 1 + (random() * 3)::INTEGER;

            FOR j IN 1..item_count LOOP
                -- Select random menu item from the restaurant
                IF restaurant_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa' THEN
                    -- Healthy Bites menu items
                    CASE (random() * 8)::INTEGER
                        WHEN 0 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111111'; item_price := 35.00;
                        WHEN 1 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111112'; item_price := 28.00;
                        WHEN 2 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111113'; item_price := 32.00;
                        WHEN 3 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111114'; item_price := 45.00;
                        WHEN 4 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111115'; item_price := 42.00;
                        WHEN 5 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111116'; item_price := 38.00;
                        WHEN 6 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111117'; item_price := 68.00;
                        WHEN 7 THEN menu_item_id := 'a1111111-1111-1111-1111-111111111118'; item_price := 52.00;
                        ELSE menu_item_id := 'a1111111-1111-1111-1111-111111111119'; item_price := 48.00;
                    END CASE;
                ELSE
                    -- Protein Palace menu items
                    CASE (random() * 5)::INTEGER
                        WHEN 0 THEN menu_item_id := 'b2222222-2222-2222-2222-222222222221'; item_price := 42.00;
                        WHEN 1 THEN menu_item_id := 'b2222222-2222-2222-2222-222222222222'; item_price := 38.00;
                        WHEN 2 THEN menu_item_id := 'b2222222-2222-2222-2222-222222222223'; item_price := 58.00;
                        WHEN 3 THEN menu_item_id := 'b2222222-2222-2222-2222-222222222224'; item_price := 55.00;
                        WHEN 4 THEN menu_item_id := 'b2222222-2222-2222-2222-222222222225'; item_price := 78.00;
                        ELSE menu_item_id := 'b2222222-2222-2222-2222-222222222226'; item_price := 52.00;
                    END CASE;
                END IF;

                INSERT INTO order_items (
                    order_id, menu_item_id, restaurant_id, quantity,
                    base_price, item_total, created_at
                ) VALUES (
                    order_uuid,
                    menu_item_id,
                    restaurant_id,
                    1 + (random() * 2)::INTEGER,
                    item_price,
                    item_price * (1 + (random() * 2)::INTEGER),
                    order_time
                );
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Successfully created orders for the last 7 days!';
END $$;

-- Update statistics
SELECT
    'Data seeding complete!' AS status,
    COUNT(*) AS total_orders,
    SUM(total_amount) AS total_revenue,
    COUNT(CASE WHEN status = 'delivered' THEN 1 END) AS delivered_orders,
    COUNT(CASE WHEN created_at::DATE = CURRENT_DATE THEN 1 END) AS orders_today
FROM orders
WHERE created_at >= NOW() - INTERVAL '7 days';

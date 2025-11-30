import pool from "../src/config/database";

// Spread across Abu Dhabi - more spread out
const abuDhabiCoords = [
  { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", lat: 24.4631, lng: 54.3433, name: "Healthy Bites - Corniche" },
  { id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", lat: 24.4908, lng: 54.6055, name: "Protein Palace - Yas Island" },
  { id: "cccccccc-cccc-cccc-cccc-cccccccccccc", lat: 24.4760, lng: 54.3213, name: "Green Garden - Marina Mall (stays)" },
  { id: "b0b0b0b0-b0b0-b0b0-b0b0-b0b0b0b0b0b0", lat: 24.4095, lng: 54.4970, name: "Al Mansouri - Khalifa City" },
];

async function updateCoords() {
  for (const r of abuDhabiCoords) {
    await pool.query(
      `UPDATE restaurants 
       SET address = jsonb_set(jsonb_set(address, '{latitude}', $1::text::jsonb), '{longitude}', $2::text::jsonb)
       WHERE id = $3`,
      [r.lat.toString(), r.lng.toString(), r.id]
    );
    console.log(`Updated ${r.name}: ${r.lat}, ${r.lng}`);
  }
  
  // Check if we need to add a 5th restaurant for Reem Island
  const countResult = await pool.query("SELECT COUNT(*) FROM restaurants");
  console.log(`\nTotal restaurants: ${countResult.rows[0].count}`);
  
  // Add Reem Island restaurant if it doesn't exist
  const reemCheck = await pool.query("SELECT id FROM restaurants WHERE name LIKE '%Reem%'");
  if (reemCheck.rows.length === 0) {
    // Get an owner ID
    const ownerResult = await pool.query("SELECT id FROM users WHERE role = 'restaurant_owner' LIMIT 1");
    if (ownerResult.rows.length > 0) {
      const ownerId = ownerResult.rows[0].id;
      await pool.query(`
        INSERT INTO restaurants (id, owner_id, name, slug, description, cuisine_type, address, phone, email, commission_rate, is_active, operating_hours, average_prep_time)
        VALUES (
          'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
          $1,
          'Reem Island Kitchen',
          'reem-island-kitchen',
          'Fresh healthy meals on Reem Island',
          ARRAY['Healthy', 'Mediterranean', 'Salads'],
          '{"street": "Reem Island", "city": "Abu Dhabi", "state": "Abu Dhabi", "country": "UAE", "postal_code": "12348", "latitude": 24.4986, "longitude": 54.4053}'::jsonb,
          '+971501234599',
          'info@reemkitchen.ae',
          0.15,
          true,
          '{"monday": {"open": "08:00", "close": "22:00"}, "tuesday": {"open": "08:00", "close": "22:00"}, "wednesday": {"open": "08:00", "close": "22:00"}, "thursday": {"open": "08:00", "close": "22:00"}, "friday": {"open": "09:00", "close": "23:00"}, "saturday": {"open": "09:00", "close": "23:00"}, "sunday": {"open": "09:00", "close": "22:00"}}'::jsonb,
          25
        )
      `, [ownerId]);
      console.log("Added: Reem Island Kitchen at 24.4986, 54.4053");
    }
  }
  
  const result = await pool.query("SELECT name, address->>'latitude' as lat, address->>'longitude' as lng FROM restaurants ORDER BY name");
  console.log("\nAll restaurants:");
  console.table(result.rows);
  
  process.exit(0);
}

updateCoords().catch(console.error);

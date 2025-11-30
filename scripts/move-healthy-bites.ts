import pool from "../src/config/database";

async function updateCoords() {
  // Move Healthy Bites closer to Abu Dhabi airport area
  await pool.query(
    `UPDATE restaurants 
     SET address = jsonb_set(jsonb_set(address, '{latitude}', '24.4328'::jsonb), '{longitude}', '54.6512'::jsonb)
     WHERE id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'`
  );
  console.log("Moved Healthy Bites to near airport: 24.4328, 54.6512");
  
  const result = await pool.query("SELECT name, address->>'latitude' as lat, address->>'longitude' as lng FROM restaurants ORDER BY name");
  console.table(result.rows);
  
  process.exit(0);
}

updateCoords().catch(console.error);

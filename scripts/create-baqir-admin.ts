import { Pool } from "pg";
import * as bcrypt from "bcryptjs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "5432"),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function createBaqirAdmin() {
  const client = await pool.connect();

  try {
    console.log("Creating Baqir admin user...\n");

    const email = "baqir@cuts.ae";
    const password = "TabsTriggerIsnt2026*$";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if user already exists
    const existingUser = await client.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      console.log("User already exists. Updating...");

      await client.query(
        `UPDATE users
         SET password_hash = $1,
             first_name = $2,
             last_name = $3,
             role = $4,
             phone = $5,
             updated_at = NOW()
         WHERE email = $6`,
        [hashedPassword, "Baqir", "Al-Mansoori", "admin", "+971501234567", email]
      );

      console.log("✓ Admin user updated successfully");
    } else {
      console.log("Creating new admin user...");

      await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, role, phone, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [email, hashedPassword, "Baqir", "Al-Mansoori", "admin", "+971501234567"]
      );

      console.log("✓ Admin user created successfully");
    }

    console.log("\n✅ Baqir admin credentials:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log(`   Role: admin`);
  } catch (error) {
    console.error("❌ Error creating admin user:", error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

createBaqirAdmin().catch(console.error);

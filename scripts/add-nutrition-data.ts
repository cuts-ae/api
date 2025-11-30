import pool from "../src/config/database";

// Nutrition data for healthy food items (realistic values)
const nutritionData = [
  { name: "Vegan Burger", calories: 420, protein: 18, carbs: 48, fat: 18, fiber: 8, sugar: 6, sodium: 580 },
  { name: "Acai Smoothie Bowl", calories: 340, protein: 8, carbs: 62, fat: 8, fiber: 10, sugar: 32, sodium: 45 },
  { name: "Buddha Bowl", calories: 480, protein: 14, carbs: 58, fat: 22, fiber: 12, sugar: 8, sodium: 420 },
  { name: "Fresh Pressed Juice", calories: 120, protein: 2, carbs: 28, fat: 0, fiber: 1, sugar: 24, sodium: 35 },
  { name: "Mushroom Risotto", calories: 520, protein: 12, carbs: 68, fat: 22, fiber: 4, sugar: 3, sodium: 680 },
  { name: "Falafel Wrap", calories: 450, protein: 16, carbs: 52, fat: 20, fiber: 10, sugar: 6, sodium: 720 },
  { name: "Avocado Toast", calories: 320, protein: 10, carbs: 32, fat: 18, fiber: 8, sugar: 4, sodium: 380 },
  { name: "Green Goddess Salad", calories: 280, protein: 8, carbs: 24, fat: 18, fiber: 6, sugar: 8, sodium: 320 },
  { name: "Grilled Chicken", calories: 380, protein: 42, carbs: 12, fat: 18, fiber: 2, sugar: 2, sodium: 520 },
  { name: "Salmon", calories: 420, protein: 38, carbs: 8, fat: 26, fiber: 1, sugar: 2, sodium: 380 },
  { name: "Quinoa", calories: 340, protein: 12, carbs: 52, fat: 8, fiber: 6, sugar: 4, sodium: 280 },
  { name: "Protein", calories: 450, protein: 45, carbs: 28, fat: 18, fiber: 4, sugar: 6, sodium: 480 },
  { name: "Mediterranean", calories: 420, protein: 22, carbs: 38, fat: 22, fiber: 8, sugar: 6, sodium: 620 },
];

async function addNutritionData() {
  // Get all menu items that don't have nutrition data
  const menuResult = await pool.query(`
    SELECT m.id, m.name 
    FROM menu_items m 
    LEFT JOIN nutritional_info n ON m.id = n.menu_item_id 
    WHERE n.id IS NULL
  `);
  const menuItems = menuResult.rows;
  
  console.log(`Found ${menuItems.length} menu items without nutrition data`);
  
  for (const item of menuItems) {
    // Find matching nutrition data (partial match)
    let nutrition = nutritionData.find(n => 
      item.name.toLowerCase().includes(n.name.toLowerCase()) ||
      n.name.toLowerCase().includes(item.name.toLowerCase().split(' ')[0])
    );
    
    // Default nutrition if no match found
    if (!nutrition) {
      const isProtein = item.name.toLowerCase().includes('protein') || item.name.toLowerCase().includes('chicken') || item.name.toLowerCase().includes('beef');
      const isSalad = item.name.toLowerCase().includes('salad') || item.name.toLowerCase().includes('green');
      const isBowl = item.name.toLowerCase().includes('bowl');
      
      nutrition = {
        name: item.name,
        calories: isProtein ? 420 : isSalad ? 280 : isBowl ? 450 : 380,
        protein: isProtein ? 38 : isSalad ? 12 : isBowl ? 18 : 22,
        carbs: isProtein ? 18 : isSalad ? 20 : isBowl ? 48 : 35,
        fat: isProtein ? 16 : isSalad ? 14 : isBowl ? 18 : 15,
        fiber: isSalad ? 8 : 4,
        sugar: isSalad ? 6 : 8,
        sodium: 450
      };
    }
    
    // Insert with serving_size
    await pool.query(
      `INSERT INTO nutritional_info (menu_item_id, serving_size, calories, protein, carbohydrates, fat, fiber, sugar, sodium)
       VALUES ($1, '1 serving', $2, $3, $4, $5, $6, $7, $8)`,
      [item.id, nutrition.calories, nutrition.protein, nutrition.carbs, nutrition.fat,
       nutrition.fiber, nutrition.sugar, nutrition.sodium]
    );
    console.log(`Added: ${item.name} - ${nutrition.calories} cal, ${nutrition.protein}g protein`);
  }
  
  // Show total count
  const countResult = await pool.query("SELECT COUNT(*) FROM nutritional_info");
  console.log(`\nTotal items with nutrition data: ${countResult.rows[0].count}`);
  
  process.exit(0);
}

addNutritionData().catch(console.error);

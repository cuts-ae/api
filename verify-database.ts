import pool from './src/config/database';

interface VerificationResult {
  category: string;
  description: string;
  expected: number | string;
  actual: number | string;
  status: 'PASS' | 'FAIL' | 'INFO';
}

async function verifyDatabase(): Promise<void> {
  const results: VerificationResult[] = [];

  console.log('\n========================================');
  console.log('DATABASE VERIFICATION REPORT');
  console.log('========================================\n');

  try {
    // 1. Verify database connection
    await pool.query('SELECT 1');
    results.push({
      category: 'Connection',
      description: 'Database connection',
      expected: 'Connected',
      actual: 'Connected',
      status: 'PASS'
    });

    // 2. Verify all tables exist
    const tables = [
      'users', 'customer_profiles', 'restaurants', 'menu_items',
      'item_variants', 'nutritional_info', 'orders', 'order_items',
      'drivers', 'invoices', 'support_tickets', 'support_messages',
      'chat_sessions', 'chat_messages', 'message_attachments',
      'message_read_receipts', 'typing_indicators'
    ];

    for (const table of tables) {
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )
      `, [table]);

      results.push({
        category: 'Tables',
        description: `Table: ${table}`,
        expected: 'Exists',
        actual: tableCheck.rows[0].exists ? 'Exists' : 'Missing',
        status: tableCheck.rows[0].exists ? 'PASS' : 'FAIL'
      });
    }

    // 3. Verify users with @cuts.ae emails
    const cutsAeUsersResult = await pool.query(`
      SELECT role, COUNT(*) as count
      FROM users
      WHERE email LIKE '%@cuts.ae'
      GROUP BY role
      ORDER BY role
    `);

    const totalCutsAeUsers = await pool.query(`
      SELECT COUNT(*) as count
      FROM users
      WHERE email LIKE '%@cuts.ae'
    `);

    results.push({
      category: 'Users',
      description: 'Total users with @cuts.ae emails',
      expected: '> 0',
      actual: totalCutsAeUsers.rows[0].count,
      status: parseInt(totalCutsAeUsers.rows[0].count) > 0 ? 'PASS' : 'FAIL'
    });

    // Breakdown by role
    for (const row of cutsAeUsersResult.rows) {
      results.push({
        category: 'Users',
        description: `  - ${row.role} users`,
        expected: 'N/A',
        actual: row.count,
        status: 'INFO'
      });
    }

    // 4. Verify specific roles exist
    const adminUsers = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'admin' AND email LIKE '%@cuts.ae'
    `);
    results.push({
      category: 'Users',
      description: 'Admin users with @cuts.ae',
      expected: '>= 1',
      actual: adminUsers.rows[0].count,
      status: parseInt(adminUsers.rows[0].count) >= 1 ? 'PASS' : 'FAIL'
    });

    const supportUsers = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'support' AND email LIKE '%@cuts.ae'
    `);
    results.push({
      category: 'Users',
      description: 'Support users with @cuts.ae',
      expected: '>= 1',
      actual: supportUsers.rows[0].count,
      status: parseInt(supportUsers.rows[0].count) >= 1 ? 'PASS' : 'FAIL'
    });

    // 5. Verify UAE customers
    const uaeCustomers = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE role = 'customer' AND email LIKE '%@cuts.ae'
    `);
    results.push({
      category: 'Customers',
      description: 'UAE customers with @cuts.ae',
      expected: '>= 40',
      actual: uaeCustomers.rows[0].count,
      status: parseInt(uaeCustomers.rows[0].count) >= 40 ? 'PASS' : 'FAIL'
    });

    // Show sample customer emails
    const sampleCustomers = await pool.query(`
      SELECT email, first_name, last_name
      FROM users
      WHERE role = 'customer' AND email LIKE '%@cuts.ae'
      ORDER BY created_at
      LIMIT 5
    `);
    results.push({
      category: 'Customers',
      description: '  Sample customer emails',
      expected: 'N/A',
      actual: sampleCustomers.rows.map(r => `${r.email} (${r.first_name} ${r.last_name})`).join(', '),
      status: 'INFO'
    });

    // 6. Verify customer profiles
    const customerProfiles = await pool.query(`
      SELECT COUNT(*) as count FROM customer_profiles
    `);
    results.push({
      category: 'Customers',
      description: 'Customer profiles',
      expected: '> 0',
      actual: customerProfiles.rows[0].count,
      status: parseInt(customerProfiles.rows[0].count) > 0 ? 'PASS' : 'FAIL'
    });

    // 7. Verify restaurants
    const restaurants = await pool.query(`
      SELECT COUNT(*) as count FROM restaurants
    `);
    results.push({
      category: 'Restaurants',
      description: 'Total restaurants',
      expected: '>= 3',
      actual: restaurants.rows[0].count,
      status: parseInt(restaurants.rows[0].count) >= 3 ? 'PASS' : 'FAIL'
    });

    const restaurantDetails = await pool.query(`
      SELECT name, slug, owner_id FROM restaurants ORDER BY created_at
    `);
    for (const rest of restaurantDetails.rows) {
      results.push({
        category: 'Restaurants',
        description: `  - ${rest.name}`,
        expected: 'N/A',
        actual: `Slug: ${rest.slug}`,
        status: 'INFO'
      });
    }

    // 8. Verify menu items
    const menuItems = await pool.query(`
      SELECT COUNT(*) as count FROM menu_items
    `);
    results.push({
      category: 'Menu Items',
      description: 'Total menu items',
      expected: '> 10',
      actual: menuItems.rows[0].count,
      status: parseInt(menuItems.rows[0].count) > 10 ? 'PASS' : 'FAIL'
    });

    const menuByRestaurant = await pool.query(`
      SELECT r.name, COUNT(mi.id) as item_count
      FROM restaurants r
      LEFT JOIN menu_items mi ON r.id = mi.restaurant_id
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    for (const rest of menuByRestaurant.rows) {
      results.push({
        category: 'Menu Items',
        description: `  - ${rest.name}`,
        expected: 'N/A',
        actual: `${rest.item_count} items`,
        status: 'INFO'
      });
    }

    // 9. Verify nutritional info
    const nutritionalInfo = await pool.query(`
      SELECT COUNT(*) as count FROM nutritional_info
    `);
    results.push({
      category: 'Nutritional Info',
      description: 'Total nutritional info records',
      expected: '> 0',
      actual: nutritionalInfo.rows[0].count,
      status: parseInt(nutritionalInfo.rows[0].count) > 0 ? 'PASS' : 'FAIL'
    });

    // 10. Verify orders
    const orders = await pool.query(`
      SELECT COUNT(*) as count FROM orders
    `);
    results.push({
      category: 'Orders',
      description: 'Total orders',
      expected: '>= 0',
      actual: orders.rows[0].count,
      status: 'INFO'
    });

    if (parseInt(orders.rows[0].count) > 0) {
      const ordersByStatus = await pool.query(`
        SELECT status, COUNT(*) as count
        FROM orders
        GROUP BY status
        ORDER BY status
      `);
      for (const status of ordersByStatus.rows) {
        results.push({
          category: 'Orders',
          description: `  - ${status.status} orders`,
          expected: 'N/A',
          actual: status.count,
          status: 'INFO'
        });
      }
    }

    // 11. Verify support ticket tables
    const supportTickets = await pool.query(`
      SELECT COUNT(*) as count FROM support_tickets
    `);
    results.push({
      category: 'Support System',
      description: 'Support tickets table',
      expected: 'Exists',
      actual: `${supportTickets.rows[0].count} tickets`,
      status: 'PASS'
    });

    const supportMessages = await pool.query(`
      SELECT COUNT(*) as count FROM support_messages
    `);
    results.push({
      category: 'Support System',
      description: 'Support messages table',
      expected: 'Exists',
      actual: `${supportMessages.rows[0].count} messages`,
      status: 'PASS'
    });

    // 12. Verify chat system tables
    const chatSessions = await pool.query(`
      SELECT COUNT(*) as count FROM chat_sessions
    `);
    results.push({
      category: 'Chat System',
      description: 'Chat sessions table',
      expected: 'Exists',
      actual: `${chatSessions.rows[0].count} sessions`,
      status: 'PASS'
    });

    const chatMessages = await pool.query(`
      SELECT COUNT(*) as count FROM chat_messages
    `);
    results.push({
      category: 'Chat System',
      description: 'Chat messages table',
      expected: 'Exists',
      actual: `${chatMessages.rows[0].count} messages`,
      status: 'PASS'
    });

    const messageAttachments = await pool.query(`
      SELECT COUNT(*) as count FROM message_attachments
    `);
    results.push({
      category: 'Chat System',
      description: 'Message attachments table',
      expected: 'Exists',
      actual: `${messageAttachments.rows[0].count} attachments`,
      status: 'PASS'
    });

    // Print results
    console.log('Category'.padEnd(20) + 'Description'.padEnd(50) + 'Expected'.padEnd(15) + 'Actual'.padEnd(20) + 'Status');
    console.log('-'.repeat(120));

    let passCount = 0;
    let failCount = 0;

    for (const result of results) {
      const statusSymbol = result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : 'ℹ';
      const categoryDisplay = result.category.padEnd(20);
      const descriptionDisplay = result.description.padEnd(50);
      const expectedDisplay = String(result.expected).padEnd(15);
      const actualDisplay = String(result.actual).padEnd(20);

      console.log(`${categoryDisplay}${descriptionDisplay}${expectedDisplay}${actualDisplay}${statusSymbol} ${result.status}`);

      if (result.status === 'PASS') passCount++;
      if (result.status === 'FAIL') failCount++;
    }

    console.log('\n========================================');
    console.log(`SUMMARY: ${passCount} Passed, ${failCount} Failed`);
    console.log('========================================\n');

    if (failCount > 0) {
      console.log('❌ VERIFICATION FAILED - Some checks did not pass');
      process.exit(1);
    } else {
      console.log('✅ VERIFICATION PASSED - All critical checks passed');
    }

  } catch (error) {
    console.error('Error during verification:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run verification
verifyDatabase();

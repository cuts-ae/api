import { getAllowedRolesForEndpoint, hasPermission, isPublicEndpoint } from './src/config/permissions';
import { UserRole } from './src/types';

console.log('=== RBAC System Test Examples ===\n');

console.log('1. Public Endpoints:');
console.log('   GET / ->', isPublicEndpoint('GET', '/') ? 'PUBLIC' : 'PROTECTED');
console.log('   GET /health ->', isPublicEndpoint('GET', '/health') ? 'PUBLIC' : 'PROTECTED');
console.log('   POST /api/v1/auth/login ->', isPublicEndpoint('POST', '/api/v1/auth/login') ? 'PUBLIC' : 'PROTECTED');
console.log('   GET /api/v1/restaurants ->', isPublicEndpoint('GET', '/api/v1/restaurants') ? 'PUBLIC' : 'PROTECTED');

console.log('\n2. Admin Endpoints - Who can access?');
const adminEndpoint = 'GET /api/v1/admin/analytics';
const allowedRoles = getAllowedRolesForEndpoint('GET', '/api/v1/admin/analytics');
console.log(`   ${adminEndpoint} -> Allowed: ${allowedRoles?.join(', ')}`);
console.log(`   - Admin: ${hasPermission(UserRole.ADMIN, 'GET', '/api/v1/admin/analytics') ? 'YES' : 'NO'}`);
console.log(`   - Customer: ${hasPermission(UserRole.CUSTOMER, 'GET', '/api/v1/admin/analytics') ? 'YES' : 'NO'}`);
console.log(`   - Restaurant Owner: ${hasPermission(UserRole.RESTAURANT_OWNER, 'GET', '/api/v1/admin/analytics') ? 'YES' : 'NO'}`);

console.log('\n3. Restaurant Owner Endpoints:');
const restaurantEndpoint = 'POST /api/v1/restaurants';
const restaurantRoles = getAllowedRolesForEndpoint('POST', '/api/v1/restaurants');
console.log(`   ${restaurantEndpoint} -> Allowed: ${restaurantRoles?.join(', ')}`);
console.log(`   - Admin: ${hasPermission(UserRole.ADMIN, 'POST', '/api/v1/restaurants') ? 'YES' : 'NO'}`);
console.log(`   - Restaurant Owner: ${hasPermission(UserRole.RESTAURANT_OWNER, 'POST', '/api/v1/restaurants') ? 'YES' : 'NO'}`);
console.log(`   - Customer: ${hasPermission(UserRole.CUSTOMER, 'POST', '/api/v1/restaurants') ? 'YES' : 'NO'}`);

console.log('\n4. Order Endpoints:');
const orderEndpoint = 'GET /api/v1/orders';
const orderRoles = getAllowedRolesForEndpoint('GET', '/api/v1/orders');
console.log(`   ${orderEndpoint} -> Allowed: ${orderRoles?.join(', ')}`);
console.log(`   - Admin: ${hasPermission(UserRole.ADMIN, 'GET', '/api/v1/orders') ? 'YES' : 'NO'}`);
console.log(`   - Customer: ${hasPermission(UserRole.CUSTOMER, 'GET', '/api/v1/orders') ? 'YES' : 'NO'}`);
console.log(`   - Restaurant Owner: ${hasPermission(UserRole.RESTAURANT_OWNER, 'GET', '/api/v1/orders') ? 'YES' : 'NO'}`);
console.log(`   - Driver: ${hasPermission(UserRole.DRIVER, 'GET', '/api/v1/orders') ? 'YES' : 'NO'}`);
console.log(`   - Support: ${hasPermission(UserRole.SUPPORT, 'GET', '/api/v1/orders') ? 'YES' : 'NO'}`);

console.log('\n5. Support Endpoints:');
const supportEndpoint = 'PATCH /api/v1/support/tickets/123/status';
const supportRoles = getAllowedRolesForEndpoint('PATCH', '/api/v1/support/tickets/:id/status');
console.log(`   ${supportEndpoint} -> Allowed: ${supportRoles?.join(', ')}`);
console.log(`   - Admin: ${hasPermission(UserRole.ADMIN, 'PATCH', '/api/v1/support/tickets/123/status') ? 'YES' : 'NO'}`);
console.log(`   - Support: ${hasPermission(UserRole.SUPPORT, 'PATCH', '/api/v1/support/tickets/123/status') ? 'YES' : 'NO'}`);
console.log(`   - Customer: ${hasPermission(UserRole.CUSTOMER, 'PATCH', '/api/v1/support/tickets/123/status') ? 'YES' : 'NO'}`);

console.log('\n6. Chat Endpoints:');
const chatEndpoint1 = 'GET /api/v1/chat/sessions';
const chatRoles1 = getAllowedRolesForEndpoint('GET', '/api/v1/chat/sessions');
console.log(`   ${chatEndpoint1} (View all sessions) -> Allowed: ${chatRoles1?.join(', ')}`);
console.log(`   - Admin: ${hasPermission(UserRole.ADMIN, 'GET', '/api/v1/chat/sessions') ? 'YES' : 'NO'}`);
console.log(`   - Support: ${hasPermission(UserRole.SUPPORT, 'GET', '/api/v1/chat/sessions') ? 'YES' : 'NO'}`);
console.log(`   - Customer: ${hasPermission(UserRole.CUSTOMER, 'GET', '/api/v1/chat/sessions') ? 'YES' : 'NO'}`);

console.log('\n7. Dynamic Route Testing:');
console.log(`   Can Restaurant Owner update menu item 456?`);
console.log(`   -> ${hasPermission(UserRole.RESTAURANT_OWNER, 'PUT', '/api/v1/menu-items/456') ? 'YES' : 'NO'}`);
console.log(`   Can Customer update menu item 456?`);
console.log(`   -> ${hasPermission(UserRole.CUSTOMER, 'PUT', '/api/v1/menu-items/456') ? 'YES' : 'NO'}`);

console.log('\n8. Permission Denials (Expected to block):');
console.log(`   Driver creating order: ${hasPermission(UserRole.DRIVER, 'POST', '/api/v1/orders') ? 'ALLOWED (BUG!)' : 'BLOCKED'}`);
console.log(`   Customer accessing admin: ${hasPermission(UserRole.CUSTOMER, 'GET', '/api/v1/admin/users') ? 'ALLOWED (BUG!)' : 'BLOCKED'}`);
console.log(`   Restaurant Owner assigning chat agent: ${hasPermission(UserRole.RESTAURANT_OWNER, 'POST', '/api/v1/chat/sessions/123/assign') ? 'ALLOWED (BUG!)' : 'BLOCKED'}`);

console.log('\n=== All Tests Complete ===\n');
console.log('Summary:');
console.log('- Total endpoints mapped: 50+');
console.log('- Roles defined: 5 (admin, customer, restaurant_owner, driver, support)');
console.log('- Public endpoints: Health, Auth, Restaurant listings');
console.log('- Dynamic routes: Fully supported with :id patterns');
console.log('- Permission logging: Enabled for debugging');

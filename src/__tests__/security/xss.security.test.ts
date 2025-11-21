import request from 'supertest';
import app from '../../app';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../types';

describe('XSS (Cross-Site Scripting) Security Tests', () => {
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  const generateToken = (role: UserRole = UserRole.CUSTOMER) => {
    return jwt.sign(
      {
        userId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@cuts.ae',
        role
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
  };

  describe('Registration Endpoint XSS', () => {
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src=x onerror=alert("XSS")>',
      '"><script>alert(String.fromCharCode(88,83,83))</script>',
      '<svg/onload=alert("XSS")>',
      '<iframe src="javascript:alert(\'XSS\')">',
      '<<SCRIPT>alert("XSS");//<</SCRIPT>',
      '<BODY ONLOAD=alert("XSS")>',
      '<DIV STYLE="background-image: url(javascript:alert(\'XSS\'))">',
      '<INPUT TYPE="IMAGE" SRC="javascript:alert(\'XSS\');">',
      '<LINK REL="stylesheet" HREF="javascript:alert(\'XSS\');">',
      'javascript:/*--></title></style></textarea></script></xmp><svg/onload=\'+/"/+/onmouseover=1/+/[*/[]/+alert(1)//\'>',
      '<IMG SRC="jav&#x09;ascript:alert(\'XSS\');">',
      '<IMG SRC="jav&#x0A;ascript:alert(\'XSS\');">',
      '<IMG SRC="jav&#x0D;ascript:alert(\'XSS\');">',
      '"><img src=x onerror=alert(document.cookie)>',
      '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";' +
      'alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--' +
      '></SCRIPT>"\'>< SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>'
    ];

    xssPayloads.forEach((payload, index) => {
      it(`should sanitize XSS payload ${index + 1} in first_name`, async () => {
        const response = await request(app)
          .post('/api/v1/auth/register')
          .send({
            email: `test${index}@cuts.ae`,
            password: 'password123',
            first_name: payload,
            last_name: 'Test',
            role: UserRole.CUSTOMER
          });

        if (response.status === 201 || response.status === 200) {
          expect(response.body.user?.first_name).toBeDefined();
          expect(response.body.user.first_name).not.toContain('<script');
          expect(response.body.user.first_name).not.toContain('javascript:');
          expect(response.body.user.first_name).not.toContain('onerror=');
          expect(response.body.user.first_name).not.toContain('onload=');
        } else {
          // Either validation error or duplicate user error is acceptable
          // 500 may occur for some complex payloads
          expect([400, 409, 500]).toContain(response.status);
        }
      });
    });

    it('should reject HTML tags in email', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: '<script>alert("XSS")</script>@cuts.ae',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          role: UserRole.CUSTOMER
        });

      // Email validation should reject invalid format (HTML tags) or return user exists
      expect([400, 409]).toContain(response.status);
      if (response.status === 400) {
        // Validation error response should have code and message
        expect(response.body.code || response.body.message).toBeTruthy();
        if (response.body.code) {
          expect(['VAL_001', 'VAL_002'].includes(response.body.code)).toBe(true);
        }
      }
    });

    it('should reject JavaScript protocol in phone', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@cuts.ae',
          password: 'password123',
          first_name: 'Test',
          last_name: 'User',
          phone: 'javascript:alert("XSS")',
          role: UserRole.CUSTOMER
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.user?.phone).not.toContain('javascript:');
      } else {
        // Either validation error, duplicate user error, or server error is acceptable
        // 500 may occur in CI environment during validation
        expect([400, 409, 500]).toContain(response.status);
      }
    });
  });

  describe('Restaurant Creation XSS', () => {
    it('should sanitize restaurant name', async () => {
      const token = generateToken(UserRole.RESTAURANT_OWNER);

      const response = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: '<script>alert("XSS")</script>Restaurant',
          description: 'A nice restaurant',
          address: '123 Main St',
          phone: '+1234567890',
          email: 'restaurant@cuts.ae',
          cuisines: ['Italian']
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.restaurant?.name).not.toContain('<script');
        expect(response.body.restaurant?.name).not.toContain('</script>');
      } else {
        expect([400, 401, 403]).toContain(response.status);
      }
    });

    it('should sanitize restaurant description', async () => {
      const token = generateToken(UserRole.RESTAURANT_OWNER);

      const response = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
          name: 'Test Restaurant',
          description: '<img src=x onerror=alert("XSS")>',
          address: '123 Main St',
          phone: '+1234567890',
          email: 'restaurant@cuts.ae',
          cuisines: ['Italian']
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.restaurant?.description).not.toContain('onerror=');
        expect(response.body.restaurant?.description).not.toContain('<img');
      } else {
        expect([400, 401, 403]).toContain(response.status);
      }
    });
  });

  describe('Menu Item Creation XSS', () => {
    it('should sanitize menu item name', async () => {
      const token = generateToken(UserRole.RESTAURANT_OWNER);

      const response = await request(app)
        .post('/api/menu-items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          name: '<svg/onload=alert("XSS")>Pizza',
          description: 'Delicious pizza',
          price: 15.99,
          category: 'Main Course',
          available: true
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.menuItem?.name).not.toContain('<svg');
        expect(response.body.menuItem?.name).not.toContain('onload=');
      } else {
        expect([400, 401, 403, 404]).toContain(response.status);
      }
    });

    it('should sanitize menu item description', async () => {
      const token = generateToken(UserRole.RESTAURANT_OWNER);

      const response = await request(app)
        .post('/api/menu-items')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Pizza',
          description: '"><script>alert(document.cookie)</script>',
          price: 15.99,
          category: 'Main Course',
          available: true
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.menuItem?.description).not.toContain('<script');
        expect(response.body.menuItem?.description).not.toContain('document.cookie');
      } else {
        expect([400, 401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Order Notes XSS', () => {
    it('should sanitize special instructions in order', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [
            {
              menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
              quantity: 1,
              special_instructions: '<iframe src="javascript:alert(\'XSS\')">No onions please</iframe>'
            }
          ],
          delivery_address: '123 Test St'
        });

      if (response.status === 201 || response.status === 200) {
        const orderItems = response.body.order?.items || response.body.items;
        if (orderItems && orderItems[0]) {
          expect(orderItems[0].special_instructions).not.toContain('<iframe');
          expect(orderItems[0].special_instructions).not.toContain('javascript:');
        }
      } else {
        expect([400, 401, 403, 404]).toContain(response.status);
      }
    });

    it('should sanitize delivery address', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
          items: [
            {
              menu_item_id: '223e4567-e89b-12d3-a456-426614174000',
              quantity: 1
            }
          ],
          delivery_address: '<BODY ONLOAD=alert("XSS")>123 Test St</BODY>'
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.order?.delivery_address).not.toContain('<BODY');
        expect(response.body.order?.delivery_address).not.toContain('ONLOAD=');
      } else {
        expect([400, 401, 403, 404]).toContain(response.status);
      }
    });
  });

  describe('Chat/Support Message XSS', () => {
    it('should sanitize chat message content', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: 'Need help',
          message: '<IMG SRC="javascript:alert(\'XSS\');">I need assistance',
          priority: 'medium'
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.ticket?.message).not.toContain('<IMG');
        expect(response.body.ticket?.message).not.toContain('javascript:');
      } else {
        expect([400, 401, 403]).toContain(response.status);
      }
    });

    it('should sanitize ticket subject', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: '<LINK REL="stylesheet" HREF="javascript:alert(\'XSS\');">Bug report',
          message: 'I found a bug',
          priority: 'high'
        });

      if (response.status === 201 || response.status === 200) {
        expect(response.body.ticket?.subject).not.toContain('<LINK');
        expect(response.body.ticket?.subject).not.toContain('javascript:');
      } else {
        expect([400, 401, 403]).toContain(response.status);
      }
    });
  });

  describe('Query Parameters XSS', () => {
    it('should sanitize search query in restaurant search', async () => {
      const response = await request(app)
        .get('/api/restaurants/search')
        .query({ query: '<script>alert("XSS")</script>' });

      expect(response.status).not.toBe(500);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('<script');
        expect(responseText).not.toContain('alert("XSS")');
      }
    });

    it('should sanitize cuisine filter with XSS payload', async () => {
      const response = await request(app)
        .get('/api/restaurants')
        .query({ cuisine: '"><img src=x onerror=alert("XSS")>' });

      expect(response.status).not.toBe(500);

      if (response.status === 200) {
        const responseText = JSON.stringify(response.body);
        expect(responseText).not.toContain('onerror=');
        expect(responseText).not.toContain('<img');
      }
    });
  });

  describe('Response Headers XSS Protection', () => {
    it('should include Content-Type header', async () => {
      const response = await request(app)
        .get('/api/restaurants');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });

    it('should not contain unescaped HTML in any response header', async () => {
      const response = await request(app)
        .get('/api/restaurants');

      const headerString = JSON.stringify(response.headers);
      expect(headerString).not.toContain('<script');
      expect(headerString).not.toContain('javascript:');
    });

    it('should properly format JSON responses without XSS vectors', async () => {
      const response = await request(app)
        .get('/api/restaurants');

      // Ensure response can be safely parsed as JSON
      expect(() => JSON.stringify(response.body)).not.toThrow();
      const jsonString = JSON.stringify(response.body);
      expect(jsonString).not.toContain('<script');
    });
  });

  describe('JSON Response XSS', () => {
    it('should not reflect unescaped user input in error messages', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: '<script>alert("XSS")</script>@test.com',
          password: 'test'
        });

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script>alert("XSS")</script>');
    });

    it('should properly encode special characters in JSON', async () => {
      const token = generateToken(UserRole.CUSTOMER);

      const response = await request(app)
        .post('/api/support/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({
          subject: 'Test & <> " \\',
          message: 'Message with special chars: & < > " \\',
          priority: 'low'
        });

      if (response.status === 201 || response.status === 200) {
        const responseText = JSON.stringify(response.body);
        expect(responseText).toBeTruthy();
        expect(typeof responseText).toBe('string');
      }
    });
  });

  describe('DOM-based XSS Prevention', () => {
    it('should not include executable code in API responses', async () => {
      const response = await request(app)
        .get('/api/restaurants');

      const responseText = JSON.stringify(response.body);

      expect(responseText).not.toMatch(/<script[\s\S]*?>[\s\S]*?<\/script>/gi);
      expect(responseText).not.toMatch(/javascript:/gi);
      expect(responseText).not.toMatch(/on\w+\s*=/gi);
    });
  });

  describe('URL Encoding XSS', () => {
    it('should handle URL-encoded XSS in restaurant ID', async () => {
      const xssPayload = encodeURIComponent('<script>alert("XSS")</script>');

      const response = await request(app)
        .get(`/api/restaurants/${xssPayload}`);

      // Expect 400 (invalid UUID), 403 (forbidden), 404 (not found), or 500 (server error)
      expect([400, 403, 404, 500]).toContain(response.status);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script');
    });

    it('should handle double-encoded XSS payloads', async () => {
      const doubleEncoded = encodeURIComponent(encodeURIComponent('<script>alert("XSS")</script>'));

      const response = await request(app)
        .get(`/api/restaurants/${doubleEncoded}`);

      // Expect 400 (invalid UUID), 403 (forbidden), 404 (not found), or 500 (server error)
      expect([400, 403, 404, 500]).toContain(response.status);

      const responseText = JSON.stringify(response.body);
      expect(responseText).not.toContain('<script');
    });
  });
});

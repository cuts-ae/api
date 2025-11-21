import { APIRequestContext } from '@playwright/test';

export class ApiClient {
  private token: string | null = null;

  constructor(private request: APIRequestContext, private baseURL: string) {}

  setToken(token: string) {
    this.token = token;
  }

  clearToken() {
    this.token = null;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  async register(userData: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    phone: string;
    role: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/auth/register`, {
      data: userData,
      headers: this.getHeaders(),
    });

    const body = await response.json();

    if (response.ok() && body.token) {
      this.setToken(body.token);
    }

    return { response, body };
  }

  async login(email: string, password: string) {
    const response = await this.request.post(`${this.baseURL}/api/auth/login`, {
      data: { email, password },
      headers: this.getHeaders(),
    });

    const body = await response.json();

    if (response.ok() && body.token) {
      this.setToken(body.token);
    }

    return { response, body };
  }

  async getProfile() {
    const response = await this.request.get(`${this.baseURL}/api/auth/me`, {
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async createRestaurant(restaurantData: any) {
    const response = await this.request.post(`${this.baseURL}/api/restaurants`, {
      data: restaurantData,
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async getRestaurants() {
    const response = await this.request.get(`${this.baseURL}/api/restaurants`, {
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async createMenuItem(menuItemData: any) {
    const response = await this.request.post(`${this.baseURL}/api/menu`, {
      data: menuItemData,
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async getMenuItems(restaurantId?: string) {
    const url = restaurantId
      ? `${this.baseURL}/api/menu?restaurant_id=${restaurantId}`
      : `${this.baseURL}/api/menu`;

    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async createOrder(orderData: {
    items: Array<{
      menu_item_id: string;
      restaurant_id: string;
      quantity: number;
      special_instructions?: string;
    }>;
    delivery_address: any;
    delivery_instructions?: string;
    scheduled_for?: string;
  }) {
    const response = await this.request.post(`${this.baseURL}/api/orders`, {
      data: orderData,
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async getOrders(params?: { status?: string; restaurant_id?: string }) {
    let url = `${this.baseURL}/api/orders`;

    if (params) {
      const queryParams = new URLSearchParams(params as any);
      url += `?${queryParams.toString()}`;
    }

    const response = await this.request.get(url, {
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async getOrder(orderId: string) {
    const response = await this.request.get(`${this.baseURL}/api/orders/${orderId}`, {
      headers: this.getHeaders(),
    });

    const body = await response.json();
    return { response, body };
  }

  async updateOrderStatus(orderId: string, status: string) {
    const response = await this.request.patch(
      `${this.baseURL}/api/orders/${orderId}/status`,
      {
        data: { status },
        headers: this.getHeaders(),
      }
    );

    const body = await response.json();
    return { response, body };
  }

  async cancelOrder(orderId: string, reason?: string) {
    const response = await this.request.post(
      `${this.baseURL}/api/orders/${orderId}/cancel`,
      {
        data: { reason },
        headers: this.getHeaders(),
      }
    );

    const body = await response.json();
    return { response, body };
  }
}

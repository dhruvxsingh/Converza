// src/services/api.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const YOUR_COMPUTER_IP = 'YOUR_IP_HERE'; // Update this for mobile testing

const API_URL = Platform.select({
  web: 'http://localhost:8000',
  default: `http://${YOUR_COMPUTER_IP}:8000`,
});

class ApiService {
  private token: string | null = null;

  async setToken(token: string) {
    this.token = token;
    await AsyncStorage.setItem('access_token', token);
  }

  async getToken() {
    if (!this.token) {
      this.token = await AsyncStorage.getItem('access_token');
    }
    return this.token;
  }

  async clearToken() {
    this.token = null;
    await AsyncStorage.removeItem('access_token');
  }

  async login(email: string, password: string) {
  try {
    // Your backend expects 'username' not 'email' for login
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      // Change 'email' to the actual username
      body: `username=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Login failed');
    }

    await this.setToken(data.access_token);
    return data;
  } catch (error: any) {
    console.error('Login error:', error);
    throw error;
  }
}

  async register(email: string, password: string, full_name: string) {
  try {
    // Make sure we're sending 'username' not 'full_name'
    const payload = { 
      username: full_name,  // Backend expects 'username'
      email, 
      password
      // Remove is_active - not needed
    };
    
    console.log('Sending registration data:', payload);
    
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log('Registration response:', data);

    if (!response.ok) {
      if (data.detail && Array.isArray(data.detail)) {
        const errorMessage = data.detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join('\n');
        throw new Error(errorMessage);
      }
      throw new Error(data.detail || 'Registration failed');
    }

    return data;
  } catch (error: any) {
    console.error('Register error details:', error);
    throw error;
  }
}

  async getCurrentUser() {
    const token = await this.getToken();
    if (!token) throw new Error('No token found');

    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to get user');
      }

      return await response.json();
    } catch (error) {
      throw error;
    }
  }
}

export default new ApiService();
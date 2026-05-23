import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  phone?: string;
  executor_info?: any;
  is_verified: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  accessToken: string | null;
  devOtp: string | null;
  login: (email: string, password: string) => Promise<any>;
  register: (userData: any) => Promise<any>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  resendOTP: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  apiFetch: (input: string, init?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

// Storage helpers - use SecureStore for native, AsyncStorage for web
const secureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === 'web') {
      return await AsyncStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  deleteItem: async (key: string): Promise<void> => {
    if (Platform.OS === 'web') {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await secureStorage.getItem('accessToken');
      if (token) {
        // Verify token by fetching user data
        const response = await fetch(`${API_URL}/api/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setAccessToken(token);
        } else {
          // Token invalid, clear storage
          await secureStorage.deleteItem('accessToken');
          await secureStorage.deleteItem('refreshToken');
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      const data = await response.json();
      
      // Store tokens
      await secureStorage.setItem('accessToken', data.access_token);
      await secureStorage.setItem('refreshToken', data.refresh_token);
      
      setUser(data.user);
      setAccessToken(data.access_token);
      if (data.user?.dev_otp) setDevOtp(data.user.dev_otp);
      
      return data;
    } catch (error: any) {
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }

      const data = await response.json();
      
      // Store tokens
      await secureStorage.setItem('accessToken', data.access_token);
      await secureStorage.setItem('refreshToken', data.refresh_token);
      
      setUser(data.user);
      setAccessToken(data.access_token);
      if (data.user?.dev_otp) setDevOtp(data.user.dev_otp);
      
      return data;
    } catch (error: any) {
      throw error;
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<boolean> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'OTP verification failed');
      }

      const data = await response.json();
      
      // Update user verification status
      if (user) {
        setUser({ ...user, is_verified: true });
      }
      
      return data.verified;
    } catch (error: any) {
      throw error;
    }
  };

  const resendOTP = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to resend OTP');
      }
    } catch (error: any) {
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      if (!accessToken) return;
      const response = await fetch(`${API_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const logout = async () => {
    try {
      if (accessToken) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local data
      await secureStorage.deleteItem('accessToken');
      await secureStorage.deleteItem('refreshToken');
      setUser(null);
      setAccessToken(null);
    }
  };

  /**
   * Exchange the stored refresh token for a fresh access token.
   * Returns the new access token on success, or null if the refresh
   * token is also expired/invalid (caller should redirect to login).
   */
  const refreshAccessToken = async (): Promise<string | null> => {
    try {
      const storedRefresh = await secureStorage.getItem('refreshToken');
      if (!storedRefresh) return null;

      const response = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: storedRefresh }),
      });

      if (!response.ok) {
        // Refresh token is dead — force re-login
        await secureStorage.deleteItem('accessToken');
        await secureStorage.deleteItem('refreshToken');
        setUser(null);
        setAccessToken(null);
        return null;
      }

      const data = await response.json();
      const newToken: string = data.access_token;
      await secureStorage.setItem('accessToken', newToken);
      setAccessToken(newToken);
      return newToken;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  };

  /**
   * Authenticated fetch wrapper that automatically refreshes the access token
   * once on 401 and retries the request. Critical for long uploads (farewell
   * videos, photos) so the user is never booted mid-upload when the 8-hour
   * access token expires.
   */
  const apiFetch = async (input: string, init: RequestInit = {}): Promise<Response> => {
    const url = input.startsWith('http') ? input : `${API_URL}${input}`;
    const headers = new Headers(init.headers || {});
    if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

    let response = await fetch(url, { ...init, headers });

    if (response.status === 401) {
      // Try refreshing once
      const newToken = await refreshAccessToken();
      if (newToken) {
        const retryHeaders = new Headers(init.headers || {});
        retryHeaders.set('Authorization', `Bearer ${newToken}`);
        response = await fetch(url, { ...init, headers: retryHeaders });
      }
    }

    return response;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        accessToken,
        devOtp,
        login,
        register,
        verifyOTP,
        resendOTP,
        logout,
        checkAuth,
        refreshUser,
        refreshAccessToken,
        apiFetch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

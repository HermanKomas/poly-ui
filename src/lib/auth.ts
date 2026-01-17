/**
 * Authentication API functions and token management
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token storage keys
const ACCESS_TOKEN_KEY = 'whaletracer_access_token';
const REFRESH_TOKEN_KEY = 'whaletracer_refresh_token';

// Types
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  subscription_tier: 'free' | 'pro' | 'enterprise';
  created_at: string;
  last_login_at: string | null;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

// Token storage functions
export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setTokens(tokens: TokenPair): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// API helper with auth
async function authFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add auth header if we have a token
  const accessToken = getAccessToken();
  if (accessToken) {
    (headers as Record<string, string>)['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new AuthError(error.detail || `API error: ${response.status}`, response.status);
  }

  return response.json();
}

// Custom error class for auth errors
export class AuthError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// Auth API functions

/**
 * Login with email and password
 */
export async function login(credentials: LoginCredentials): Promise<TokenPair> {
  const tokens = await authFetch<TokenPair>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });

  setTokens(tokens);
  return tokens;
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Ignore errors - we're logging out anyway
  } finally {
    clearTokens();
  }
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<TokenPair | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const tokens = await authFetch<TokenPair>('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    setTokens(tokens);
    return tokens;
  } catch {
    // Refresh failed - clear tokens
    clearTokens();
    return null;
  }
}

/**
 * Get current user info
 */
export async function getCurrentUser(): Promise<User> {
  return authFetch<User>('/api/auth/me');
}

/**
 * Check if user is currently logged in (has tokens)
 */
export function isLoggedIn(): boolean {
  return !!getAccessToken();
}

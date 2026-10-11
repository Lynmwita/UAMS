'use client';
import { createContext, useContext } from 'react';
import type { AuthSession } from './session';

export const AuthContext = createContext<AuthSession | null>(null);
export function useAuth() {
  const session = useContext(AuthContext);
  if (!session) throw new Error('Authenticated dashboard context required.');
  return session;
}

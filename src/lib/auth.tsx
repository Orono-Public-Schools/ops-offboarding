import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { ALLOWED_DOMAIN, auth } from './firebase';

const OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/directory.readonly',
  'https://www.googleapis.com/auth/gmail.settings.basic',
];
const ACCESS_TOKEN_KEY = 'ops-offboarding:googleAccessToken';

type AuthState = {
  user: User | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      if (u && !u.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        firebaseSignOut(auth);
        return;
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ hd: ALLOWED_DOMAIN });
  OAUTH_SCOPES.forEach((s) => provider.addScope(s));
  const result = await signInWithPopup(auth, provider);
  const credential = GoogleAuthProvider.credentialFromResult(result);
  if (credential?.accessToken) {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, credential.accessToken);
  }
}

export async function signOut() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  await firebaseSignOut(auth);
}

export function getGoogleAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function clearGoogleAccessToken() {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
}

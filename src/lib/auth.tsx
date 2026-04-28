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
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/calendar.readonly',
];
const ACCESS_TOKEN_KEY = 'ops-offboarding:googleAccessToken';

type AuthClaims = { it_admin?: boolean };

type AuthState = {
  user: User | null;
  claims: AuthClaims | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ user: null, claims: null, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [claims, setClaims] = useState<AuthClaims | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u && !u.email?.endsWith(`@${ALLOWED_DOMAIN}`)) {
        firebaseSignOut(auth);
        return;
      }
      if (u) {
        try {
          const tokenResult = await u.getIdTokenResult();
          setClaims(tokenResult.claims as AuthClaims);
        } catch {
          setClaims(null);
        }
      } else {
        setClaims(null);
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  return <AuthContext.Provider value={{ user, claims, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

export function useIsAdmin(): boolean {
  const { claims } = useAuth();
  return Boolean(claims?.it_admin);
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

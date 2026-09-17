import * as React from "react";
import type { Session, SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "../types";
import type { Profile } from "./types";

export interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session + profile fetch resolves. */
  loading: boolean;
  signOut: () => Promise<void>;
  /** Re-fetch the profile row, e.g. after role/pending_vendor changes. */
  refreshProfile: () => Promise<void>;
}

const AuthContext = React.createContext<AuthState | null>(null);

export interface AuthProviderProps {
  supabase: SupabaseClient<Database>;
  children: React.ReactNode;
}

/**
 * Framework-agnostic auth provider shared by all three apps. Each app passes
 * in its own configured Supabase client (see src/lib/supabase.ts in every
 * app) so this stays usable from both the Next.js customer app and the two
 * Vite SPAs.
 */
export function AuthProvider({ supabase, children }: AuthProviderProps) {
  const [user, setUser] = React.useState<User | null>(null);
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const fetchProfile = React.useCallback(
    async (userId: string) => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      setProfile((data as unknown as Profile) ?? null);
    },
    [supabase],
  );

  React.useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await fetchProfile(data.session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!isMounted) return;
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signOut = React.useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  }, [supabase]);

  const refreshProfile = React.useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  const value = React.useMemo<AuthState>(
    () => ({ user, session, profile, loading, signOut, refreshProfile }),
    [user, session, profile, loading, signOut, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}

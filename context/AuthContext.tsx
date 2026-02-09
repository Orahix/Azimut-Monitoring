import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { supabase } from '@/services/supabase';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Use ref to track current user - this persists across re-renders and closures
  const userRef = useRef<User | null>(null);

  // Update both state and ref together
  const updateUser = (newUser: User | null) => {
    console.log("updateUser: Setting user to", newUser?.email, "role:", newUser?.role);
    userRef.current = newUser;
    setUser(newUser);
  };

  const fetchProfile = async (authUserId: string, authEmail: string): Promise<User | null> => {
    console.log("fetchProfile: Starting for user", authEmail);

    try {
      console.log("fetchProfile: Querying profiles table...");
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUserId)
        .single();

      if (profileError || !profile) {
        console.error("Error fetching profile:", profileError);
        return null;
      }

      console.log("fetchProfile: Profile found", { role: profile.role });

      let assignedProjectIds: string[] = [];
      console.log("fetchProfile: Querying projects table...");
      const { data: projects, error: projectsError } = await supabase
        .from('projects')
        .select('id')
        .eq('user_id', authUserId);

      if (projects) {
        assignedProjectIds = projects.map(p => p.id);
      }
      console.log("fetchProfile: Found projects", assignedProjectIds.length);

      return {
        id: profile.id,
        email: profile.email,
        username: profile.full_name || profile.email.split('@')[0],
        role: profile.role as 'admin' | 'client',
        assignedProjectIds: assignedProjectIds
      };
    } catch (err) {
      console.error("fetchProfile: Exception", err);
      return null;
    }
  };

  useEffect(() => {
    let mounted = true;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("onAuthStateChange:", event, session?.user?.email, "current user:", userRef.current?.email);
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        updateUser(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        // Use a 5-second timeout for profile fetch
        const fetchWithTimeout = async () => {
          const profilePromise = fetchProfile(session.user.id, session.user.email!);
          const timeoutPromise = new Promise<null>((_, reject) =>
            setTimeout(() => reject(new Error("Profile timeout")), 5000)
          );
          return Promise.race([profilePromise, timeoutPromise]);
        };

        try {
          const freshUserData = await fetchWithTimeout();
          if (freshUserData) {
            updateUser(freshUserData);
          } else if (!userRef.current) {
            // Fallback for new session if fetch failed
            updateUser({
              id: session.user.id,
              email: session.user.email!,
              username: session.user.email!.split('@')[0],
              role: 'client',
              assignedProjectIds: []
            });
          }
        } catch (err) {
          console.error("Profile fetch error/timeout:", err);
          if (!userRef.current) {
            updateUser({
              id: session.user.id,
              email: session.user.email!,
              username: session.user.email!.split('@')[0],
              role: 'client',
              assignedProjectIds: []
            });
          }
        }
      }

      if (mounted) {
        setLoading(false);
      }
    });

    // onAuthStateChange fires INITIAL_SESSION automatically once.
    // Safety timeout to ensure loading eventually stops.
    const loadingFallback = setTimeout(() => {
      if (mounted && loading) {
        console.log("Loading fallback triggered");
        setLoading(false);
      }
    }, 10000);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      clearTimeout(loadingFallback);
    };
  }, []);

  const login = async (email: string, pass: string) => {
    console.log("Login attempt for:", email);

    const loginProcess = async () => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (error) {
        console.error("Supabase login error:", error);
        throw error;
      }

      if (data.session?.user) {
        console.log("Supabase login success, fetching profile...");
        const userData = await fetchProfile(data.session.user.id, data.session.user.email!);
        if (userData) {
          updateUser(userData);
        } else {
          // Create fallback user on login if profile fetch fails
          updateUser({
            id: data.session.user.id,
            email: data.session.user.email!,
            username: data.session.user.email!.split('@')[0],
            role: 'client',
            assignedProjectIds: []
          });
        }
        console.log("Profile fetch completed");
      }
    };

    try {
      await Promise.race([
        loginProcess(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Login request timed out. Please check your connection.')), 15000)
        )
      ]);
    } catch (error) {
      console.error("Login process failed:", error);
      throw error;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
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
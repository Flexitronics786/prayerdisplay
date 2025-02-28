
import { supabase } from "@/integrations/supabase/client";
import { User } from "@/types";

export const login = async (email: string, password: string): Promise<{user: User | null, error: string | null}> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "No user returned after login" };
    }

    // Grant admin access to any successfully authenticated user
    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      isAdmin: true // All authenticated users are admins
    };

    return { user, error: null };
  } catch (error) {
    console.error("Login error:", error);
    return { user: null, error: "An unexpected error occurred" };
  }
};

export const logout = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      return { error: error.message };
    }
    return { error: null };
  } catch (error) {
    console.error("Logout error:", error);
    return { error: "An unexpected error occurred" };
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session || !session.user) {
      return null;
    }

    // Return user with admin privileges
    return {
      id: session.user.id,
      email: session.user.email || '',
      isAdmin: true // All authenticated users are admins
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
};

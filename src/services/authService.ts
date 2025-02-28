
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

    // Get profile to check if user is an admin
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error("Error getting profile:", profileError);
      return { user: null, error: "Error getting user profile" };
    }

    if (!profileData || !profileData.is_admin) {
      // Only allow admin users to access admin panel
      await supabase.auth.signOut();
      return { user: null, error: "You don't have admin privileges" };
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      isAdmin: profileData.is_admin
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

    // Get profile to check if user is an admin
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profileError || !profileData) {
      console.error("Error getting profile:", profileError);
      return null;
    }

    return {
      id: session.user.id,
      email: session.user.email || '',
      isAdmin: profileData.is_admin || false
    };
  } catch (error) {
    console.error("Get current user error:", error);
    return null;
  }
};

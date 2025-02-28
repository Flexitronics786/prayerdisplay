
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

export const registerAdmin = async (email: string, password: string): Promise<{user: User | null, error: string | null}> => {
  try {
    // Check if any admin exists first
    const { count, error: countError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('is_admin', true);

    if (countError) {
      return { user: null, error: "Error checking existing admins" };
    }

    // Only allow registration if no admins exist yet
    if (count && count > 0) {
      return { user: null, error: "Admin registration is disabled. Please contact the system administrator." };
    }

    // Register new user
    const { data, error } = await supabase.auth.signUp({
      email,
      password
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (!data.user) {
      return { user: null, error: "No user returned after registration" };
    }

    // Create profile with admin rights
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: data.user.id,  // Include the user ID here
        email: data.user.email || '',
        is_admin: true
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Try to clean up by deleting the auth user
      await supabase.auth.admin.deleteUser(data.user.id);
      return { user: null, error: "Error creating user profile" };
    }

    const user: User = {
      id: data.user.id,
      email: data.user.email || '',
      isAdmin: true
    };

    return { user, error: null };
  } catch (error) {
    console.error("Registration error:", error);
    return { user: null, error: "An unexpected error occurred" };
  }
};

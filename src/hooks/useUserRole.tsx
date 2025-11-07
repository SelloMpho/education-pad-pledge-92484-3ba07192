import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type UserRole = 'admin' | 'institution' | 'investor' | null;

export const useUserRole = () => {
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [userType, setUserType] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setRole(null);
          setLoading(false);
          return;
        }

        // Get user profile to determine type
        const { data: profile } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserType(profile.user_type);
          // For now, treat user_type as role (admin role will be handled separately later)
          setRole(profile.user_type as UserRole);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, []);

  return { role, userType, loading };
};

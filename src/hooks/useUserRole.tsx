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
          console.log('No user logged in');
          setRole(null);
          setLoading(false);
          return;
        }

        console.log('Current user ID:', user.id);
        console.log('Current user email:', user.email);

        // Get user profile to determine type
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('user_type')
          .eq('id', user.id)
          .single();

        console.log('Profile fetch error:', error);
        console.log('User profile:', profile);
        
        if (profile) {
          setUserType(profile.user_type);
          // Check if user is admin via profiles.user_type or user_roles table
          if (profile.user_type === 'admin') {
            console.log('User is admin');
            setRole('admin');
          } else {
            console.log('User is not admin, type:', profile.user_type);
            setRole(profile.user_type as UserRole);
          }
        } else {
          console.log('No profile found for user');
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

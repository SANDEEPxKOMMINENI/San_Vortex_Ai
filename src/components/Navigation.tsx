import React, { useState, useEffect } from 'react';
import { useChatStore } from '../lib/store';
import { Menu, LogOut, User as UserIcon, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import { Profile } from './Profile';

export function Navigation() {
  const { user } = useChatStore();
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfileData();
    }
  }, [user?.id]);

  const loadProfileData = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      setProfileData(data);
    } catch (error) {
      console.error('Error loading profile data:', error);
    }
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Error logging out:', error);
      toast.error('Failed to log out');
    }
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <button className="text-gray-600 hover:text-gray-900 p-2 rounded-lg">
                <Menu className="h-6 w-6" />
              </button>
              <div className="ml-4">
                <h1 className="font-display text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                  Vortex GPT
                </h1>
              </div>
            </div>
            
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="flex items-center space-x-3 text-gray-700 hover:text-gray-900 focus:outline-none"
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">
                      {profileData?.full_name || 'Set up profile'}
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-primary-100">
                    {profileData?.avatar_url ? (
                      <img
                        src={profileData.avatar_url}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </button>

                {showDropdown && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-soft bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1" role="menu">
                      <button
                        onClick={() => {
                          setShowProfile(true);
                          setShowDropdown(false);
                        }}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <Settings className="w-4 h-4 mr-2 text-primary-500" />
                        Profile Settings
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4 mr-2 text-primary-500" />
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add a spacer to prevent content from being hidden under the fixed navbar */}
      <div className="h-16"></div>

      {showProfile && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center">
          <div className="bg-gray-50 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl shadow-soft">
            <Profile onClose={() => {
              setShowProfile(false);
              loadProfileData();
            }} />
          </div>
        </div>
      )}
    </>
  );
}
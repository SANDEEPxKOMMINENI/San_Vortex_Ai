import React, { useEffect, useState } from 'react';
import { Chat } from './components/Chat';
import { Sidebar } from './components/Sidebar';
import { Auth } from './components/Auth';
import { Profile } from './components/Profile';
import { Navigation } from './components/Navigation';
import { useChatStore } from './lib/store';
import { supabase } from './lib/supabase';
import { Toaster } from 'react-hot-toast';

function App() {
  const { 
    currentChatId, 
    user, 
    setUser, 
    syncChatsWithSupabase, 
    syncFoldersWithSupabase, 
    syncFavoritesWithSupabase,
    sidebarCollapsed
  } = useChatStore();
  
  const [showProfile, setShowProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncChatsWithSupabase();
        syncFoldersWithSupabase();
        syncFavoritesWithSupabase();
        
        // Load user preferences
        supabase
          .from('profiles')
          .select('preferences')
          .eq('user_id', session.user.id)
          .single()
          .then(({ data, error }) => {
            if (!error && data?.preferences?.sidebar_collapsed !== undefined) {
              // We don't directly set the state here because it's already handled in the store
              // This just ensures the initial state matches what's in the database
            }
          });
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        syncChatsWithSupabase();
        syncFoldersWithSupabase();
        syncFavoritesWithSupabase();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <Auth />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <Navigation />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar onShowProfile={() => setShowProfile(true)} />
        <div className={`flex-1 flex flex-col transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-72'}`}>
          {showProfile ? (
            <Profile onClose={() => setShowProfile(false)} />
          ) : currentChatId ? (
            <Chat />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">Welcome to SANDY GPT</h1>
                <p className="text-gray-400">Start a new chat to begin</p>
              </div>
            </div>
          )}
        </div>
      </div>
      <Toaster position="top-right" />
    </div>
  );
}

export default App
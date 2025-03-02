import { create } from 'zustand';
import { Chat, Message, User, Folder } from '../types';
import { persist } from 'zustand/middleware';
import { supabase } from './supabase';

interface ChatState {
  chats: Chat[];
  currentChatId: string | null;
  user: User | null;
  folders: Folder[];
  favorites: string[];
  sidebarCollapsed: boolean;
  addChat: (chat: Omit<Chat, 'title'> & { title?: string }) => void;
  setCurrentChat: (id: string) => void;
  addMessage: (chatId: string, message: Message) => void;
  deleteChat: (id: string) => void;
  updateChatTitle: (id: string, title: string) => void;
  updateChatModel: (id: string, modelId: string) => void;
  setUser: (user: User | null) => void;
  syncChatsWithSupabase: () => Promise<void>;
  generateChatTitle: (messages: Message[]) => string;
  updateUserProfile: (updates: Partial<User>) => Promise<void>;
  toggleFavorite: (chatId: string) => void;
  addFolder: (name: string) => Promise<Folder | null>;
  updateFolder: (id: string, name: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  assignChatToFolder: (chatId: string, folderId: string | null) => Promise<void>;
  toggleSidebarCollapsed: () => void;
  syncFoldersWithSupabase: () => Promise<void>;
  syncFavoritesWithSupabase: () => Promise<void>;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      chats: [],
      currentChatId: null,
      user: null,
      folders: [],
      favorites: [],
      sidebarCollapsed: false,
      setUser: (user) => set({ user }),
      toggleSidebarCollapsed: () => {
        const newState = !get().sidebarCollapsed;
        set({ sidebarCollapsed: newState });
        
        // Also update in user preferences if logged in
        const { user } = get();
        if (user?.id) {
          supabase
            .from('profiles')
            .update({ 
              preferences: {
                ...user.preferences,
                sidebar_collapsed: newState
              }
            })
            .eq('user_id', user.id)
            .then(() => {});
        }
      },
      generateChatTitle: (messages: Message[]) => {
        if (messages.length === 0) {
          const existingTitles = get().chats.map(chat => {
            const match = chat.title.match(/^New Chat (\d+)$/);
            return match ? parseInt(match[1]) : 0;
          });
          const maxNumber = Math.max(0, ...existingTitles);
          return `New Chat ${maxNumber + 1}`;
        }

        const firstUserMessage = messages.find(msg => msg.role === 'user');
        if (!firstUserMessage) return 'New Chat';

        let content = '';
        if (typeof firstUserMessage.content === 'string') {
          content = firstUserMessage.content;
        } else if (Array.isArray(firstUserMessage.content)) {
          const textContent = firstUserMessage.content.find(c => c.type === 'text');
          content = textContent?.text || '';
        }

        return content
          ? content.slice(0, 30).trim() + (content.length > 30 ? '...' : '')
          : 'New Chat';
      },
      addChat: async (chat) => {
        const { user, generateChatTitle } = get();
        if (user) {
          const title = chat.title || generateChatTitle([]);
          const newChat = { 
            ...chat, 
            title, 
            user_id: user.id,
            is_favorite: false,
            folder_id: null
          };

          const { data, error } = await supabase
            .from('chats')
            .insert([newChat])
            .select()
            .single();

          if (!error && data) {
            set((state) => ({
              chats: [...state.chats, data],
              currentChatId: data.id,
            }));
          }
        }
      },
      setCurrentChat: (id) =>
        set(() => ({
          currentChatId: id,
        })),
      addMessage: async (chatId, message) => {
        const { user, generateChatTitle } = get();
        if (user) {
          const { data: chat } = await supabase
            .from('chats')
            .select('messages, title')
            .eq('id', chatId)
            .single();

          const updatedMessages = [...(chat?.messages || []), message];
          
          const currentTitle = chat?.title || '';
          const isDefaultTitle = /^New Chat \d+$/.test(currentTitle);
          const newTitle = isDefaultTitle && updatedMessages.length === 1
            ? generateChatTitle(updatedMessages)
            : currentTitle;

          const { error } = await supabase
            .from('chats')
            .update({ 
              messages: updatedMessages,
              title: newTitle
            })
            .eq('id', chatId);

          if (!error) {
            set((state) => ({
              chats: state.chats.map((chat) =>
                chat.id === chatId
                  ? { ...chat, messages: updatedMessages, title: newTitle }
                  : chat
              ),
            }));
          }
        }
      },
      deleteChat: async (id) => {
        const { user } = get();
        if (user) {
          const { error } = await supabase
            .from('chats')
            .delete()
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            set((state) => ({
              chats: state.chats.filter((chat) => chat.id !== id),
              currentChatId:
                state.currentChatId === id
                  ? state.chats[0]?.id || null
                  : state.currentChatId,
              favorites: state.favorites.filter(favId => favId !== id)
            }));
          }
        }
      },
      updateChatTitle: async (id, title) => {
        const { user } = get();
        if (user) {
          const { error } = await supabase
            .from('chats')
            .update({ title })
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            set((state) => ({
              chats: state.chats.map((chat) =>
                chat.id === id ? { ...chat, title } : chat
              ),
            }));
          }
        }
      },
      updateChatModel: async (id, modelId) => {
        const { user } = get();
        if (user) {
          const { error } = await supabase
            .from('chats')
            .update({ model: modelId })
            .eq('id', id)
            .eq('user_id', user.id);

          if (!error) {
            set((state) => ({
              chats: state.chats.map((chat) =>
                chat.id === id ? { ...chat, model: modelId } : chat
              ),
            }));
          }
        }
      },
      updateUserProfile: async (updates) => {
        const { user } = get();
        if (!user) return;

        try {
          // First check if profile exists
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('id')
            .eq('user_id', user.id)
            .maybeSingle();

          if (existingProfile) {
            // Update existing profile
            const { error } = await supabase
              .from('profiles')
              .update({
                ...updates,
                updated_at: new Date().toISOString()
              })
              .eq('user_id', user.id);

            if (error) throw error;
          } else {
            // Insert new profile
            const { error } = await supabase
              .from('profiles')
              .insert([{
                user_id: user.id,
                ...updates,
                updated_at: new Date().toISOString()
              }]);

            if (error) throw error;
          }

          set((state) => ({
            user: state.user ? { ...state.user, ...updates } : null
          }));
        } catch (error) {
          console.error('Error updating profile:', error);
          throw error;
        }
      },
      toggleFavorite: async (chatId) => {
        const { user, favorites } = get();
        if (!user) return;

        const isFavorite = favorites.includes(chatId);
        const newFavorites = isFavorite 
          ? favorites.filter(id => id !== chatId)
          : [...favorites, chatId];

        // Update local state
        set({ favorites: newFavorites });

        // Update in database
        const { error } = await supabase
          .from('chats')
          .update({ is_favorite: !isFavorite })
          .eq('id', chatId)
          .eq('user_id', user.id);

        if (error) {
          // Revert on error
          set({ favorites });
          console.error('Error updating favorite status:', error);
        }
      },
      addFolder: async (name) => {
        const { user } = get();
        if (!user) return null;

        const newFolder = {
          name,
          user_id: user.id,
          created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('folders')
          .insert([newFolder])
          .select()
          .single();

        if (error) {
          console.error('Error creating folder:', error);
          return null;
        }

        set(state => ({
          folders: [...state.folders, data]
        }));

        return data;
      },
      updateFolder: async (id, name) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('folders')
          .update({ name })
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error updating folder:', error);
          return;
        }

        set(state => ({
          folders: state.folders.map(folder => 
            folder.id === id ? { ...folder, name } : folder
          )
        }));
      },
      deleteFolder: async (id) => {
        const { user } = get();
        if (!user) return;

        // First update all chats in this folder to have no folder
        await supabase
          .from('chats')
          .update({ folder_id: null })
          .eq('folder_id', id)
          .eq('user_id', user.id);

        // Then delete the folder
        const { error } = await supabase
          .from('folders')
          .delete()
          .eq('id', id)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error deleting folder:', error);
          return;
        }

        set(state => ({
          folders: state.folders.filter(folder => folder.id !== id),
          chats: state.chats.map(chat => 
            chat.folder_id === id ? { ...chat, folder_id: null } : chat
          )
        }));
      },
      assignChatToFolder: async (chatId, folderId) => {
        const { user } = get();
        if (!user) return;

        const { error } = await supabase
          .from('chats')
          .update({ folder_id: folderId })
          .eq('id', chatId)
          .eq('user_id', user.id);

        if (error) {
          console.error('Error assigning chat to folder:', error);
          return;
        }

        set(state => ({
          chats: state.chats.map(chat => 
            chat.id === chatId ? { ...chat, folder_id: folderId } : chat
          )
        }));
      },
      syncChatsWithSupabase: async () => {
        const { user } = get();
        if (user) {
          const { data: chats, error } = await supabase
            .from('chats')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (!error && chats) {
            // Extract favorites from chats
            const favorites = chats
              .filter(chat => chat.is_favorite)
              .map(chat => chat.id);
            
            set({ 
              chats,
              favorites
            });
          }
        }
      },
      syncFoldersWithSupabase: async () => {
        const { user } = get();
        if (user) {
          const { data: folders, error } = await supabase
            .from('folders')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

          if (!error && folders) {
            set({ folders });
          }
        }
      },
      syncFavoritesWithSupabase: async () => {
        const { user } = get();
        if (user) {
          const { data: favoriteChats, error } = await supabase
            .from('chats')
            .select('id')
            .eq('user_id', user.id)
            .eq('is_favorite', true);

          if (!error && favoriteChats) {
            const favorites = favoriteChats.map(chat => chat.id);
            set({ favorites });
          }
        }
      }
    }),
    {
      name: 'chat-storage',
    }
  )
);
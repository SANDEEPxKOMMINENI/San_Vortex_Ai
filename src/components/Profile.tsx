import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { User, UserPreferences } from '../types';
import { validateApiKey } from '../lib/api';
import { Camera, Save, X, Moon, Sun, Monitor, Bell, BellOff, Loader, Key, Eye, EyeOff, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { models } from '../lib/models';
import toast from 'react-hot-toast';

interface ProfileProps {
  onClose?: () => void;
}

export function Profile({ onClose }: ProfileProps) {
  const { user, updateUserProfile } = useChatStore();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [profile, setProfile] = useState<Partial<User>>({
    full_name: '',
    bio: '',
    avatar_url: '',
    api_key: '',
  });
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    message_size: 'medium',
    default_model: models[0].id,
    notifications_enabled: true,
    sidebar_collapsed: false,
    use_custom_api: false,
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyValid, setApiKeyValid] = useState<boolean | null>(null);
  const [validatingApiKey, setValidatingApiKey] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.id) {
      loadProfile();
    }
  }, [user?.id]);

  async function loadProfile() {
    try {
      setLoading(true);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        // If profile doesn't exist, create one
        if (error.code === 'PGRST116') {
          await createNewProfile();
        } else {
          throw error;
        }
      } else if (data) {
        setProfile({
          full_name: data.full_name || '',
          bio: data.bio || '',
          avatar_url: data.avatar_url || '',
          api_key: data.api_key || '',
        });
        setPreferences({
          theme: (data.preferences?.theme || 'system') as 'light' | 'dark' | 'system',
          message_size: (data.preferences?.message_size || 'medium') as 'small' | 'medium' | 'large',
          default_model: data.preferences?.default_model || models[0].id,
          notifications_enabled: data.preferences?.notifications_enabled ?? true,
          sidebar_collapsed: data.preferences?.sidebar_collapsed ?? false,
          use_custom_api: data.preferences?.use_custom_api ?? false,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }

  async function createNewProfile() {
    try {
      if (!user?.id) return;

      // First check if profile already exists (to avoid duplicate key error)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existingProfile) {
        // Profile exists, reload it
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data) {
          setProfile({
            full_name: data.full_name || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            api_key: data.api_key || '',
          });
          setPreferences({
            theme: (data.preferences?.theme || 'system') as 'light' | 'dark' | 'system',
            message_size: (data.preferences?.message_size || 'medium') as 'small' | 'medium' | 'large',
            default_model: data.preferences?.default_model || models[0].id,
            notifications_enabled: data.preferences?.notifications_enabled ?? true,
            sidebar_collapsed: data.preferences?.sidebar_collapsed ?? false,
            use_custom_api: data.preferences?.use_custom_api ?? false,
          });
        }
        return;
      }

      // Create new profile if it doesn't exist
      const { data: newProfile, error: createError } = await supabase
        .from('profiles')
        .insert([{
          user_id: user.id,
          full_name: '',
          bio: '',
          preferences: {
            theme: 'system',
            message_size: 'medium',
            default_model: models[0].id,
            notifications_enabled: true,
            sidebar_collapsed: false,
            use_custom_api: false
          }
        }])
        .select()
        .single();

      if (createError) throw createError;
      if (newProfile) {
        setProfile({
          full_name: newProfile.full_name || '',
          bio: newProfile.bio || '',
          avatar_url: newProfile.avatar_url || '',
          api_key: newProfile.api_key || '',
        });
        setPreferences({
          theme: (newProfile.preferences?.theme || 'system') as 'light' | 'dark' | 'system',
          message_size: (newProfile.preferences?.message_size || 'medium') as 'small' | 'medium' | 'large',
          default_model: newProfile.preferences?.default_model || models[0].id,
          notifications_enabled: newProfile.preferences?.notifications_enabled ?? true,
          sidebar_collapsed: newProfile.preferences?.sidebar_collapsed ?? false,
          use_custom_api: newProfile.preferences?.use_custom_api ?? false,
        });
      }
    } catch (error) {
      console.error('Error creating profile:', error);
      toast.error('Failed to create profile');
    }
  }

  async function updateProfile() {
    try {
      setLoading(true);
      if (!user?.id) return;

      // If using custom API but no API key is provided or it's invalid
      if (preferences.use_custom_api) {
        if (!profile.api_key) {
          toast.error('Please enter your OpenRouter API key');
          setLoading(false);
          return;
        }
        
        if (apiKeyValid === false) {
          toast.error('The API key is invalid. Please check and try again.');
          setLoading(false);
          return;
        }
      }

      // Use the updateUserProfile function from the store which now handles the upsert logic
      await updateUserProfile({
        full_name: profile.full_name,
        bio: profile.bio,
        avatar_url: profile.avatar_url,
        api_key: profile.api_key,
        preferences
      });

      toast.success('Profile updated successfully');
      if (onClose) onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  }

  async function uploadAvatar(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);
      if (!event.target.files || !event.target.files[0] || !user?.id) return;

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/avatar.${fileExt}`;

      // Delete existing avatar if it exists
      if (profile.avatar_url) {
        const existingPath = new URL(profile.avatar_url).pathname.split('/').pop();
        if (existingPath) {
          await supabase.storage
            .from('avatars')
            .remove([existingPath])
            .catch(() => {}); // Ignore error if no existing file
        }
      }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type,
          cacheControl: '3600'
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setProfile(prev => ({ ...prev, avatar_url: publicUrl }));
      toast.success('Avatar uploaded successfully');
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  }

  const validateApiKeyHandler = async () => {
    if (!profile.api_key) {
      setApiKeyValid(null);
      return;
    }

    setValidatingApiKey(true);
    try {
      const isValid = await validateApiKey(profile.api_key);
      setApiKeyValid(isValid);
    } catch (error) {
      console.error('Error validating API key:', error);
      setApiKeyValid(false);
    } finally {
      setValidatingApiKey(false);
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (profile.api_key) {
        validateApiKeyHandler();
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [profile.api_key]);

  if (initialLoad) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div className="bg-gray-800 rounded-lg p-6 space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-white">Profile Settings</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gray-700 overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <Camera className="w-8 h-8" />
                </div>
              )}
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 bg-blue-600 p-2 rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={uploading}
            >
              {uploading ? (
                <Loader className="w-4 h-4 animate-spin" />
              ) : (
                <Camera className="w-4 h-4" />
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={uploadAvatar}
              accept="image/*"
              className="hidden"
              disabled={uploading}
            />
          </div>
          <div>
            <h3 className="text-lg font-medium text-white">
              {profile.full_name || 'Add your name'}
            </h3>
            <p className="text-gray-400">{user?.email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name || ''}
              onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Bio
            </label>
            <textarea
              value={profile.bio || ''}
              onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">API Settings</h3>
          
          <div className="p-4 bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer"
                    checked={preferences.use_custom_api}
                    onChange={() => setPreferences({
                      ...preferences,
                      use_custom_api: !preferences.use_custom_api
                    })}
                  />
                  <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  <span className="ml-3 text-sm font-medium text-white">Use Custom API Key</span>
                </label>
                <div className="ml-2 text-gray-400 cursor-help group relative">
                  <Info className="w-4 h-4" />
                  <div className="absolute left-0 bottom-full mb-2 w-64 bg-gray-900 p-3 rounded-lg shadow-lg text-xs text-gray-300 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
                    <p className="mb-2">You must provide your own OpenRouter API key to use this application.</p>
                    <p>Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenRouter.ai</a></p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  OpenRouter API Key <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? "text" : "password"}
                    value={profile.api_key || ''}
                    onChange={(e) => setProfile({ ...profile, api_key: e.target.value })}
                    placeholder="sk-or-v1-..."
                    className={`w-full bg-gray-600 text-white rounded-lg pl-4 pr-10 py-2 focus:outline-none focus:ring-2 ${
                      apiKeyValid === true ? 'focus:ring-green-500 border border-green-500' : 
                      apiKeyValid === false ? 'focus:ring-red-500 border border-red-500' : 
                      'focus:ring-blue-500 border border-gray-600'
                    }`}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="mt-2 flex items-center">
                  {validatingApiKey ? (
                    <div className="flex items-center text-gray-400 text-xs">
                      <Loader className="w-3 h-3 mr-1 animate-spin" />
                      Validating API key...
                    </div>
                  ) : apiKeyValid === true ? (
                    <div className="flex items-center text-green-500 text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Valid API key
                    </div>
                  ) : apiKeyValid === false ? (
                    <div className="flex items-center text-red-500 text-xs">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Invalid API key
                    </div>
                  ) : null}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  Get your API key from <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">OpenRouter.ai</a>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-white">Preferences</h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Theme
            </label>
            <div className="flex space-x-2">
              {(['light', 'dark', 'system'] as const).map((theme) => (
                <button
                  key={theme}
                  onClick={() => setPreferences({ ...preferences, theme })}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                    preferences.theme === theme
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {theme === 'light' && <Sun className="w-5 h-5" />}
                  {theme === 'dark' && <Moon className="w-5 h-5" />}
                  {theme === 'system' && <Monitor className="w-5 h-5" />}
                  <span className="capitalize">{theme}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Message Size
            </label>
            <div className="flex space-x-2">
              {(['small', 'medium', 'large'] as const).map((size) => (
                <button
                  key={size}
                  onClick={() => setPreferences({ ...preferences, message_size: size })}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    preferences.message_size === size
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <span className="capitalize">{size}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Default Model
            </label>
            <select
              value={preferences.default_model}
              onChange={(e) => setPreferences({ ...preferences, default_model: e.target.value })}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="flex items-center space-x-2 cursor-pointer">
              <button
                onClick={() => setPreferences({
                  ...preferences,
                  notifications_enabled: !preferences.notifications_enabled
                })}
                className={`p-2 rounded-lg transition-colors ${
                  preferences.notifications_enabled
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {preferences.notifications_enabled ? (
                  <Bell className="w-5 h-5" />
                ) : (
                  <BellOff className="w-5 h-5" />
                )}
              </button>
              <span className="text-gray-300">Enable Notifications</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={updateProfile}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            <span>Save Changes</span>
          </button>
        </div>
      </div>
    </div>
  );
}
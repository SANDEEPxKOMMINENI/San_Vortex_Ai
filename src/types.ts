export interface Message {
  role: 'user' | 'assistant';
  content: string | MessageContent[];
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

export interface Chat {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  created_at: string;
  user_id?: string;
  folder_id?: string;
  is_favorite?: boolean;
}

export interface AIModel {
  id: string;
  name: string;
  description: string;
  supportsImages: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  preferences?: UserPreferences;
  api_key?: string;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  message_size: 'small' | 'medium' | 'large';
  default_model: string;
  notifications_enabled: boolean;
  sidebar_collapsed: boolean;
  use_custom_api: boolean;
}

export interface Folder {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

export interface PdfAnalysis {
  id: string;
  filename: string;
  content: string;
  summary: string;
  chat_id?: string;
}
import React, { useState, useEffect, useRef } from 'react';
import { useChatStore } from '../lib/store';
import { models } from '../lib/models';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  ChevronDown, 
  ChevronRight, 
  Edit2, 
  Check, 
  X, 
  Search, 
  User, 
  Clock, 
  Calendar, 
  Filter, 
  SortAsc, 
  SortDesc,
  Star,
  StarOff,
  Folder,
  FolderPlus,
  Tag,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronUp,
  Menu,
  PanelLeft,
  PanelLeftClose
} from 'lucide-react';
import { Profile } from './Profile';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a';
type FilterOption = 'all' | 'favorites' | 'folders';

export function Sidebar({ onShowProfile }: { onShowProfile: () => void }) {
  const { 
    chats, 
    currentChatId, 
    addChat, 
    setCurrentChat, 
    deleteChat, 
    updateChatTitle, 
    user,
    folders,
    favorites,
    sidebarCollapsed,
    toggleSidebarCollapsed,
    toggleFavorite,
    addFolder,
    updateFolder,
    deleteFolder,
    assignChatToFolder,
    syncFoldersWithSupabase
  } = useChatStore();
  
  const [isModelsExpanded, setIsModelsExpanded] = useState(false);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showProfile, setShowProfile] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('newest');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);
  const editFolderInputRef = useRef<HTMLInputElement>(null);
  const editTimeoutRef = useRef<NodeJS.Timeout>();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load folders from database
  useEffect(() => {
    if (user?.id) {
      syncFoldersWithSupabase();
    }
  }, [user?.id]);

  const handleNewChat = () => {
    const newChat = {
      id: crypto.randomUUID(),
      messages: [],
      model: models[0].id,
      created_at: new Date().toISOString()
    };
    addChat(newChat);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setEditTitle(newTitle);

    if (editTimeoutRef.current) {
      clearTimeout(editTimeoutRef.current);
    }

    editTimeoutRef.current = setTimeout(() => {
      if (newTitle.trim()) {
        updateChatTitle(editingChatId!, newTitle.trim());
      }
    }, 500);
  };

  const handleSave = async (chatId: string) => {
    if (editTitle.trim()) {
      await updateChatTitle(chatId, editTitle.trim());
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  const cancelEditing = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  const startEditing = (chat: any) => {
    setEditingChatId(chat.id);
    setEditTitle(chat.title);
  };

  const handleAddFolder = async () => {
    if (newFolderName.trim()) {
      await addFolder(newFolderName.trim());
      setNewFolderName('');
      setShowFolderModal(false);
    }
  };

  const handleEditFolder = (folderId: string, currentName: string) => {
    setEditingFolderId(folderId);
    setEditFolderName(currentName);
  };

  const saveEditedFolder = async () => {
    if (editingFolderId && editFolderName.trim()) {
      await updateFolder(editingFolderId, editFolderName.trim());
      setEditingFolderId(null);
      setEditFolderName('');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (confirm('Are you sure you want to delete this folder? Chats will be moved to the root level.')) {
      await deleteFolder(folderId);
      if (selectedFolder === folderId) {
        setSelectedFolder(null);
        setFilterOption('all');
      }
    }
  };

  const handleAssignChatToFolder = async (chatId: string, folderId: string | null) => {
    await assignChatToFolder(chatId, folderId);
  };

  // Apply sorting to chats
  const sortChats = (chats: any[]) => {
    return [...chats].sort((a, b) => {
      switch (sortOption) {
        case 'newest':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'oldest':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'a-z':
          return a.title.localeCompare(b.title);
        case 'z-a':
          return b.title.localeCompare(a.title);
        default:
          return 0;
      }
    });
  };

  // Apply filtering to chats
  const filterChats = (chats: any[]) => {
    // First apply search query
    let filtered = chats.filter(chat => 
      chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      chat.messages.some((msg: any) => 
        typeof msg.content === 'string' 
          ? msg.content.toLowerCase().includes(searchQuery.toLowerCase())
          : msg.content.some((content: any) => 
              content.type === 'text' && content.text?.toLowerCase().includes(searchQuery.toLowerCase())
            )
      )
    );
    
    // Then apply category filter
    if (filterOption === 'favorites') {
      filtered = filtered.filter(chat => favorites.includes(chat.id));
    } else if (filterOption === 'folders' && selectedFolder) {
      filtered = filtered.filter(chat => chat.folder_id === selectedFolder);
    }
    
    return filtered;
  };

  const processedChats = sortChats(filterChats(chats));

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (editInputRef.current && !editInputRef.current.contains(event.target as Node)) {
        if (editingChatId && editTitle.trim()) {
          handleSave(editingChatId);
        }
      }
      
      if (editFolderInputRef.current && !editFolderInputRef.current.contains(event.target as Node)) {
        if (editingFolderId && editFolderName.trim()) {
          saveEditedFolder();
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [editingChatId, editTitle, editingFolderId, editFolderName]);

  useEffect(() => {
    return () => {
      if (editTimeoutRef.current) {
        clearTimeout(editTimeoutRef.current);
      }
    };
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === '/' && document.activeElement !== searchInputRef.current) {
      e.preventDefault();
      searchInputRef.current?.focus();
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown as any);
    return () => {
      document.removeEventListener('keydown', handleKeyDown as any);
    };
  }, []);

  if (sidebarCollapsed) {
    return (
      <div className="w-16 bg-gray-900 text-white flex flex-col h-[calc(100vh-4rem)] border-r border-gray-800 transition-all duration-300">
        <div className="p-3 border-b border-gray-800 flex flex-col items-center">
          <button
            onClick={toggleSidebarCollapsed}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg mb-4"
            title="Expand Sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
          
          <button
            onClick={handleNewChat}
            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors mb-2"
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => setShowProfile(true)}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors mb-2"
            title="Profile Settings"
          >
            <User className="w-5 h-5" />
          </button>
          
          <button
            onClick={() => onShowProfile()}
            className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
            title="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {processedChats.slice(0, 10).map((chat) => (
            <button
              key={chat.id}
              className={`w-full p-2 rounded-lg flex justify-center ${
                chat.id === currentChatId
                  ? 'bg-gray-700'
                  : 'hover:bg-gray-800'
              }`}
              onClick={() => setCurrentChat(chat.id)}
              title={chat.title}
            >
              <MessageSquare className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      {showProfile ? (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-[60] flex items-center justify-center">
          <div className="bg-gray-900 w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-800">
              <h2 className="text-xl font-bold text-white">Profile Settings</h2>
              <button
                onClick={() => setShowProfile(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <Profile />
          </div>
        </div>
      ) : (
        <div className="w-72 bg-gray-900 text-white flex flex-col h-[calc(100vh-4rem)] border-r border-gray-800 transition-all duration-300">
          {/* Header */}
          <div className="p-4 border-b border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={handleNewChat}
                className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 px-4 transition-colors flex-1 mr-2"
              >
                <Plus className="w-5 h-5" />
                <span>New Chat</span>
              </button>
              <div className="flex space-x-1">
                <button
                  onClick={toggleSidebarCollapsed}
                  className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                  title="Collapse Sidebar"
                >
                  <PanelLeftClose className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowProfile(true)}
                  className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                  title="Profile Settings"
                >
                  <User className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onShowProfile()}
                  className="p-2 text-gray-400 hover:text-white bg-gray-800 rounded-lg transition-colors"
                  title="Settings"
                >
                  <Settings className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-2">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search chats... (Press '/')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-gray-800 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Advanced Search Toggle */}
            <button
              onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
              className="flex items-center justify-between w-full text-xs text-gray-400 hover:text-white py-1 px-2 rounded transition-colors"
            >
              <span>Advanced filters</span>
              {showAdvancedSearch ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <div className="p-3 bg-gray-800 border-b border-gray-700 space-y-3">
              {/* Sort Options */}
              <div>
                <div className="flex items-center mb-2 text-xs text-gray-400">
                  <SortAsc className="w-3 h-3 mr-1" />
                  <span>Sort by</span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  {[
                    { value: 'newest', label: 'Newest', icon: Clock },
                    { value: 'oldest', label: 'Oldest', icon: Calendar },
                    { value: 'a-z', label: 'A-Z', icon: SortAsc },
                    { value: 'z-a', label: 'Z-A', icon: SortDesc }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortOption(option.value as SortOption)}
                      className={`flex items-center text-xs px-2 py-1.5 rounded ${
                        sortOption === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <option.icon className="w-3 h-3 mr-1.5" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Options */}
              <div>
                <div className="flex items-center mb-2 text-xs text-gray-400">
                  <Filter className="w-3 h-3 mr-1" />
                  <span>Filter by</span>
                </div>
                <div className="flex space-x-1">
                  {[
                    { value: 'all', label: 'All', icon: MessageSquare },
                    { value: 'favorites', label: 'Favorites', icon: Star },
                    { value: 'folders', label: 'Folders', icon: Folder }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterOption(option.value as FilterOption);
                        if (option.value !== 'folders') {
                          setSelectedFolder(null);
                        }
                      }}
                      className={`flex items-center text-xs px-2 py-1.5 rounded ${
                        filterOption === option.value
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <option.icon className="w-3 h-3 mr-1.5" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Folder Selection (when folders filter is active) */}
              {filterOption === 'folders' && (
                <div className="mt-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-400">Select folder</span>
                    <button
                      onClick={() => setShowFolderModal(true)}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center"
                    >
                      <FolderPlus className="w-3 h-3 mr-1" />
                      New
                    </button>
                  </div>
                  <div className="max-h-24 overflow-y-auto space-y-1 pr-1">
                    {folders.map(folder => (
                      <div key={folder.id} className="group relative">
                        {editingFolderId === folder.id ? (
                          <div className="flex items-center space-x-1">
                            <input
                              ref={editFolderInputRef}
                              type="text"
                              value={editFolderName}
                              onChange={(e) => setEditFolderName(e.target.value)}
                              className="bg-gray-700 text-white rounded px-2 py-1 text-xs flex-1 min-w-0"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditedFolder();
                                if (e.key === 'Escape') {
                                  setEditingFolderId(null);
                                  setEditFolderName('');
                                }
                              }}
                            />
                            <button
                              onClick={saveEditedFolder}
                              className="text-green-500 hover:text-green-400 p-1"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => {
                                setEditingFolderId(null);
                                setEditFolderName('');
                              }}
                              className="text-red-500 hover:text-red-400 p-1"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedFolder(folder.id)}
                            className={`flex items-center justify-between w-full text-xs px-2 py-1.5 rounded ${
                              selectedFolder === folder.id
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <div className="flex items-center">
                              <Folder className="w-3 h-3 mr-1.5" />
                              <span className="truncate">{folder.name}</span>
                            </div>
                            <span className="text-xs opacity-70">
                              {chats.filter(chat => chat.folder_id === folder.id).length}
                            </span>
                          </button>
                        )}
                        
                        {!editingFolderId && (
                          <div className="absolute right-0 top-0 h-full flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditFolder(folder.id, folder.name);
                              }}
                              className="p-1 text-gray-400 hover:text-white"
                              title="Rename folder"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-500"
                              title="Delete folder"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                    {folders.length === 0 && (
                      <div className="text-xs text-gray-500 italic px-2 py-1">
                        No folders created yet
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto space-y-1 p-3">
            {processedChats.length > 0 ? (
              processedChats.map((chat) => (
                <div
                  key={chat.id}
                  className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                    chat.id === currentChatId
                      ? 'bg-gray-700'
                      : 'hover:bg-gray-800'
                  }`}
                  onClick={() => !editingChatId && setCurrentChat(chat.id)}
                >
                  <div className="flex items-center space-x-2 min-w-0 flex-1">
                    <MessageSquare className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    {editingChatId === chat.id ? (
                      <div className="flex items-center space-x-1 flex-1">
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editTitle}
                          onChange={handleTitleChange}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleSave(chat.id);
                            } else if (e.key === 'Escape') {
                              cancelEditing();
                            }
                          }}
                          className="bg-gray-800 text-white rounded px-2 py-1 text-sm flex-1 min-w-0"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSave(chat.id);
                          }}
                          className="text-green-500 hover:text-green-400 p-1"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="text-red-500 hover:text-red-400 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center justify-between">
                          <span className="truncate font-medium">{chat.title}</span>
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(chat.id);
                              }}
                              className={`p-1 ${favorites.includes(chat.id) ? 'text-yellow-400' : 'text-gray-400 hover:text-yellow-400'}`}
                              title={favorites.includes(chat.id) ? "Remove from favorites" : "Add to favorites"}
                            >
                              {favorites.includes(chat.id) ? (
                                <Star className="w-4 h-4" />
                              ) : (
                                <StarOff className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditing(chat);
                              }}
                              className="text-gray-400 hover:text-white p-1"
                              title="Rename"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteChat(chat.id);
                              }}
                              className="text-gray-400 hover:text-red-500 p-1"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 mr-1" />
                          <span>{formatDistanceToNow(new Date(chat.created_at), { addSuffix: true })}</span>
                          
                          {chat.folder_id && (
                            <div className="flex items-center ml-2">
                              <Folder className="w-3 h-3 mr-1 text-blue-400" />
                              <span className="text-blue-400">
                                {folders.find(f => f.id === chat.folder_id)?.name}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignChatToFolder(chat.id, null);
                                }}
                                className="ml-1 text-gray-500 hover:text-red-400"
                                title="Remove from folder"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {!editingChatId && !chat.folder_id && (
                    <div className="relative group-hover:block hidden">
                      <button
                        className="p-1 text-gray-400 hover:text-blue-400"
                        title="Add to folder"
                        onClick={(e) => {
                          e.stopPropagation();
                          const dropdown = e.currentTarget.nextElementSibling;
                          if (dropdown) {
                            dropdown.classList.toggle('hidden');
                          }
                        }}
                      >
                        <FolderPlus className="w-4 h-4" />
                      </button>
                      <div className="absolute right-0 mt-1 w-40 bg-gray-800 rounded-lg shadow-lg overflow-hidden hidden z-10">
                        {folders.length > 0 ? (
                          <div className="max-h-40 overflow-y-auto py-1">
                            {folders.map(folder => (
                              <button
                                key={folder.id}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 flex items-center"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAssignChatToFolder(chat.id, folder.id);
                                }}
                              >
                                <Folder className="w-3 h-3 mr-2 text-blue-400" />
                                <span className="truncate">{folder.name}</span>
                              </button>
                             ))}
                          </div>
                        ) : (
                          <div className="px-3 py-2 text-sm text-gray-400">
                            No folders available
                          </div>
                        )}
                        <div className="border-t border-gray-700 px-3 py-1.5">
                          <button
                            className="w-full text-left text-xs text-blue-400 hover:text-blue-300 flex items-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowFolderModal(true);
                            }}
                          >
                            <FolderPlus className="w-3 h-3 mr-2" />
                            Create new folder
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                <Search className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No chats found</p>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="mt-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    Clear search
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-gray-800 p-4 space-y-3">
            <button
              onClick={() => setIsModelsExpanded(!isModelsExpanded)}
              className="flex items-center justify-between w-full text-sm text-gray-400 hover:text-white transition-colors"
            >
              <span>Available Models</span>
              {isModelsExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            {isModelsExpanded && (
              <div className="mt-2 space-y-3 max-h-40 overflow-y-auto pr-1">
                {models.map((model) => (
                  <div key={model.id} className="text-sm">
                    <div className="font-medium text-gray-300">{model.name}</div>
                    <div className="text-gray-500 text-xs mt-1">{model.description}</div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2">
              <button className="hover:text-gray-300 flex items-center">
                <HelpCircle className="w-3 h-3 mr-1" />
                Help
              </button>
              <span>v1.3.0</span>
            </div>
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {showFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-gray-800 rounded-lg shadow-lg w-80 p-4">
            <h3 className="text-lg font-medium text-white mb-4">Create New Folder</h3>
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Folder name"
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowFolderModal(false)}
                className="px-4 py-2 text-sm text-gray-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleAddFolder}
                disabled={!newFolderName.trim()}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
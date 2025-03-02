import React, { useState, useRef, useEffect } from 'react';
import { models } from '../lib/models';
import { Settings, Image, ChevronDown, Search, X, Info, Zap, Star, Clock } from 'lucide-react';

interface ModelSelectorProps {
  currentModel: string;
  onModelChange: (modelId: string) => void;
}

export function ModelSelector({ currentModel, onModelChange }: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modelCategory, setModelCategory] = useState<'all' | 'text' | 'vision'>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const currentModelInfo = models.find(model => model.id === currentModel);

  // Filter models based on search query and category
  const filteredModels = models.filter(model => {
    const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         model.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (modelCategory === 'all') return matchesSearch;
    if (modelCategory === 'vision') return matchesSearch && model.supportsImages;
    if (modelCategory === 'text') return matchesSearch && !model.supportsImages;
    
    return matchesSearch;
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelectModel = (modelId: string) => {
    onModelChange(modelId);
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition-colors"
      >
        <Settings className="w-5 h-5" />
        <span className="text-sm font-medium">{currentModelInfo?.name || 'Select Model'}</span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute left-0 mt-2 w-96 bg-gray-800 rounded-lg shadow-xl overflow-hidden z-50 border border-gray-700">
          <div className="p-3 border-b border-gray-700">
            <div className="relative mb-3">
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search models..."
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-10 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            
            <div className="flex space-x-2">
              <button
                onClick={() => setModelCategory('all')}
                className={`px-3 py-1.5 text-xs rounded-md ${
                  modelCategory === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                All Models
              </button>
              <button
                onClick={() => setModelCategory('vision')}
                className={`flex items-center px-3 py-1.5 text-xs rounded-md ${
                  modelCategory === 'vision' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Image className="w-3 h-3 mr-1.5" />
                Vision
              </button>
              <button
                onClick={() => setModelCategory('text')}
                className={`flex items-center px-3 py-1.5 text-xs rounded-md ${
                  modelCategory === 'text' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                <Info className="w-3 h-3 mr-1.5" />
                Text Only
              </button>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2">
            {filteredModels.length > 0 ? (
              filteredModels.map(model => (
                <button
                  key={model.id}
                  className={`w-full text-left px-3 py-3 hover:bg-gray-700 rounded-lg transition-colors mb-1 ${
                    model.id === currentModel ? 'bg-gray-700 border-l-4 border-blue-500 pl-2' : ''
                  }`}
                  onClick={() => handleSelectModel(model.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center space-x-2 mb-1">
                        <span className="truncate">{model.name}</span>
                        {model.supportsImages && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-900 text-blue-200">
                            <Image className="w-3 h-3 mr-1" />
                            Vision
                          </span>
                        )}
                        {model.id.includes('microsoft/phi-3') && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-200">
                            <Star className="w-3 h-3 mr-1" />
                            New
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 truncate">{model.description}</div>
                      <div className="flex items-center mt-1 text-xs text-gray-500">
                        {model.id.includes('gemini') && (
                          <span className="flex items-center mr-3">
                            <Zap className="w-3 h-3 mr-1 text-yellow-400" />
                            Fast
                          </span>
                        )}
                        {model.id.includes('128k') && (
                          <span className="flex items-center">
                            <Clock className="w-3 h-3 mr-1 text-blue-400" />
                            128k context
                          </span>
                        )}
                      </div>
                    </div>
                    {model.id === currentModel && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    )}
                  </div>
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-gray-400">
                <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
                <p>No models found matching your search</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
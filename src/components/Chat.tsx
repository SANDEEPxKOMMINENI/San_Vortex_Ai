import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../lib/store';
import { sendMessage, analyzePdf } from '../lib/api';
import { Message } from '../types';
import { Send, Image, Loader, X, StopCircle, Edit2, AlertCircle, CheckCircle2, FileText, Download, ExternalLink, Maximize2, Minimize2, Key } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { ModelSelector } from './ModelSelector';
import { models } from '../lib/models';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

interface FileUploadStatus {
  id: string;
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  previewUrl: string;
  publicUrl?: string;
  error?: string;
  type: 'image' | 'pdf';
  pdfText?: string;
}

export function Chat() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [fileUploads, setFileUploads] = useState<FileUploadStatus[]>([]);
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [editMessageContent, setEditMessageContent] = useState('');
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [isPdfFullscreen, setIsPdfFullscreen] = useState(false);
  const [apiKeyMissing, setApiKeyMissing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const uploadAbortControllers = useRef<Map<string, AbortController>>(new Map());
  const { currentChatId, chats, addMessage, updateChatModel, user } = useChatStore();

  const currentChat = chats.find((chat) => chat.id === currentChatId);
  const currentModel = models.find(model => model.id === currentChat?.model);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [currentChat?.messages, scrollToBottom]);

  useEffect(() => {
    return () => {
      fileUploads.forEach(upload => {
        if (upload.previewUrl) {
          URL.revokeObjectURL(upload.previewUrl);
        }
        const controller = uploadAbortControllers.current.get(upload.id);
        if (controller) {
          controller.abort();
          uploadAbortControllers.current.delete(upload.id);
        }
      });
    };
  }, [fileUploads]);

  // Check if user has API key set up
  useEffect(() => {
    const checkApiKey = async () => {
      if (!user?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('api_key, preferences')
        .eq('user_id', user.id)
        .single();
      
      if (data) {
        const useCustomApi = data.preferences?.use_custom_api ?? true;
        const hasApiKey = !!data.api_key;
        
        setApiKeyMissing(useCustomApi && !hasApiKey);
      }
    };
    
    checkApiKey();
  }, [user?.id]);

  const validateFile = (file: File) => {
    const maxSize = 50 * 1024 * 1024; // 50MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    if (file.size > maxSize) {
      throw new Error(`File ${file.name} is too large. Maximum size is 50MB`);
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not supported`);
    }
  };

  const createFileUploadStatus = (file: File): FileUploadStatus => {
    const fileType = file.type.startsWith('image/') ? 'image' : 'pdf';
    return {
      id: crypto.randomUUID(),
      file,
      progress: 0,
      status: 'pending',
      previewUrl: URL.createObjectURL(file),
      type: fileType
    };
  };

  const updateFileUploadStatus = (id: string, updates: Partial<FileUploadStatus>) => {
    setFileUploads(prev => 
      prev.map(upload => 
        upload.id === id ? { ...upload, ...updates } : upload
      )
    );
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user?.id) return;

    const newUploads: FileUploadStatus[] = [];

    for (const file of Array.from(files)) {
      try {
        validateFile(file);
        const uploadStatus = createFileUploadStatus(file);
        newUploads.push(uploadStatus);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'File validation failed');
      }
    }

    setFileUploads(prev => [...prev, ...newUploads]);

    // Start uploads
    newUploads.forEach(upload => {
      handleSingleFileUpload(upload);
    });

    // Reset file input
    if (event.target) {
      event.target.value = '';
    }
  };

  const handleSingleFileUpload = async (uploadStatus: FileUploadStatus) => {
    if (!user?.id) return;

    const controller = new AbortController();
    uploadAbortControllers.current.set(uploadStatus.id, controller);

    try {
      updateFileUploadStatus(uploadStatus.id, { status: 'uploading' });

      const fileExt = uploadStatus.file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      // For PDFs, analyze the content
      if (uploadStatus.type === 'pdf') {
        try {
          const pdfText = await analyzePdf(uploadStatus.file);
          updateFileUploadStatus(uploadStatus.id, { pdfText });
        } catch (error) {
          console.error('Error analyzing PDF:', error);
          // Continue with upload even if analysis fails
        }
      }

      const options = {
        cacheControl: '3600',
        upsert: false,
        onUploadProgress: (progress: number) => {
          updateFileUploadStatus(uploadStatus.id, { progress });
        }
      };

      const { error: uploadError, data } = await supabase.storage
        .from('chat-files')
        .upload(filePath, uploadStatus.file, options);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      updateFileUploadStatus(uploadStatus.id, {
        status: 'success',
        publicUrl,
        progress: 100
      });

      if (uploadStatus.type === 'image') {
        setUploadedFiles(prev => [...prev, publicUrl]);
      }
      
      toast.success(`${uploadStatus.file.name} uploaded successfully`);

    } catch (error) {
      console.error('Error uploading file:', error);
      updateFileUploadStatus(uploadStatus.id, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Upload failed'
      });
      toast.error(`Failed to upload ${uploadStatus.file.name}`);
    } finally {
      uploadAbortControllers.current.delete(uploadStatus.id);
    }
  };

  const cancelUpload = (uploadId: string) => {
    const controller = uploadAbortControllers.current.get(uploadId);
    if (controller) {
      controller.abort();
      uploadAbortControllers.current.delete(uploadId);
    }

    const upload = fileUploads.find(u => u.id === uploadId);
    if (upload?.previewUrl) {
      URL.revokeObjectURL(upload.previewUrl);
    }

    setFileUploads(prev => prev.filter(u => u.id !== uploadId));
  };

  const removeUploadedFile = async (url: string) => {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname.split('/');
      const filePath = pathSegments.slice(pathSegments.indexOf('chat-files') + 1).join('/');

      const { error } = await supabase.storage
        .from('chat-files')
        .remove([filePath]);

      if (error) throw error;

      setUploadedFiles(prev => prev.filter(f => f !== url));
      setFileUploads(prev => prev.filter(u => u.publicUrl !== url));
      toast.success('File removed successfully');
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error('Failed to remove file');
    }
  };

  const handleModelChange = (modelId: string) => {
    if (currentChat) {
      updateChatModel(currentChat.id, modelId);
    }
  };

  const handleStopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const startEditingMessage = (index: number) => {
    const message = currentChat.messages[index];
    if (message.role === 'user') {
      const content = typeof message.content === 'string' 
        ? message.content 
        : message.content.find(c => c.type === 'text')?.text || '';
      setEditMessageContent(content);
      setEditingMessageIndex(index);
    }
  };

  const handleEditMessage = async (index: number) => {
    if (!editMessageContent.trim()) return;
    
    const updatedMessages = [...currentChat.messages];
    const originalMessage = updatedMessages[index];
    
    if (typeof originalMessage.content === 'string') {
      updatedMessages[index] = { ...originalMessage, content: editMessageContent };
    } else {
      updatedMessages[index] = {
        ...originalMessage,
        content: originalMessage.content.map(c => 
          c.type === 'text' ? { ...c, text: editMessageContent } : c
        )
      };
    }
    
    addMessage(currentChat.id, updatedMessages[index]);
    setEditingMessageIndex(null);
    setEditMessageContent('');
    
    setIsLoading(true);
    try {
      // Get user's API key and preferences
      const { data: profileData } = await supabase
        .from('profiles')
        .select('api_key, preferences')
        .eq('user_id', user.id)
        .single();
      
      const useCustomApi = profileData?.preferences?.use_custom_api ?? true;
      const apiKey = useCustomApi ? profileData?.api_key : undefined;
      
      if (useCustomApi && !apiKey) {
        throw new Error('API key is required. Please add your OpenRouter API key in your profile settings.');
      }
      
      const response = await sendMessage(
        currentChat.model, 
        updatedMessages.slice(0, index + 1),
        undefined,
        apiKey
      );
      
      addMessage(currentChat.id, response);
    } catch (error) {
      console.error('Error:', error);
      if (error instanceof Error && error.message.includes('API key')) {
        setApiKeyMissing(true);
        toast.error('API key is required. Please add your OpenRouter API key in your profile settings.');
      } else {
        toast.error('Failed to get AI response');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() && !imageUrl.trim() && uploadedFiles.length === 0 && !fileUploads.some(f => f.type === 'pdf' && f.status === 'success')) return;

    // Check if API key is set up
    if (apiKeyMissing) {
      toast.error('API key is required. Please add your OpenRouter API key in your profile settings.');
      return;
    }

    // Prepare message content
    const messageContent = [];
    
    // Add text content
    if (input.trim()) {
      messageContent.push({ type: 'text', text: input });
    }
    
    // Add image URL if provided
    if (imageUrl) {
      messageContent.push({ type: 'image_url', image_url: { url: imageUrl } });
    }
    
    // Add uploaded images
    uploadedFiles.forEach(url => {
      messageContent.push({ type: 'image_url', image_url: { url } });
    });
    
    // Add PDF content
    const pdfUploads = fileUploads.filter(f => f.type === 'pdf' && f.status === 'success' && f.pdfText);
    if (pdfUploads.length > 0) {
      // Add PDF content as text
      const pdfTexts = pdfUploads.map(pdf => 
        `[PDF: ${pdf.file.name}]\n${pdf.pdfText}`
      ).join('\n\n');
      
      if (input.trim()) {
        // If there's already text input, append PDF content
        messageContent[0].text += '\n\n' + pdfTexts;
      } else {
        // Otherwise add as new text content
        messageContent.push({ type: 'text', text: pdfTexts });
      }
    }

    const userMessage: Message = {
      role: 'user',
      content: messageContent
    };

    addMessage(currentChat.id, userMessage);
    setInput('');
    setImageUrl('');
    setUploadedFiles([]);
    setFileUploads([]);
    setIsLoading(true);

    abortControllerRef.current = new AbortController();

    try {
      // Get user's API key and preferences
      const { data: profileData } = await supabase
        .from('profiles')
        .select('api_key, preferences')
        .eq('user_id', user.id)
        .single();
      
      const useCustomApi = profileData?.preferences?.use_custom_api ?? true;
      const apiKey = useCustomApi ? profileData?.api_key : undefined;
      
      if (useCustomApi && !apiKey) {
        throw new Error('API key is required. Please add your OpenRouter API key in your profile settings.');
      }
      
      const response = await sendMessage(
        currentChat.model,
        [...currentChat.messages, userMessage],
        abortControllerRef.current.signal,
        apiKey
      );
      
      addMessage(currentChat.id, response);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Request was cancelled');
      } else if (error instanceof Error && error.message.includes('API key')) {
        setApiKeyMissing(true);
        toast.error('API key is required. Please add your OpenRouter API key in your profile settings.');
      } else {
        console.error('Error:', error);
        toast.error('Failed to get AI response');
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const openPdfPreview = (url: string) => {
    setPdfPreviewUrl(url);
  };

  const closePdfPreview = () => {
    setPdfPreviewUrl(null);
    setIsPdfFullscreen(false);
  };

  const togglePdfFullscreen = () => {
    setIsPdfFullscreen(!isPdfFullscreen);
  };

  const openProfileSettings = () => {
    // This would typically open the profile settings modal
    // For now, we'll just show a toast with instructions
    toast((t) => (
      <div>
        <p className="font-medium">API Key Required</p>
        <p className="text-sm mt-1">Please add your OpenRouter API key in your profile settings.</p>
        <div className="mt-2 flex justify-end">
          <button
            onClick={() => toast.dismiss(t.id)}
            className="bg-blue-500 text-white px-3 py-1 rounded-md text-sm"
          >
            Got it
          </button>
        </div>
      </div>
    ), { duration: 5000 });
  };

  if (!currentChat) {
    return null;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-gray-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <ModelSelector
          currentModel={currentChat.model}
          onModelChange={handleModelChange}
        />
        <div className="text-sm text-gray-600">
          {currentModel?.supportsImages ? 'Supports images & PDFs' : 'Text only'}
        </div>
      </div>

      {apiKeyMissing && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <Key className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <strong>API Key Required:</strong> Please add your OpenRouter API key in your profile settings to use this application.
              </p>
              <div className="mt-2">
                <button
                  onClick={openProfileSettings}
                  className="text-sm font-medium text-yellow-700 hover:text-yellow-600 underline"
                >
                  Go to Profile Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {currentChat.messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            } message-animate-in`}
          >
            <div
              className={`max-w-[80%] rounded-2xl p-6 relative group shadow-soft ${
                message.role === 'user'
                  ? 'bg-primary-600 text-white'
                  : 'bg-white text-gray-800'
              }`}
            >
              {message.role === 'user' && (
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEditingMessage(index)}
                    className="text-white/70 hover:text-white p-1"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {editingMessageIndex === index ? (
                <div className="flex flex-col space-y-2">
                  <textarea
                    value={editMessageContent}
                    onChange={(e) => setEditMessageContent(e.target.value)}
                    className="bg-white text-gray-900 rounded-xl p-3 min-h-[100px] w-full border border-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setEditingMessageIndex(null)}
                      className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleEditMessage(index)}
                      className="px-4 py-2 text-sm bg-primary-500 text-white rounded-lg hover:bg-primary-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                Array.isArray(message.content) ? (
                  <div className="space-y-4">
                    {message.content.map((content, i) => (
                      content.type === 'text' ? (
                        <ReactMarkdown
                          key={i}
                          className={` prose ${message.role === 'user' ? 'prose-invert' : ''} max-w-none`}
                          components={{
                            code({ node, inline, className, children, ...props }) {
                              const match = /language-(\w+)/.exec(className || '');
                              return !inline && match ? (
                                <SyntaxHighlighter
                                  style={atomDark}
                                  language={match[1]}
                                  PreTag="div"
                                  {...props}
                                >
                                  {String(children).replace(/\n$/, '')}
                                </SyntaxHighlighter>
                              ) : (
                                <code className={className} {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                          {content.text || ''}
                        </ReactMarkdown>
                      ) : (
                        <img
                          key={i}
                          src={content.image_url?.url}
                          alt="User uploaded"
                          className="max-w-full rounded-lg shadow-md"
                          loading="lazy"
                        />
                      )
                    ))}
                  </div>
                ) : (
                  <ReactMarkdown
                    className={`prose ${message.role === 'user' ? 'prose-invert' : ''} max-w-none`}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={atomDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      }
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                )
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl p-6 flex items-center space-x-4 shadow-soft">
              <Loader className="w-6 h-6 animate-spin text-primary-500" />
              <button
                onClick={handleStopGeneration}
                className="flex items-center space-x-2 text-red-500 hover:text-red-600"
              >
                <StopCircle className="w-5 h-5" />
                <span>Stop generating</span>
              </button>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="p-6 border-t border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto">
          {currentModel?.supportsImages && (
            <>
              <div className="flex items-center space-x-2 mb-4">
                <input
                  type="text"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL here..."
                  className="flex-1 bg-gray-100 text-gray-900 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg p-2 transition-colors"
                  title="Upload image or PDF"
                >
                  <Image className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/gif,image/webp,application/pdf"
                  className="hidden"
                  multiple
                />
              </div>

              {/* File Upload Preview */}
              {fileUploads.length > 0 && (
                <div className="mb-4 space-y-2">
                  {fileUploads.map((upload) => (
                    <div
                      key={upload.id}
                      className="flex items-center bg-gray-100 rounded-lg p-2 relative"
                    >
                      {upload.type === 'image' ? (
                        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-3 flex-shrink-0">
                          <img
                            src={upload.previewUrl}
                            alt="Preview"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden mr-3 flex-shrink-0 flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {upload.file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {(upload.file.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <div className="flex space-x-1">
                            {upload.status === 'success' && upload.type === 'pdf' && (
                              <button
                                type="button"
                                onClick={() => openPdfPreview(upload.publicUrl!)}
                                className="text-blue-500 hover:text-blue-600 p-1"
                                title="Preview PDF"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (upload.status === 'success') {
                                  removeUploadedFile(upload.publicUrl!);
                                } else {
                                  cancelUpload(upload.id);
                                }
                              }}
                              className="text-red-500 hover:text-red-600 p-1"
                              title="Remove"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        {upload.status === 'uploading' && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div
                              className="bg-blue-500 h-1.5 rounded-full"
                              style={{ width: `${upload.progress}%` }}
                            ></div>
                          </div>
                        )}
                        {upload.status === 'error' && (
                          <p className="text-xs text-red-500 mt-1 flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            {upload.error || 'Upload failed'}
                          </p>
                        )}
                        {upload.status === 'success' && (
                          <p className="text-xs text-green-500 mt-1 flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Uploaded successfully
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Uploaded Images Preview */}
              {uploadedFiles.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {uploadedFiles.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Uploaded ${index + 1}`}
                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadedFile(url)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          <div className="flex items-center space-x-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${currentModel?.name || 'AI'}...`}
              className="flex-1 bg-gray-100 text-gray-900 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none min-h-[60px]"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />
            <button
              type="submit"
              disabled={isLoading || (!input.trim() && !imageUrl && uploadedFiles.length === 0 && !fileUploads.some(f => f.type === 'pdf' && f.status === 'success'))}
              className="bg-primary-600 hover:bg-primary-700 text-white rounded-lg p-3 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </div>
      </form>

      {/* PDF Preview Modal */}
      {pdfPreviewUrl && (
        <div className={`fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center ${isPdfFullscreen ? 'p-0' : 'p-8'}`}>
          <div className={`bg-white rounded-lg overflow-hidden flex flex-col ${isPdfFullscreen ? 'w-full h-full' : 'max-w-4xl max-h-[90vh] w-full'}`}>
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">PDF Preview</h3>
              <div className="flex space-x-2">
                <button
                  onClick={togglePdfFullscreen}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  {isPdfFullscreen ? (
                    <Minimize2 className="w-5 h-5" />
                  ) : (
                    <Maximize2 className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={closePdfPreview}
                  className="text-gray-500 hover:text-gray-700 p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <iframe
                src={`${pdfPreviewUrl}#toolbar=0`}
                className="w-full h-full"
                title="PDF Preview"
              ></iframe>
            </div>
            <div className="p-4 border-t border-gray-200 flex justify-between">
              <a
                href={pdfPreviewUrl}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-blue-600 hover:text-blue-800"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </a>
              <button
                onClick={closePdfPreview}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
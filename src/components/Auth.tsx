import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../lib/supabase';
import { User } from 'lucide-react';

export function Auth() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-500 p-3 rounded-full">
            <User className="w-8 h-8 text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-bold text-white mb-2 text-center">
          Welcome to SANDY GPT
        </h1>
        <p className="text-gray-400 text-center mb-8">
          Sign in to start chatting with AI
        </p>
        
        <SupabaseAuth
          supabaseClient={supabase}
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#3b82f6',
                  brandAccent: '#2563eb',
                  inputBackground: '#374151',
                  inputText: '#ffffff',
                  inputPlaceholder: '#9CA3AF',
                  messageText: '#ffffff',
                  messageTextDanger: '#EF4444',
                  anchorTextColor: '#60A5FA',
                  dividerBackground: '#4B5563'
                },
                space: {
                  inputPadding: '0.75rem',
                  buttonPadding: '0.75rem'
                },
                borderWidths: {
                  buttonBorderWidth: '0px',
                  inputBorderWidth: '1px'
                },
                radii: {
                  borderRadiusButton: '0.5rem',
                  buttonBorderRadius: '0.5rem',
                  inputBorderRadius: '0.5rem'
                }
              }
            },
            style: {
              button: {
                fontSize: '0.875rem',
                fontWeight: '500'
              },
              input: {
                fontSize: '0.875rem'
              },
              label: {
                color: '#D1D5DB',
                fontSize: '0.875rem',
                marginBottom: '0.5rem'
              }
            }
          }}
          providers={[]}
          redirectTo={window.location.origin}
        />
      </div>
    </div>
  );
}
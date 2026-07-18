/**
 * Root layout component for the Signal Clone application.
 */

'use client';

import { useEffect, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { initializeAuth } from '@/store/authStore';
import { getSocket, disconnectSocket } from '@/lib/socket';
import './globals.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Initialize auth from localStorage
    initializeAuth();

    // Small delay to ensure auth state is hydrated
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => {
      clearTimeout(timer);
      disconnectSocket();
    };
  }, []);

  if (!isReady) {
    return (
      <html lang="en">
        <body className="bg-white">
          <div className="flex h-screen items-center justify-center">
            <div className="w-8 h-8 border-4 border-signal-blue border-t-transparent rounded-full animate-spin" />
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <title>Signal Clone</title>
        <meta name="description" content="Secure messaging platform" />
      </head>
      <body className="bg-white text-gray-900 antialiased">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#1B1B1B',
                color: '#fff',
                borderRadius: '8px',
              },
            }}
          />
        </QueryClientProvider>
      </body>
    </html>
  );
}
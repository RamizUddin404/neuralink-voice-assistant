import type {Metadata} from 'next';
import './globals.css';
import { AuthProvider } from '@/components/auth-provider';
import { Sidebar } from '@/components/sidebar';
import { BottomNav } from '@/components/bottom-nav';

export const metadata: Metadata = {
  title: 'Neuralink Voice Assistant',
  description: 'Full control phone on voice command',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-50 h-screen flex overflow-hidden" suppressHydrationWarning>
        <AuthProvider>
          <div className="hidden md:flex h-full">
            <Sidebar />
          </div>
          <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
            {children}
          </main>
          <BottomNav />
        </AuthProvider>
      </body>
    </html>
  );
}

'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from './auth-provider';
import { Mic, MessageSquare, Image as ImageIcon, Video, LogOut, LogIn, BrainCircuit, Headphones, Cpu, UserCircle } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/neural', label: 'Neural Bridge', icon: Cpu },
  { href: '/live', label: 'Neuralink Voice', icon: Mic },
  { href: '/chat', label: 'AI Chat', icon: MessageSquare },
  { href: '/vision', label: 'Vision & Media', icon: ImageIcon },
  { href: '/create', label: 'Create', icon: Video },
  { href: '/audio', label: 'Audio Tools', icon: Headphones },
  { href: '/profile', label: 'Profile & Training', icon: UserCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, signIn, signOut } = useAuth();

  return (
    <div className="w-64 bg-zinc-900 border-r border-zinc-800 flex flex-col h-full shrink-0">
      <div className="p-6 flex items-center gap-3 border-b border-zinc-800">
        <BrainCircuit className="w-8 h-8 text-indigo-500" />
        <h1 className="font-bold text-lg tracking-tight text-zinc-100">Neuralink</h1>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'flex items-center gap-3 px-4 py-3 rounded-xl transition-colors',
                isActive
                  ? 'bg-indigo-500/10 text-indigo-400 font-medium'
                  : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-zinc-800">
        <div className="flex items-center gap-3 overflow-hidden p-2 bg-zinc-800/50 rounded-xl">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-medium text-zinc-300 truncate">Guest User</span>
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-bold">Offline Mode</span>
          </div>
        </div>
      </div>
    </div>
  );
}

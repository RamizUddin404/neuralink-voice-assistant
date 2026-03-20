'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mic, MessageSquare, Image as ImageIcon, Video, BrainCircuit, Headphones, Cpu, UserCircle } from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
  { href: '/neural', label: 'Neural', icon: Cpu },
  { href: '/live', label: 'Voice', icon: Mic },
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/vision', label: 'Vision', icon: ImageIcon },
  { href: '/create', label: 'Create', icon: Video },
  { href: '/profile', label: 'Profile', icon: UserCircle },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 flex justify-around items-center p-2 z-50">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'flex flex-col items-center gap-1 p-2 rounded-lg transition-colors',
              isActive
                ? 'text-indigo-400'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

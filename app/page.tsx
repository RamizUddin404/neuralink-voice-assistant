import Link from 'next/link';
import { BrainCircuit, Mic, MessageSquare, Video, Image as ImageIcon, Cpu } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center p-8 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-4xl w-full text-center z-10 space-y-8">
        <div className="flex justify-center mb-12">
          <div className="w-24 h-24 bg-zinc-900 border border-zinc-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-indigo-500/20">
            <BrainCircuit className="w-12 h-12 text-indigo-500" />
          </div>
        </div>

        <h1 className="text-6xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-500">
          Neuralink Voice Assistant
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
          Full control of your digital life through advanced voice commands, real-time AI conversations, and multimodal understanding.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-16">
          {[
            { href: '/neural', icon: Cpu, title: 'Neural Bridge', desc: 'Translate voice to phone signals' },
            { href: '/live', icon: Mic, title: 'Neuralink Voice', desc: 'Real-time conversational AI' },
            { href: '/chat', icon: MessageSquare, title: 'AI Chat', desc: 'Deep thinking & web search' },
          ].map((feature) => (
            <Link
              key={feature.href}
              href={feature.href}
              className="group p-6 bg-zinc-900/50 border border-zinc-800 rounded-2xl hover:bg-zinc-800 hover:border-indigo-500/50 transition-all duration-300 text-left"
            >
              <feature.icon className="w-8 h-8 text-indigo-400 mb-4 group-hover:scale-110 transition-transform" />
              <h3 className="font-semibold text-lg text-zinc-100 mb-2">{feature.title}</h3>
              <p className="text-sm text-zinc-500">{feature.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

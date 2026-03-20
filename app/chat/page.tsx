'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { Send, Loader2, BrainCircuit, MapPin, Search, MessageSquare } from 'lucide-react';
import Markdown from 'react-markdown';

export default function ChatPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<{ role: 'user' | 'model'; text: string; thinking?: boolean }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [useSearch, setUseSearch] = useState(false);
  const [useMaps, setUseMaps] = useState(false);
  const [useThinking, setUseThinking] = useState(false);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const chatRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading || !aiRef.current) return;

    const userText = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userText }]);
    setIsLoading(true);

    try {
      if (!chatRef.current) {
        let model = 'gemini-3.1-pro-preview';
        if (useMaps) model = 'gemini-2.5-flash';
        else if (!useThinking && !useSearch) model = 'gemini-3.1-flash-lite-preview';
        
        const tools: any[] = [];
        if (useSearch && !useMaps) tools.push({ googleSearch: {} });
        if (useMaps) tools.push({ googleMaps: {} });
        
        const config: any = {};
        if (tools.length > 0) config.tools = tools;
        if (useThinking && !useMaps) {
          config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
        }

        chatRef.current = aiRef.current.chats.create({
          model,
          config: Object.keys(config).length > 0 ? config : undefined,
        });
      }
      
      const response = await chatRef.current.sendMessage({ message: userText });
      
      setMessages(prev => [...prev, { role: 'model', text: response.text || 'No response.' }]);
    } catch (error: any) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: `Error: ${error.message}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">Please sign in to use AI Chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Chat</h1>
          <p className="text-sm text-zinc-400">Powered by Gemini 3.1 Pro</p>
        </div>
        
        {/* Toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => { setUseThinking(!useThinking); setUseMaps(false); chatRef.current = null; }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              useThinking ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50' : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
            }`}
          >
            <BrainCircuit className="w-4 h-4" />
            Deep Think
          </button>
          <button
            onClick={() => { setUseSearch(!useSearch); setUseMaps(false); chatRef.current = null; }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              useSearch ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
            }`}
          >
            <Search className="w-4 h-4" />
            Web Search
          </button>
          <button
            onClick={() => { setUseMaps(!useMaps); setUseThinking(false); setUseSearch(false); chatRef.current = null; }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              useMaps ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50' : 'bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Maps
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4">
            <MessageSquare className="w-12 h-12 opacity-20" />
            <p>Start a conversation. Toggle features above to enhance responses.</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-sm' 
                  : 'bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-bl-sm'
              }`}>
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                ) : (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <Markdown>{msg.text}</Markdown>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl rounded-bl-sm px-6 py-4 flex items-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>{useThinking ? 'Thinking deeply...' : 'Generating response...'}</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-zinc-950 border-t border-zinc-800">
        <form onSubmit={handleSend} className="max-w-4xl mx-auto relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-6 pr-16 py-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-zinc-100 placeholder:text-zinc-600"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserCircle, Save, Plus, Trash2, Loader2, Mic, Settings, BrainCircuit } from 'lucide-react';
import { motion } from 'motion/react';

type CustomCommand = {
  command: string;
  action: string;
};

type UserPreferences = {
  wakeWord: string;
  voiceStyle: string;
  speechRate: number;
  speechPatterns: string;
  customCommands: CustomCommand[];
  openRouteApiKey: string;
  geminiApiKey: string;
};

const VOICE_STYLES = [
  { id: 'Zephyr', name: 'Zephyr (Calm & Professional)' },
  { id: 'Puck', name: 'Puck (Energetic & Friendly)' },
  { id: 'Charon', name: 'Charon (Deep & Authoritative)' },
  { id: 'Kore', name: 'Kore (Warm & Empathetic)' },
  { id: 'Fenrir', name: 'Fenrir (Direct & Concise)' },
];

export default function ProfilePage() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  const [prefs, setPrefs] = useState<UserPreferences>({
    wakeWord: 'Neural',
    voiceStyle: 'Zephyr',
    speechRate: 1.0,
    speechPatterns: '',
    customCommands: [],
    openRouteApiKey: '',
    geminiApiKey: '',
  });

  useEffect(() => {
    // Load API Keys from local storage
    const savedOpenRouteKey = localStorage.getItem('NEXT_PUBLIC_OPENROUTE_API_KEY');
    const savedGeminiKey = localStorage.getItem('NEXT_PUBLIC_GEMINI_API_KEY');
    
    if (savedOpenRouteKey || savedGeminiKey) {
      setPrefs(prev => ({ 
        ...prev, 
        openRouteApiKey: savedOpenRouteKey || '',
        geminiApiKey: savedGeminiKey || ''
      }));
    }

    if (!user || user.uid === 'guest') {
      setIsLoading(false);
      return;
    }

    const fetchPrefs = async () => {
      try {
        const docRef = doc(db, 'userPreferences', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setPrefs({
            wakeWord: data.wakeWord || 'Neural',
            voiceStyle: data.voiceStyle || 'Zephyr',
            speechRate: data.speechRate || 1.0,
            speechPatterns: data.speechPatterns || '',
            customCommands: data.customCommands || [],
            openRouteApiKey: data.openRouteApiKey || '',
            geminiApiKey: data.geminiApiKey || '',
          });
        }
      } catch (error) {
        console.error('Error fetching preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrefs();
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Always save API Keys to local storage
    localStorage.setItem('NEXT_PUBLIC_OPENROUTE_API_KEY', prefs.openRouteApiKey);
    localStorage.setItem('NEXT_PUBLIC_GEMINI_API_KEY', prefs.geminiApiKey);

    if (!user || user.uid === 'guest') {
        setMessage({ type: 'success', text: 'Preferences updated locally (Guest Mode).' });
        return;
    }
    
    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const docRef = doc(db, 'userPreferences', user.uid);
      await setDoc(docRef, {
        userId: user.uid,
        wakeWord: prefs.wakeWord,
        voiceStyle: prefs.voiceStyle,
        speechRate: prefs.speechRate,
        speechPatterns: prefs.speechPatterns,
        customCommands: prefs.customCommands,
        updatedAt: serverTimestamp(),
      });
      setMessage({ type: 'success', text: 'Preferences saved successfully.' });
    } catch (error) {
      console.error('Error saving preferences:', error);
      setMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    }
  };

  const addCustomCommand = () => {
    if (prefs.customCommands.length >= 50) return;
    setPrefs({
      ...prefs,
      customCommands: [...prefs.customCommands, { command: '', action: '' }]
    });
  };

  const updateCustomCommand = (index: number, field: 'command' | 'action', value: string) => {
    const newCommands = [...prefs.customCommands];
    newCommands[index][field] = value;
    setPrefs({ ...prefs, customCommands: newCommands });
  };

  const removeCustomCommand = (index: number) => {
    const newCommands = [...prefs.customCommands];
    newCommands.splice(index, 1);
    setPrefs({ ...prefs, customCommands: newCommands });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <UserCircle className="w-8 h-8 text-indigo-500" />
            Profile & Training
          </h1>
          <p className="text-zinc-400">Personalize your assistant&apos;s behavior, voice, and understanding.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Basic Settings */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Core Identity
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Wake Word</label>
                <input
                  type="text"
                  value={prefs.wakeWord}
                  onChange={(e) => setPrefs({ ...prefs, wakeWord: e.target.value })}
                  maxLength={50}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 placeholder:text-zinc-600"
                  placeholder="e.g., Neural, Computer, Jarvis"
                />
                <p className="text-xs text-zinc-500">The name you use to activate the assistant.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Voice Style</label>
                <select
                  value={prefs.voiceStyle}
                  onChange={(e) => setPrefs({ ...prefs, voiceStyle: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 appearance-none"
                >
                  {VOICE_STYLES.map(style => (
                    <option key={style.id} value={style.id}>{style.name}</option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500">The synthesized voice personality.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Speech Rate ({prefs.speechRate.toFixed(1)}x)</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={prefs.speechRate}
                  onChange={(e) => setPrefs({ ...prefs, speechRate: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-zinc-500">Adjust the speed of the assistant&apos;s voice.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Speech Rate ({prefs.speechRate.toFixed(1)}x)</label>
                <input
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.1"
                  value={prefs.speechRate}
                  onChange={(e) => setPrefs({ ...prefs, speechRate: parseFloat(e.target.value) })}
                  className="w-full h-2 bg-zinc-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                />
                <p className="text-xs text-zinc-500">Adjust the speed of the assistant&apos;s voice.</p>
              </div>
            </div>
          </div>

          {/* Speech Patterns Training */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Mic className="w-5 h-5 text-indigo-400" />
              Speech Patterns & Context
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">How do you usually speak?</label>
              <textarea
                value={prefs.speechPatterns}
                onChange={(e) => setPrefs({ ...prefs, speechPatterns: e.target.value })}
                maxLength={2000}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 placeholder:text-zinc-600 resize-none"
                placeholder="e.g., I speak quickly and use a lot of technical jargon. When I say 'ping', I mean send a quick message. I often mumble when I'm tired."
              />
              <p className="text-xs text-zinc-500">This helps the AI better transcribe and interpret your specific way of speaking.</p>
            </div>
          </div>

          {/* Custom Commands */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                Custom Command Macros
              </h2>
              <button
                type="button"
                onClick={addCustomCommand}
                disabled={prefs.customCommands.length >= 50}
                className="flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-200 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                Add Macro
              </button>
            </div>

            {prefs.customCommands.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-zinc-800 rounded-xl">
                <p className="text-zinc-500 text-sm">No custom commands defined yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {prefs.customCommands.map((cmd, index) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={index} 
                    className="flex gap-4 items-start bg-zinc-950 p-4 rounded-xl border border-zinc-800"
                  >
                    <div className="flex-1 space-y-4 md:space-y-0 md:flex md:gap-4">
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-zinc-500">When I say...</label>
                        <input
                          type="text"
                          value={cmd.command}
                          onChange={(e) => updateCustomCommand(index, 'command', e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 text-sm"
                          placeholder="e.g., Lockdown mode"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <label className="text-xs font-medium text-zinc-500">Assistant should...</label>
                        <input
                          type="text"
                          value={cmd.action}
                          onChange={(e) => updateCustomCommand(index, 'action', e.target.value)}
                          required
                          className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 text-sm"
                          placeholder="e.g., Turn off all lights and lock doors"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCustomCommand(index)}
                      className="mt-6 p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
            <h2 className="text-lg font-semibold text-zinc-100 flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              Advanced Settings
            </h2>
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Gemini API Key</label>
              <input
                type="password"
                value={prefs.geminiApiKey}
                onChange={(e) => setPrefs({ ...prefs, geminiApiKey: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 placeholder:text-zinc-600"
                placeholder="Enter your Google Gemini API Key"
              />
              <p className="text-xs text-zinc-500">Required for AI intelligence. Get one from Google AI Studio.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">OpenRouteService API Key</label>
              <input
                type="password"
                value={prefs.openRouteApiKey}
                onChange={(e) => setPrefs({ ...prefs, openRouteApiKey: e.target.value })}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 placeholder:text-zinc-600"
                placeholder="Enter your OpenRouteService API Key"
              />
              <p className="text-xs text-zinc-500">Required for map navigation features. Key is stored locally on this device.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center gap-2">
              {message.text && (
                <span className={`text-sm ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {message.text}
                </span>
              )}
            </div>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white px-6 py-3 rounded-xl transition-colors font-medium"
            >
              {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Save Preferences
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

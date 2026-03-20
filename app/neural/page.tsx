'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { GoogleGenAI, Type } from '@google/genai';
import { Mic, Send, Cpu, Smartphone, Mail, Music, Clock, Loader2, ArrowRight, CheckCircle2, MessageSquare, BrainCircuit, Settings2, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getDirections } from '@/lib/openroute';

type PhoneState = {
  activeApp: 'home' | 'mail' | 'music' | 'clock' | 'maps';
  appData: any;
};

type NeuralSignal = {
  action: string;
  targetApp: string;
  parameters: Record<string, string>;
  confidence: number;
};

export default function NeuralBridgePage() {
  const { user } = useAuth();
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [signal, setSignal] = useState<NeuralSignal | null>(null);
  const [phoneState, setPhoneState] = useState<PhoneState>({ activeApp: 'home', appData: null });
  const [pipelineStep, setPipelineStep] = useState<number>(0); // 0: idle, 1: voice, 2: nlp, 3: neural, 4: phone
  const [speechRate, setSpeechRate] = useState<number>(1.0);
  
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    }
    
    // Load saved speech rate
    const savedRate = localStorage.getItem('neuralink_speech_rate');
    if (savedRate) {
      setSpeechRate(parseFloat(savedRate));
    }
  }, []);

  const handleSpeechRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newRate = parseFloat(e.target.value);
    setSpeechRate(newRate);
    localStorage.setItem('neuralink_speech_rate', newRate.toString());
  };

  const handleCommand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isProcessing || !aiRef.current) return;

    const commandText = input.trim();
    setInput('');
    setIsProcessing(true);
    setSignal(null);
    setPipelineStep(1); // Voice captured

    try {
      // Step 2: NLP Intent Extraction
      await new Promise(r => setTimeout(r, 600));
      setPipelineStep(2);

      const response = await aiRef.current.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: `Translate the following voice command into a structured neural signal for a smartphone OS. 
        Command: "${commandText}"`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              action: { type: Type.STRING, description: "The core action (e.g., COMPOSE_EMAIL, PLAY_MUSIC, SET_ALARM, OPEN_APP, NAVIGATE)" },
              targetApp: { type: Type.STRING, description: "The target application (e.g., mail, music, clock, home, maps)" },
              parameters: { 
                type: Type.OBJECT, 
                description: "Key-value pairs of extracted parameters (e.g., recipient, subject, body, songName, time, destination, origin)" 
              },
              confidence: { type: Type.NUMBER, description: "Confidence score from 0.0 to 1.0" }
            },
            required: ["action", "targetApp", "parameters", "confidence"]
          }
        }
      });

      const parsedSignal = JSON.parse(response.text || '{}') as NeuralSignal;
      
      // Step 3: Neural Signal Mapping
      await new Promise(r => setTimeout(r, 800));
      setSignal(parsedSignal);
      setPipelineStep(3);

      // Step 4: Phone Execution
      await new Promise(r => setTimeout(r, 800));
      setPipelineStep(4);
      
      // Update mock phone state
      const app = parsedSignal.targetApp.toLowerCase();
      if (app.includes('mail') || parsedSignal.action === 'COMPOSE_EMAIL') {
        setPhoneState({ activeApp: 'mail', appData: parsedSignal.parameters });
      } else if (app.includes('music') || parsedSignal.action === 'PLAY_MUSIC') {
        setPhoneState({ activeApp: 'music', appData: parsedSignal.parameters });
      } else if (app.includes('clock') || parsedSignal.action === 'SET_ALARM') {
        setPhoneState({ activeApp: 'clock', appData: parsedSignal.parameters });
      } else if (app.includes('maps') || parsedSignal.action === 'NAVIGATE') {
        // Fetch directions if navigate
        if (process.env.NEXT_PUBLIC_OPENROUTE_API_KEY) {
             // Mock start point (e.g., New York) and end point
             // In a real app, geocoding would happen here. 
             // For now, we just pass the raw destination string to display.
        }
        setPhoneState({ activeApp: 'maps', appData: parsedSignal.parameters });
      } else {
        setPhoneState({ activeApp: 'home', appData: parsedSignal.parameters });
      }

      // Log to Firestore if not guest
      if (user && user.uid !== 'guest') {
        await addDoc(collection(db, 'commands'), {
          userId: user.uid,
          rawText: commandText,
          action: parsedSignal.action,
          targetApp: parsedSignal.targetApp,
          parameters: JSON.stringify(parsedSignal.parameters),
          status: 'executed',
          createdAt: serverTimestamp()
        });
      }

    } catch (error) {
      console.error(error);
      setPipelineStep(0);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 1000);
    }
  };

  const renderPhoneScreen = () => {
    switch (phoneState.activeApp) {
      case 'mail':
        return (
          <div className="flex flex-col h-full bg-white text-black p-4 rounded-[2rem]">
            <div className="flex items-center gap-2 mb-6 text-indigo-600">
              <Mail className="w-5 h-5" />
              <span className="font-semibold">Compose Email</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="border-b pb-2">
                <span className="text-gray-500 mr-2">To:</span>
                {phoneState.appData?.recipient || phoneState.appData?.to || ''}
              </div>
              <div className="border-b pb-2">
                <span className="text-gray-500 mr-2">Subject:</span>
                {phoneState.appData?.subject || ''}
              </div>
              <div className="pt-2 text-gray-800 whitespace-pre-wrap">
                {phoneState.appData?.body || phoneState.appData?.message || ''}
              </div>
            </div>
            <div className="mt-auto flex justify-end">
              <div className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium">Send</div>
            </div>
          </div>
        );
      case 'music':
        return (
          <div className="flex flex-col h-full bg-zinc-900 text-white p-6 rounded-[2rem] items-center justify-center text-center">
            <div className="w-32 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-2xl mb-6 flex items-center justify-center">
              <Music className="w-12 h-12 text-white/80" />
            </div>
            <h3 className="font-bold text-xl mb-1">{phoneState.appData?.song || phoneState.appData?.songName || 'Unknown Track'}</h3>
            <p className="text-zinc-400 text-sm mb-8">{phoneState.appData?.artist || 'Unknown Artist'}</p>
            
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mb-6 overflow-hidden">
              <div className="bg-white w-1/3 h-full rounded-full" />
            </div>
            
            <div className="flex items-center gap-6">
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <div className="w-3 h-3 border-t-2 border-l-2 border-white -rotate-45" />
              </div>
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black">
                <div className="w-4 h-4 border-l-2 border-r-2 border-black" />
              </div>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center">
                <div className="w-3 h-3 border-t-2 border-r-2 border-white rotate-45" />
              </div>
            </div>
          </div>
        );
      case 'clock':
        return (
          <div className="flex flex-col h-full bg-black text-white p-6 rounded-[2rem] items-center justify-center">
            <Clock className="w-12 h-12 text-indigo-500 mb-6" />
            <div className="text-5xl font-light tracking-tight mb-2">
              {phoneState.appData?.time || '07:00'}
            </div>
            <div className="text-zinc-400 text-sm bg-zinc-900 px-4 py-1.5 rounded-full">
              Alarm Set
            </div>
          </div>
        );
      case 'maps':
        return (
          <div className="flex flex-col h-full bg-zinc-100 text-black p-4 rounded-[2rem]">
            <div className="bg-white p-3 rounded-xl shadow-sm mb-4 flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <div className="flex-1">
                <div className="text-xs text-gray-400">Destination</div>
                <div className="font-medium text-sm truncate">{phoneState.appData?.destination || 'Unknown Location'}</div>
              </div>
              <MapPin className="w-4 h-4 text-gray-400" />
            </div>
            
            <div className="flex-1 bg-gray-200 rounded-xl mb-4 relative overflow-hidden flex items-center justify-center">
               {/* Map Placeholder */}
               <div className="absolute inset-0 bg-[url('https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/-74.006,40.7128,12,0/300x400?access_token=pk.placeholder')] opacity-20" />
               <div className="relative z-10 flex flex-col items-center gap-2">
                 <MapPin className="w-8 h-8 text-blue-600 drop-shadow-lg" />
                 <span className="text-xs font-medium text-gray-500 bg-white/80 px-2 py-1 rounded-full backdrop-blur-sm">
                   {phoneState.appData?.destination || 'Destination'}
                 </span>
               </div>
            </div>

            <div className="bg-blue-600 text-white p-3 rounded-xl flex items-center justify-between shadow-lg shadow-blue-500/20">
               <div className="flex flex-col">
                 <span className="text-xs opacity-80">Estimated Time</span>
                 <span className="font-bold">15 min</span>
               </div>
               <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                 <ArrowRight className="w-4 h-4" />
               </div>
            </div>
          </div>
        );
      default:
        return (
          <div className="flex flex-col h-full bg-zinc-900 text-white p-6 rounded-[2rem]">
            <div className="grid grid-cols-4 gap-4 mt-8">
              {[Mail, Music, Clock, MessageSquare, MapPin].map((Icon, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center">
                    <Icon className="w-6 h-6 text-zinc-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Cpu className="w-8 h-8 text-indigo-500" />
            Neural Bridge
          </h1>
          <p className="text-zinc-400">Visualize how voice commands are translated into neural signals for direct OS control.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Input & Pipeline */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Settings */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Settings2 className="w-4 h-4" />
                Assistant Settings
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-zinc-300">Speech Rate (Speed)</label>
                    <span className="text-xs text-indigo-400 font-mono">{speechRate.toFixed(1)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={speechRate}
                    onChange={handleSpeechRateChange}
                    className="w-full h-2 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                  <div className="flex justify-between text-xs text-zinc-500 mt-2">
                    <span>Slower</span>
                    <span>Normal</span>
                    <span>Faster</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4">Voice Input Simulation</h2>
              <form onSubmit={handleCommand} className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="e.g., 'Compose an email to John about the meeting tomorrow'"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-12 pr-16 py-4 focus:outline-none focus:border-indigo-500 transition-all text-zinc-100 placeholder:text-zinc-600"
                  disabled={isProcessing}
                />
                <Mic className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <button
                  type="submit"
                  disabled={!input.trim() || isProcessing}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white rounded-lg transition-colors"
                >
                  {isProcessing && pipelineStep === 1 ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </form>
              <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                {["Play my favorite song", "Set an alarm for 7 AM", "Email Sarah: I'll be late"].map(cmd => (
                  <button 
                    key={cmd}
                    onClick={() => setInput(cmd)}
                    className="whitespace-nowrap text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-full transition-colors"
                  >
                    {cmd}
                  </button>
                ))}
              </div>
            </div>

            {/* Pipeline Visualization */}
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[300px]">
              <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-6">Translation Pipeline</h2>
              
              <div className="space-y-6 relative">
                {/* Connecting Line */}
                <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-zinc-800" />

                <PipelineStep 
                  active={pipelineStep >= 1} 
                  loading={pipelineStep === 1}
                  icon={Mic} 
                  title="Voice Capture" 
                  desc="Audio converted to text stream" 
                />
                <PipelineStep 
                  active={pipelineStep >= 2} 
                  loading={pipelineStep === 2}
                  icon={BrainCircuit} 
                  title="Intent Extraction (LLM)" 
                  desc="Parsing semantics and required parameters" 
                />
                <PipelineStep 
                  active={pipelineStep >= 3} 
                  loading={pipelineStep === 3}
                  icon={Cpu} 
                  title="Neural Signal Mapping" 
                  desc="Translating intent to OS-level API calls" 
                >
                  <AnimatePresence>
                    {signal && pipelineStep >= 3 && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-3 bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs overflow-hidden"
                      >
                        <div className="text-indigo-400 mb-1">{`// NEURAL_PAYLOAD_GENERATED`}</div>
                        <div className="text-emerald-400">ACTION: <span className="text-zinc-300">{signal.action}</span></div>
                        <div className="text-emerald-400">TARGET: <span className="text-zinc-300">{signal.targetApp}</span></div>
                        <div className="text-emerald-400">PARAMS:</div>
                        {Object.entries(signal.parameters).map(([k, v]) => (
                          <div key={k} className="ml-4 text-zinc-400">&quot;{k}&quot;: <span className="text-amber-300">&quot;{typeof v === 'string' ? v : JSON.stringify(v)}&quot;</span></div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </PipelineStep>
                <PipelineStep 
                  active={pipelineStep >= 4} 
                  loading={false}
                  icon={Smartphone} 
                  title="OS Execution" 
                  desc="Action dispatched to target application" 
                />
              </div>
            </div>

          </div>

          {/* Right Column: Phone Mockup */}
          <div className="flex flex-col items-center">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-4 w-full text-left">Target Device</h2>
            <div className="relative w-[300px] h-[600px] bg-zinc-900 rounded-[2.5rem] border-[8px] border-zinc-800 shadow-2xl overflow-hidden flex flex-col">
              {/* Notch */}
              <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-20">
                <div className="w-32 h-6 bg-zinc-800 rounded-b-xl" />
              </div>
              
              {/* Screen Content */}
              <div className="flex-1 relative z-10 pt-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={phoneState.activeApp + JSON.stringify(phoneState.appData)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    {renderPhoneScreen()}
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Home Indicator */}
              <div className="absolute bottom-2 inset-x-0 flex justify-center z-20">
                <div className="w-32 h-1 bg-zinc-600 rounded-full" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function PipelineStep({ active, loading, icon: Icon, title, desc, children }: any) {
  return (
    <div className={`relative flex gap-4 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`relative z-10 w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
        active ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-500'
      }`}>
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (active && !loading && title === 'OS Execution' ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />)}
      </div>
      <div className="pt-2 flex-1">
        <h3 className="font-semibold text-zinc-200">{title}</h3>
        <p className="text-sm text-zinc-500">{desc}</p>
        {children}
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Mic, MicOff, Loader2, BrainCircuit } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

export default function LiveVoicePage() {
  const { user } = useAuth();
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
useEffect(() => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || localStorage.getItem('NEXT_PUBLIC_GEMINI_API_KEY');
  if (apiKey) {
    aiRef.current = new GoogleGenAI({ apiKey });
  }
}, []);

    return () => stopRecording();
  }, []);

  const startRecording = async () => {
    if (!aiRef.current) {
      setError('API key not configured.');
      return;
    }
    
    setIsConnecting(true);
    setError(null);
    setTranscript([]);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { sampleRate: 16000, channelCount: 1 } });
      mediaStreamRef.current = stream;
      
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      
      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;
      
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      source.connect(processor);
      processor.connect(audioCtx.destination);

      const sessionPromise = aiRef.current.live.connect({
        model: "gemini-2.5-flash-native-audio-preview-12-2025",
        callbacks: {
          onopen: () => {
            setIsConnecting(false);
            setIsRecording(true);
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = new Int16Array(inputData.length);
              for (let i = 0; i < inputData.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, Math.floor(inputData[i] * 32768)));
              }
              
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcm16.buffer)));
              
              sessionPromiseRef.current?.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle audio output
            const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              try {
                const binaryString = atob(base64Audio);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                  bytes[i] = binaryString.charCodeAt(i);
                }
                
                // Simple PCM16 decoding for playback
                const pcm16 = new Int16Array(bytes.buffer);
                const float32 = new Float32Array(pcm16.length);
                for (let i = 0; i < pcm16.length; i++) {
                  float32[i] = pcm16[i] / 32768;
                }
                
                const audioBuffer = audioContextRef.current.createBuffer(1, float32.length, 24000);
                audioBuffer.getChannelData(0).set(float32);
                
                const source = audioContextRef.current.createBufferSource();
                source.buffer = audioBuffer;
                
                // Apply speech rate setting
                const savedRate = localStorage.getItem('neuralink_speech_rate');
                if (savedRate) {
                  source.playbackRate.value = parseFloat(savedRate);
                }
                
                source.connect(audioContextRef.current.destination);
                source.start();
              } catch (e) {
                console.error("Audio playback error", e);
              }
            }
            
            // Handle user transcription
            const userText = message.serverContent?.inputTranscription?.text;
            if (userText) {
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'user') {
                  return [...prev.slice(0, -1), { role: 'user', text: last.text + userText }];
                } else {
                  return [...prev, { role: 'user', text: userText }];
                }
              });
            }

            // Handle model transcription
            const modelText = message.serverContent?.outputTranscription?.text || message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (modelText) {
              setTranscript(prev => {
                const last = prev[prev.length - 1];
                if (last && last.role === 'model') {
                  return [...prev.slice(0, -1), { role: 'model', text: last.text + modelText }];
                } else {
                  return [...prev, { role: 'model', text: modelText }];
                }
              });
            }
          },
          onerror: (err) => {
            console.error("Live API Error:", err);
            setError("Connection error occurred.");
            stopRecording();
          },
          onclose: () => {
            stopRecording();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
          },
          systemInstruction: "You are Neuralink, an advanced voice assistant. Be concise, helpful, and speak naturally.",
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      });
      
      sessionPromiseRef.current = sessionPromise;

    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to start recording');
      setIsConnecting(false);
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsConnecting(false);
    
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(t => t.stop());
      mediaStreamRef.current = null;
    }
    if (sessionPromiseRef.current) {
      sessionPromiseRef.current.then(session => session.close());
      sessionPromiseRef.current = null;
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">Please sign in to use Neuralink Voice.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8">
      <div className="flex-1 max-w-3xl w-full mx-auto flex flex-col">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold tracking-tight mb-4">Neuralink Voice</h1>
          <p className="text-zinc-400">Real-time conversational AI. Tap to connect.</p>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center relative">
          {/* Visualizer / Status */}
          <div className="relative flex items-center justify-center w-64 h-64 mb-12">
            {isRecording && (
              <>
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping" />
                <div className="absolute inset-4 bg-indigo-500/20 rounded-full animate-pulse" />
              </>
            )}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={isConnecting}
              className={`relative z-10 w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 shadow-red-500/50' 
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/50'
              }`}
            >
              {isConnecting ? (
                <Loader2 className="w-12 h-12 text-white animate-spin" />
              ) : isRecording ? (
                <MicOff className="w-12 h-12 text-white" />
              ) : (
                <Mic className="w-12 h-12 text-white" />
              )}
            </button>
          </div>

          {error && (
            <div className="text-red-400 bg-red-400/10 px-4 py-2 rounded-lg mb-8">
              {error}
            </div>
          )}

          {/* Transcript Log */}
          <div className="w-full max-w-2xl bg-zinc-900/50 rounded-2xl p-6 h-64 overflow-y-auto border border-zinc-800/50">
            {transcript.length === 0 ? (
              <div className="h-full flex items-center justify-center text-zinc-600">
                <BrainCircuit className="w-8 h-8 mr-3 opacity-50" />
                <span>Waiting for connection...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {transcript.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-4 py-2 rounded-2xl max-w-[80%] ${
                      msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-zinc-800 text-zinc-200'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

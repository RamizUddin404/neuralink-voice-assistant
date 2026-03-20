'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { GoogleGenAI, Modality } from '@google/genai';
import { Headphones, Mic, Loader2, Send, Play, Square } from 'lucide-react';

export default function AudioPage() {
  const { user } = useAuth();
  const [mode, setMode] = useState<'tts' | 'transcribe'>('tts');
  
  // TTS State
  const [ttsText, setTtsText] = useState('');
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // Transcribe State
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState<string | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    }
  }, []);

  const handleTTS = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ttsText.trim() || isLoading || !aiRef.current) return;

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);

    try {
      const response = await aiRef.current.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: ttsText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/pcm' });
        // We need to play raw PCM, but HTML5 audio tag doesn't support raw PCM easily.
        // For simplicity in this demo, we'll use AudioContext to play it directly.
        
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const pcm16 = new Int16Array(bytes.buffer);
        const float32 = new Float32Array(pcm16.length);
        for (let i = 0; i < pcm16.length; i++) {
          float32[i] = pcm16[i] / 32768;
        }
        
        const audioBuffer = audioCtx.createBuffer(1, float32.length, 24000);
        audioBuffer.getChannelData(0).set(float32);
        
        const source = audioCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioCtx.destination);
        source.start();
        
        setAudioUrl('playing'); // Just to show UI state
        source.onended = () => setAudioUrl(null);
      } else {
        throw new Error("No audio data returned");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'TTS failed');
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await handleTranscription(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setTranscription(null);
    } catch (err: any) {
      console.error(err);
      setError('Failed to access microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const handleTranscription = async (audioBlob: Blob) => {
    if (!aiRef.current) return;
    setIsLoading(true);
    
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64data = (reader.result as string).split(',')[1];
        
        const response = await aiRef.current!.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64data,
                  mimeType: audioBlob.type,
                }
              },
              { text: "Please transcribe this audio accurately." }
            ]
          }
        });
        
        setTranscription(response.text || 'No transcription available.');
        setIsLoading(false);
      };
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Transcription failed');
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">Please sign in to use Audio Tools.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Audio Tools</h1>
          <p className="text-zinc-400">Generate speech from text or transcribe audio.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-4 p-1 bg-zinc-900 rounded-xl w-fit">
          <button
            onClick={() => setMode('tts')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              mode === 'tts' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Headphones className="w-4 h-4" />
            Text to Speech
          </button>
          <button
            onClick={() => setMode('transcribe')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              mode === 'transcribe' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Mic className="w-4 h-4" />
            Transcribe
          </button>
        </div>

        {error && (
          <div className="text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {mode === 'tts' ? (
          <form onSubmit={handleTTS} className="space-y-4">
            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 resize-none"
              disabled={isLoading || audioUrl !== null}
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!ttsText.trim() || isLoading || audioUrl !== null}
                className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : audioUrl ? (
                  <Headphones className="w-5 h-5 animate-pulse" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {audioUrl ? 'Playing...' : 'Generate Speech'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center p-12 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
              <button
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isLoading}
                className={`w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isRecording 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/50 animate-pulse' 
                    : 'bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-500/50'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isRecording ? <Square className="w-8 h-8 text-white fill-current" /> : <Mic className="w-8 h-8 text-white" />}
              </button>
              <p className="mt-6 text-zinc-400 font-medium">
                {isRecording ? 'Recording... Click to stop' : 'Click to start recording'}
              </p>
            </div>

            {(isLoading || transcription) && (
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[150px]">
                <h2 className="text-lg font-semibold mb-4 text-zinc-200">Transcription Result</h2>
                {isLoading ? (
                  <div className="flex items-center gap-3 text-zinc-500">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                    Transcribing audio...
                  </div>
                ) : (
                  <p className="text-zinc-300 whitespace-pre-wrap">{transcription}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

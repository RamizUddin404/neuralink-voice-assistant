'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { GoogleGenAI } from '@google/genai';
import { Upload, Image as ImageIcon, Video, Loader2, Send, BrainCircuit } from 'lucide-react';
import Markdown from 'react-markdown';

export default function VisionPage() {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
      setResult(null);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = reader.result as string;
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64Data = base64String.split(',')[1];
        resolve(base64Data);
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleAnalyze = async () => {
    if (!file || !prompt.trim() || !aiRef.current) return;

    setIsLoading(true);
    setResult(null);

    try {
      const base64Data = await fileToBase64(file);
      
      const response = await aiRef.current.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              }
            },
            { text: prompt }
          ]
        }
      });

      setResult(response.text || 'No analysis available.');
    } catch (error: any) {
      console.error(error);
      setResult(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">Please sign in to use Vision & Media.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Vision & Media Analysis</h1>
          <p className="text-zinc-400">Upload an image or video to analyze it with Gemini 3.1 Pro.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Upload Section */}
          <div className="space-y-4">
            <div 
              className="border-2 border-dashed border-zinc-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500/50 hover:bg-zinc-900/50 transition-all min-h-[300px]"
              onClick={() => fileInputRef.current?.click()}
            >
              {previewUrl ? (
                file?.type.startsWith('video') ? (
                  <video src={previewUrl} controls className="max-h-64 rounded-lg" />
                ) : (
                  <img src={previewUrl} alt="Preview" className="max-h-64 rounded-lg object-contain" />
                )
              ) : (
                <>
                  <Upload className="w-12 h-12 text-zinc-600 mb-4" />
                  <p className="text-zinc-300 font-medium mb-1">Click to upload media</p>
                  <p className="text-zinc-500 text-sm">Supports images and videos</p>
                </>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept="image/*,video/*" 
                className="hidden" 
              />
            </div>

            {file && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="What do you want to know about this media?"
                  className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100"
                />
                <button
                  onClick={handleAnalyze}
                  disabled={!prompt.trim() || isLoading}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-6 rounded-xl font-medium transition-colors flex items-center gap-2"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  Analyze
                </button>
              </div>
            )}
          </div>

          {/* Results Section */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 min-h-[300px]">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-400" />
              Analysis Result
            </h2>
            
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 py-12">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                <p>Analyzing media...</p>
              </div>
            ) : result ? (
              <div className="prose prose-invert prose-sm max-w-none">
                <Markdown>{result}</Markdown>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 py-12">
                <p>Upload media and ask a question to see results here.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Video, Loader2, Send, Download, Settings2 } from 'lucide-react';

export default function CreatePage() {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<'image' | 'video'>('image');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [imageResolution, setImageResolution] = useState('1K');
  const [videoResolution, setVideoResolution] = useState('720p');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const aiRef = useRef<GoogleGenAI | null>(null);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_GEMINI_API_KEY) {
      aiRef.current = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
    }
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResultUrl(null);

    try {
      if (mode === 'image') {
        // Nano Banana 2 also requires the paid key selection
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
          }
        }
        
        // Re-initialize AI client to pick up the newly selected key
        const currentAi = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
        
        const response = await currentAi.models.generateContent({
          model: 'gemini-3.1-flash-image-preview',
          contents: { parts: [{ text: prompt }] },
          config: {
            imageConfig: { aspectRatio: aspectRatio, imageSize: imageResolution }
          }
        });

        for (const part of response.candidates?.[0]?.content?.parts || []) {
          if (part.inlineData) {
            setResultUrl(`data:image/png;base64,${part.inlineData.data}`);
            break;
          }
        }
      } else {
        // Video generation requires paid key
        if (typeof window !== 'undefined' && (window as any).aistudio) {
          const hasKey = await (window as any).aistudio.hasSelectedApiKey();
          if (!hasKey) {
            await (window as any).aistudio.openSelectKey();
          }
        }
        
        // Re-initialize AI client to pick up the newly selected key
        const currentAi = new GoogleGenAI({ apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY });
        
        // Ensure aspect ratio is valid for video (only 16:9 and 9:16 supported)
        const validVideoAspectRatio = aspectRatio === '16:9' || aspectRatio === '9:16' ? aspectRatio : '16:9';
        
        let operation = await currentAi.models.generateVideos({
          model: 'veo-3.1-fast-generate-preview',
          prompt: prompt,
          config: {
            numberOfVideos: 1,
            resolution: videoResolution,
            aspectRatio: validVideoAspectRatio
          }
        });

        // Poll for completion
        while (!operation.done) {
          await new Promise(resolve => setTimeout(resolve, 5000));
          operation = await currentAi.operations.getVideosOperation({ operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        if (downloadLink) {
          // Fetch the video with the API key
          const response = await fetch(downloadLink, {
            method: 'GET',
            headers: {
              'x-goog-api-key': process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
            },
          });
          const blob = await response.blob();
          setResultUrl(URL.createObjectURL(blob));
        } else {
          throw new Error("Video generation failed or returned no URI.");
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Generation failed. If you cancelled the key selection, please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-zinc-500">Please sign in to use Create.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-zinc-950 p-8 overflow-y-auto">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Create Media</h1>
          <p className="text-zinc-400">Generate stunning images and videos with AI.</p>
        </div>

        {/* Mode Selector */}
        <div className="flex gap-4 p-1 bg-zinc-900 rounded-xl w-fit">
          <button
            onClick={() => setMode('image')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              mode === 'image' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
          <button
            onClick={() => setMode('video')}
            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-medium transition-colors ${
              mode === 'video' ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <Video className="w-4 h-4" />
            Video
          </button>
        </div>

        {/* Presets Configuration */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 space-y-6">
          <div className="flex items-center gap-2 text-zinc-300 font-medium mb-4">
            <Settings2 className="w-5 h-5" />
            Generation Settings
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Aspect Ratio */}
            <div className="space-y-3">
              <label className="text-sm text-zinc-400 font-medium">Aspect Ratio</label>
              <div className="flex flex-wrap gap-2">
                {['1:1', '16:9', '9:16', '4:3', '3:4'].map((ratio) => {
                  // Video only supports 16:9 and 9:16
                  const isDisabled = mode === 'video' && ratio !== '16:9' && ratio !== '9:16';
                  return (
                    <button
                      key={ratio}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setAspectRatio(ratio)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        aspectRatio === ratio
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : isDisabled
                            ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed'
                            : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {ratio}
                    </button>
                  );
                })}
              </div>
              {mode === 'video' && (
                <p className="text-xs text-zinc-500">Video generation only supports 16:9 and 9:16.</p>
              )}
            </div>

            {/* Resolution */}
            <div className="space-y-3">
              <label className="text-sm text-zinc-400 font-medium">Resolution</label>
              <div className="flex flex-wrap gap-2">
                {mode === 'image' ? (
                  ['512px', '1K', '2K', '4K'].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setImageResolution(res)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        imageResolution === res
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {res}
                    </button>
                  ))
                ) : (
                  ['720p', '1080p'].map((res) => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => setVideoResolution(res)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                        videoResolution === res
                          ? 'bg-indigo-600 border-indigo-500 text-white'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                      }`}
                    >
                      {res}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleGenerate} className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={`Describe the ${mode} you want to create...`}
            className="w-full h-32 bg-zinc-900 border border-zinc-800 rounded-2xl p-4 focus:outline-none focus:border-indigo-500 transition-colors text-zinc-100 resize-none"
            disabled={isLoading}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white px-8 py-3 rounded-xl font-medium transition-colors flex items-center gap-2"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Generate {mode === 'image' ? 'Image' : 'Video'}
            </button>
          </div>
        </form>

        {/* Results */}
        {error && (
          <div className="text-red-400 bg-red-400/10 px-4 py-3 rounded-xl">
            {error}
          </div>
        )}

        {isLoading && mode === 'video' && (
          <div className="text-zinc-400 bg-zinc-900/50 px-4 py-3 rounded-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
            Video generation can take a few minutes. Please wait...
          </div>
        )}

        {resultUrl && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Generated Result</h2>
              <a 
                href={resultUrl} 
                download={`generated-${mode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
              >
                <Download className="w-4 h-4" />
                Download
              </a>
            </div>
            
            <div className="rounded-xl overflow-hidden bg-zinc-950 flex items-center justify-center min-h-[300px]">
              {mode === 'image' ? (
                <img src={resultUrl} alt={prompt} className="max-w-full max-h-[600px] object-contain" />
              ) : (
                <video src={resultUrl} controls autoPlay loop className="max-w-full max-h-[600px]" />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

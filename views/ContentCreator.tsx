import React, { useState } from 'react';
import { Sparkles, Instagram, Video, Image as ImageIcon, Copy, CheckCircle2, Loader2, AlertCircle, Facebook, Linkedin, Twitter, Smartphone } from 'lucide-react';
import { CompanyData } from '../types';
import { GoogleGenAI } from '@google/genai';

console.log("DEBUG ENV:", {
  processEnvGemini: typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : 'process undefined',
  importMetaEnvGemini: import.meta.env?.VITE_GEMINI_API_KEY,
  importMetaEnv: import.meta.env
});

interface ContentCreatorProps {
  companyData: CompanyData;
}

export const ContentCreator: React.FC<ContentCreatorProps> = ({ companyData }) => {
  const [topic, setTopic] = useState('');
  const [network, setNetwork] = useState<'instagram' | 'facebook' | 'tiktok' | 'linkedin' | 'twitter'>('instagram');
  const [format, setFormat] = useState<'post' | 'reels' | 'stories'>('post');
  const [tone, setTone] = useState<'professional' | 'casual' | 'fun' | 'emotional'>('casual');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const debugInfo = JSON.stringify({
    processEnvGemini: typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : 'process undefined',
    importMetaEnvGemini: import.meta.env?.VITE_GEMINI_API_KEY,
    importMetaEnv: import.meta.env
  }, null, 2);

  const handleGenerate = async () => {
    if (!topic.trim()) {
      setError('Por favor, digite um tema para o conteúdo.');
      return;
    }

    setIsGenerating(true);
    setError('');
    setGeneratedContent('');
    setCopied(false);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const prompt = `Você é um especialista em marketing digital.
Crie um conteúdo para a rede social ${network.toUpperCase()} com as seguintes características:
- Formato: ${format === 'post' ? 'Post de Feed (Legenda envolvente)' : format === 'reels' ? 'Roteiro e Legenda para Vídeo Curto' : 'Ideia e Texto para Stories/Status'}
- Tom de voz: ${tone === 'professional' ? 'Profissional e focado em vendas' : tone === 'casual' ? 'Casual e próximo do cliente' : tone === 'fun' ? 'Divertido e engajador' : 'Emocional e inspirador'}
- Tema/Produto: ${topic}
- Nome do Negócio: ${companyData.name || 'Meu Negócio'}

O conteúdo deve ser pronto para copiar e colar, incluindo emojis adequados e hashtags relevantes no final.
Se for Vídeo ou Stories, inclua uma breve sugestão visual (o que mostrar na tela) antes do texto/legenda.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      if (response.text) {
        setGeneratedContent(response.text);
      } else {
        throw new Error('Não foi possível gerar o conteúdo.');
      }
    } catch (err: any) {
      console.error('Erro ao gerar conteúdo:', err);
      setError(err.message || 'Ocorreu um erro ao gerar o conteúdo. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(generatedContent);
    } else {
      // Fallback para navegadores sem suporte ao clipboard API ou contextos não seguros
      const textArea = document.createElement("textarea");
      textArea.value = generatedContent;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn pb-24">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-4 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-2xl shadow-lg">
          <Sparkles size={32} />
        </div>
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight">Criador de Conteúdo IA</h2>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">Gere posts incríveis em segundos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-pink-50 space-y-6">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Sobre o que você quer falar?</label>
            <textarea
              className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-600 min-h-[120px] resize-none focus:ring-4 focus:ring-pink-50 transition-all"
              placeholder="Ex: Lançamento da nova coleção de dia das mães, mostrando os bastidores da produção..."
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rede Social</label>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'instagram', icon: Instagram, activeClass: 'bg-pink-50 border-pink-200 text-pink-600 shadow-sm' },
                { id: 'facebook', icon: Facebook, activeClass: 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' },
                { id: 'tiktok', icon: Smartphone, activeClass: 'bg-gray-50 border-gray-200 text-gray-600 shadow-sm' },
                { id: 'linkedin', icon: Linkedin, activeClass: 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' },
                { id: 'twitter', icon: Twitter, activeClass: 'bg-sky-50 border-sky-200 text-sky-600 shadow-sm' }
              ].map((n) => (
                <button
                  key={n.id}
                  onClick={() => setNetwork(n.id as any)}
                  className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all ${network === n.id ? n.activeClass : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
                  title={n.id.charAt(0).toUpperCase() + n.id.slice(1)}
                >
                  <n.icon size={20} />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Formato</label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setFormat('post')}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${format === 'post' ? 'bg-pink-50 border-pink-200 text-pink-600 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <ImageIcon size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Post / Feed</span>
              </button>
              <button
                onClick={() => setFormat('reels')}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${format === 'reels' ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <Video size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Vídeo Curto</span>
              </button>
              <button
                onClick={() => setFormat('stories')}
                className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${format === 'stories' ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm' : 'bg-white border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <Smartphone size={24} />
                <span className="text-[10px] font-black uppercase tracking-widest text-center">Stories</span>
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tom de Voz</label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { id: 'casual', label: 'Casual & Próximo' },
                { id: 'professional', label: 'Profissional & Vendas' },
                { id: 'fun', label: 'Divertido & Engajador' },
                { id: 'emotional', label: 'Emocional & Inspirador' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTone(t.id as any)}
                  className={`p-3 rounded-xl border text-xs font-bold transition-all ${tone === t.id ? 'bg-gray-800 border-gray-800 text-white shadow-md' : 'bg-white border-gray-100 text-gray-500 hover:bg-gray-50'}`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-4 bg-red-50 text-red-500 rounded-2xl flex items-center gap-3 text-sm font-bold">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={isGenerating || !topic.trim()}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-pink-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Gerando Mágica...
              </>
            ) : (
              <>
                <Sparkles size={18} />
                Gerar Conteúdo
              </>
            )}
          </button>
        </div>

        {/* Resultado */}
        <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-purple-50 flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-black text-gray-800 uppercase tracking-widest">Resultado</h3>
            {generatedContent && (
              <button
                onClick={handleCopy}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${copied ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
              >
                {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            )}
          </div>

          <div className="flex-1 bg-gray-50 rounded-2xl p-6 border border-gray-100 overflow-y-auto custom-scrollbar relative">
            {isGenerating ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 space-y-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-pink-100 rounded-full"></div>
                  <div className="w-16 h-16 border-4 border-pink-500 rounded-full border-t-transparent animate-spin absolute inset-0"></div>
                  <Sparkles size={20} className="absolute inset-0 m-auto text-pink-500 animate-pulse" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest animate-pulse">A IA está escrevendo...</p>
              </div>
            ) : generatedContent ? (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-p:text-gray-600 font-medium whitespace-pre-wrap">
                {generatedContent}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-300 space-y-4 opacity-50">
                <Sparkles size={48} />
                <p className="text-xs font-black uppercase tracking-widest text-center max-w-[200px]">Seu conteúdo gerado aparecerá aqui</p>
                <pre className="text-[8px] text-left w-full overflow-auto mt-4 p-2 bg-gray-100 rounded text-gray-800">{debugInfo}</pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

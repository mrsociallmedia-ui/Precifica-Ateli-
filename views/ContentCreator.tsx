
import React, { useState, useEffect } from 'react';
import { 
  Instagram, 
  Layout, 
  Image, 
  Video, 
  X, 
  Sparkles, 
  RefreshCw, 
  Send,
  MessageSquare,
  ArrowRight,
  Heart,
  Link2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { CompanyData } from '../types';

interface ContentCreatorProps {
  companyData: CompanyData;
}

export const ContentCreator: React.FC<ContentCreatorProps> = ({ companyData }) => {
  const [contentType, setContentType] = useState<'post' | 'story' | 'reel'>('post');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [isGeneratingPost, setIsGeneratingPost] = useState(false);
  const [postContext, setPostContext] = useState('');
  const [isInstagramConnected, setIsInstagramConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  // Simular verificação de conexão
  useEffect(() => {
    const connected = localStorage.getItem('instagram_connected') === 'true';
    setIsInstagramConnected(connected);
  }, []);

  const handleConnectInstagram = () => {
    setIsConnecting(true);
    // Simulação de OAuth
    setTimeout(() => {
      localStorage.setItem('instagram_connected', 'true');
      setIsInstagramConnected(true);
      setIsConnecting(false);
      alert('Instagram conectado com sucesso!');
    }, 2000);
  };

  const handleDisconnectInstagram = () => {
    if (confirm('Deseja desconectar sua conta do Instagram?')) {
      localStorage.removeItem('instagram_connected');
      setIsInstagramConnected(false);
    }
  };

  const handleGeneratePost = async () => {
    if (!selectedFile && !postContext) {
      alert('Por favor, insira uma foto/vídeo ou descreva o contexto do post.');
      return;
    }

    setIsGeneratingPost(true);
    try {
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      
      const parts: any[] = [];
      
      if (selectedFile) {
        parts.push({
          inlineData: {
            data: selectedFile.split(',')[1],
            mimeType: fileType === 'video' ? "video/mp4" : "image/png"
          }
        });
      }

      const prompt = `Como uma especialista em marketing para artesãs de papelaria personalizada, crie um conteúdo para o Instagram do tipo ${contentType.toUpperCase()}.
      O arquivo enviado é um(a) ${fileType === 'video' ? 'VÍDEO' : 'FOTO'}.
      Contexto adicional: ${postContext}
      O nome do meu ateliê é ${companyData.name}.
      
      Se houver um arquivo, analise-o e crie uma legenda/roteiro que combine com o que está sendo mostrado.
      
      Para POST: Crie uma legenda engajadora com hashtags.
      Para STORY: Crie uma sequência de 3 a 5 falas ou textos para sobrepor na imagem/vídeo.
      Para REEL: Crie um roteiro curto (hook, conteúdo, CTA) e sugestão de áudio/música.
      
      Mantenha um tom amigável, profissional e criativo.`;

      parts.push({ text: prompt });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ parts }],
      });

      setAiGeneratedText(response.text || 'Não foi possível gerar o conteúdo.');
    } catch (error) {
      console.error('Erro ao gerar post com IA:', error);
      alert('Erro ao gerar conteúdo. Verifique sua conexão e chave de API.');
    } finally {
      setIsGeneratingPost(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit for demo
        alert('O arquivo é muito grande. Por favor, envie um arquivo de até 10MB.');
        return;
      }

      const isVideo = file.type.startsWith('video/');
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedFile(reader.result as string);
        setFileType(isVideo ? 'video' : 'image');
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Criador de <span className="text-pink-500">Conteúdo</span></h2>
          <p className="text-gray-400 font-medium">Use IA para transformar suas fotos e vídeos em posts de alto engajamento.</p>
        </div>
        <div className="flex items-center gap-3">
          {isInstagramConnected ? (
            <div className="flex items-center gap-3 bg-white p-2 pr-4 rounded-full border border-green-100 shadow-sm">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white shadow-lg">
                <CheckCircle2 size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none">Conectado</span>
                <button onClick={handleDisconnectInstagram} className="text-[8px] font-bold text-gray-400 hover:text-red-500 text-left">Desconectar</button>
              </div>
            </div>
          ) : (
            <button 
              onClick={handleConnectInstagram}
              disabled={isConnecting}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:shadow-lg transition-all disabled:opacity-50"
            >
              {isConnecting ? <RefreshCw className="animate-spin" size={14} /> : <Link2 size={14} />}
              Conectar Instagram
            </button>
          )}
          <div className="bg-white p-3 px-6 rounded-full border border-pink-50 shadow-sm flex items-center gap-3">
            <Instagram className="text-pink-500" size={18} />
            <span className="text-sm font-black text-gray-700">Marketing Digital</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-sm border border-pink-50">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <div className="space-y-8">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4">O que vamos criar hoje?</label>
              <div className="flex p-1.5 bg-gray-100 rounded-[2rem]">
                {(['post', 'story', 'reel'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setContentType(type)}
                    className={`flex-1 py-4 rounded-[1.5rem] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${contentType === type ? 'bg-white text-pink-600 shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {type === 'post' ? <Layout size={16} /> : 
                     type === 'story' ? <Image size={16} /> : 
                     <Video size={16} />}
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Foto ou Vídeo do seu Trabalho</label>
              <div className="relative group">
                {selectedFile ? (
                  <div className="relative rounded-[3rem] overflow-hidden aspect-square border-8 border-pink-50 shadow-2xl bg-black">
                    {fileType === 'video' ? (
                      <video src={selectedFile} controls className="w-full h-full object-contain" />
                    ) : (
                      <img src={selectedFile} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    <button 
                      onClick={() => {
                        setSelectedFile(null);
                        setFileType(null);
                      }}
                      className="absolute top-6 right-6 p-3 bg-red-500 text-white rounded-full shadow-xl hover:bg-red-600 transition-all hover:scale-110 z-10"
                    >
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center aspect-square border-4 border-dashed border-gray-100 rounded-[3rem] bg-gray-50/50 hover:bg-pink-50 hover:border-pink-200 transition-all cursor-pointer group">
                    <div className="p-6 bg-white rounded-3xl shadow-sm mb-4 group-hover:scale-110 transition-transform">
                      <div className="flex gap-2">
                        <Image size={32} className="text-gray-300 group-hover:text-pink-500" />
                        <Video size={32} className="text-gray-300 group-hover:text-purple-500" />
                      </div>
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Clique para enviar foto ou vídeo</p>
                    <p className="text-[10px] font-bold text-gray-300 mt-2">Imagens ou Vídeos até 10MB</p>
                    <input type="file" className="hidden" accept="image/*,video/*" onChange={handleFileUpload} />
                  </label>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Contexto ou Detalhes (Opcional)</label>
              <textarea 
                value={postContext}
                onChange={(e) => setPostContext(e.target.value)}
                placeholder="Ex: Topo de bolo tema Safari para o primeiro aninho do Leo. Usei papel lamicote dourado e camadas de 180g..."
                className="w-full bg-gray-50 border border-gray-100 rounded-[2rem] p-6 text-sm text-gray-700 font-medium focus:ring-4 focus:ring-pink-500/10 focus:border-pink-500 outline-none transition-all h-32 resize-none"
              />
            </div>

            <button 
              onClick={handleGeneratePost}
              disabled={isGeneratingPost}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-black py-5 rounded-[2rem] hover:shadow-2xl hover:shadow-pink-500/20 transition-all flex items-center justify-center gap-3 disabled:opacity-50 active:scale-[0.98]"
            >
              {isGeneratingPost ? (
                <>
                  <RefreshCw className="animate-spin" size={24} />
                  <span>A IA está criando...</span>
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  <span>Gerar Conteúdo Mágico</span>
                </>
              )}
            </button>
          </div>

          <div className="flex flex-col h-full">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1 mb-4">Sugestão da Calculiê IA</label>
            <div className="flex-1 bg-gray-900 rounded-[3rem] p-10 text-white relative overflow-hidden group min-h-[500px] flex flex-col shadow-2xl">
              <div className="absolute -top-20 -right-20 p-20 opacity-5 group-hover:scale-110 transition-transform">
                <Instagram size={300} />
              </div>
              
              {aiGeneratedText ? (
                <div className="relative z-10 h-full flex flex-col">
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-pink-500 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Legenda Gerada</span>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(aiGeneratedText);
                        alert('Copiado! Agora é só colar no Instagram.');
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-[10px] font-black text-pink-400 transition-all border border-white/5"
                    >
                      <Layout size={14} /> Copiar Texto
                    </button>
                  </div>
                  <textarea 
                    value={aiGeneratedText}
                    onChange={(e) => setAiGeneratedText(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-base leading-relaxed font-medium resize-none custom-scrollbar pr-4 text-white/90"
                  />
                  <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-between">
                    <p className="text-[10px] font-bold text-white/30 italic">Dica: Você pode editar o texto acima antes de copiar.</p>
                    <div className="flex gap-3">
                      {isInstagramConnected && (
                        <button 
                          onClick={() => alert('Post enviado para o Instagram! (Simulação)')}
                          className="flex items-center gap-2 px-6 py-2 bg-pink-500 hover:bg-pink-600 rounded-full text-[10px] font-black text-white transition-all shadow-lg shadow-pink-500/20"
                        >
                          <Send size={14} /> Publicar Agora
                        </button>
                      )}
                      <div className="flex gap-2">
                        <div className="w-8 h-8 rounded-full bg-pink-500/20 flex items-center justify-center"><Heart size={14} className="text-pink-500" /></div>
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center"><Send size={14} className="text-blue-500" /></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 opacity-30">
                  <div className="p-8 bg-white/5 rounded-full border border-white/5">
                    <Sparkles size={64} className="text-pink-500" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black uppercase tracking-widest">Aguardando seu arquivo</p>
                    <p className="text-[10px] font-bold max-w-[200px] mx-auto leading-relaxed">Insira uma foto ou vídeo ao lado para que a IA possa criar um conteúdo incrível para você.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

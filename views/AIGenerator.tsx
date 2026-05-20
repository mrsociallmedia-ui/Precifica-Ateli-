import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  Instagram, 
  Facebook, 
  BookOpen, 
  Store, 
  Copy, 
  Check, 
  RefreshCw, 
  AlertTriangle, 
  Wand2, 
  ShoppingBag, 
  Flame, 
  FileText,
  Volume2,
  CalendarDays,
  PenTool,
  HelpCircle
} from 'lucide-react';
import { Product, Project, Customer, CompanyData } from '../types';

interface AIGeneratorProps {
  products: Product[];
  projects: Project[];
  customers: Customer[];
  companyData: CompanyData;
}

type GeneratorTab = 'instagram' | 'facebook' | 'catalog' | 'marketplace';

const TONES = [
  { id: 'inspirador', name: '✏️ Afetuoso & Artesanal', desc: 'Foco no afeto, história do feito à mão e valor afetivo.' },
  { id: 'sofisticado', name: '✨ Elegante & Premium', desc: 'Foco em acabamento de luxo, sofisticação e qualidade única.' },
  { id: 'divertido', name: '🎉 Alegre & Caloroso', desc: 'Tom amigável, criativo, cheio de entusiasmo e energia.' },
  { id: 'comercial', name: '🔥 Persuasivo & Promocional', desc: 'Foco em conversão de vendas, gatilhos mentais e ofertas.' },
  { id: 'direto', name: '📝 Simples & Informativo', desc: 'Textos objetivos, fáceis de ler e focados em especificações.' },
];

const CTAS = [
  { id: 'whatsapp', label: '📞 Encomendar via WhatsApp', text: 'Chame no WhatsApp para encomendar o seu!' },
  { id: 'direct', label: '💬 Enviar Direct / Mensagem', text: 'Envie um direct para garantir a sua vaga!' },
  { id: 'catalog', label: '📖 Ver Catálogo Completo', text: 'Acesse nosso catálogo completo no link da bio!' },
  { id: 'store', label: '🛍️ Comprar pela nossa loja', text: 'Garanta o seu diretamente em nosso canal oficial de vendas!' },
  { id: 'custom', label: '✍️ Personalizado...', text: '' },
  { id: 'none', label: '❌ Sem CTA específico', text: '' },
];

export const AIGenerator: React.FC<AIGeneratorProps> = ({ 
  products, 
  projects, 
  companyData 
}) => {
  const [activeTab, setActiveTab] = useState<GeneratorTab>('instagram');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [customDescription, setCustomDescription] = useState<string>('');
  const [selectedTone, setSelectedTone] = useState<string>('inspirador');
  const [selectedCta, setSelectedCta] = useState<string>('whatsapp');
  const [customCtaText, setCustomCtaText] = useState<string>('');
  
  // Instagram specific
  const [instaPostType, setInstaPostType] = useState<'feed' | 'stories' | 'reels'>('feed');
  const [instaTheme, setInstaTheme] = useState<'lancamento' | 'bastidores' | 'institucional' | 'promocao'>('lancamento');

  // Marketplace/Sales platform specific
  const [targetPlatform, setTargetPlatform] = useState<'shopee' | 'elo7' | 'general'>('general');

  // Generator states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedResult, setGeneratedResult] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copiedSection, setCopiedSection] = useState<'all' | 'body' | 'hashtags' | 'title' | null>(null);

  // Auto-frequent inputs from context
  const handleProductSelect = (id: string) => {
    setSelectedProductId(id);
    setSelectedProjectId('');
    if (id) {
      const prod = products.find(p => p.id === id);
      if (prod) {
        let desc = `Produto: ${prod.name}\nCategoria: ${prod.category}`;
        if (prod.description) {
          desc += `\nDetalhes do produto: ${prod.description}`;
        }
        setCustomDescription(desc);
      }
    } else {
      setCustomDescription('');
    }
  };

  const handleProjectSelect = (id: string) => {
    setSelectedProjectId(id);
    setSelectedProductId('');
    if (id) {
      const proj = projects.find(p => p.id === id);
      if (proj) {
        let desc = `Peça Artesanal: ${proj.theme}\n`;
        if (proj.celebrantName) {
          desc += `Feito especialmente para: ${proj.celebrantName} (Idade: ${proj.celebrantAge || 'N/A'})\n`;
        }
        if (proj.description) {
          desc += `Descrição do Pedido: ${proj.description}\n`;
        }
        if (proj.notes) {
          desc += `Observações e detalhes: ${proj.notes}`;
        }
        setCustomDescription(desc);
      }
    } else {
      setCustomDescription('');
    }
  };

  // Helper values to parse structure of results
  const parsedSections = useMemo(() => {
    if (!generatedResult) return null;
    
    // Tentativa de separar Título, Corpo e Hashtags de forma limpa caso o Gemini use marcadores
    const result = {
      title: '',
      body: generatedResult,
      hashtags: '',
      tips: ''
    };

    const lines = generatedResult.split('\n');
    let cTitle: string[] = [];
    let cBody: string[] = [];
    let cHashtags: string[] = [];
    let cTips: string[] = [];
    let currentMode: 'title' | 'body' | 'hashtags' | 'tips' = 'body';

    lines.forEach(line => {
      const cleanLine = line.trim();
      const lower = cleanLine.toLowerCase();

      if (lower.startsWith('**título**') || lower.startsWith('título:') || lower.startsWith('**titulo**') || lower.startsWith('titulo:')) {
        currentMode = 'title';
        cTitle.push(cleanLine.replace(/^\*\*título\*\*:\s*|^\*\*Título\*\*:\s*|^título:\s*|^Título:\s*|^\*\*titulo\*\*:\s*|^titulo:\s*/i, ''));
      } else if (lower.startsWith('**legendas**') || lower.startsWith('**legenda**') || lower.startsWith('legenda:') || lower.startsWith('**texto**') || lower.startsWith('texto principal:')) {
        currentMode = 'body';
        cBody.push(cleanLine.replace(/^\*\*legenda\*\*:\s*|^\*\*Legenda\*\*:\s*|^legenda:\s*|^Legenda:\s*/i, ''));
      } else if (cleanLine.startsWith('#') || lower.startsWith('**hashtags**') || lower.startsWith('hashtags:')) {
        currentMode = 'hashtags';
        if (!cleanLine.toLowerCase().startsWith('**hashtags**') && !cleanLine.toLowerCase().startsWith('hashtags:')) {
          cHashtags.push(cleanLine);
        } else {
          cHashtags.push(cleanLine.replace(/^\*\*hashtags\*\*:\s*|^hashtags:\s*/i, ''));
        }
      } else if (lower.startsWith('**dicas**') || lower.startsWith('dicas de foto:') || lower.startsWith('sugestão:') || lower.startsWith('**sugestão**')) {
        currentMode = 'tips';
        cTips.push(cleanLine);
      } else {
        if (currentMode === 'title') cTitle.push(cleanLine);
        else if (currentMode === 'hashtags') cHashtags.push(cleanLine);
        else if (currentMode === 'tips') cTips.push(cleanLine);
        else cBody.push(line); // preserva quebras em branco para o corpo
      }
    });

    if (cTitle.length > 0) result.title = cTitle.join('\n').trim();
    if (cBody.length > 0) result.body = cBody.join('\n').trim();
    if (cHashtags.length > 0) result.hashtags = cHashtags.join('\n').trim();
    if (cTips.length > 0) result.tips = cTips.join('\n').trim();

    return result;
  }, [generatedResult]);

  const handleCopy = (text: string, section: 'all' | 'body' | 'hashtags' | 'title') => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedResult('');
    setErrorMsg('');

    const toneType = TONES.find(t => t.id === selectedTone);
    const ctaItem = CTAS.find(c => c.id === selectedCta);
    const ctaTextFinal = selectedCta === 'custom' ? customCtaText : (ctaItem?.text || '');

    // Construção rica do Prompt baseado no objetivo selecionado
    let promptText = `Você é uma especialista em marketing digital e copywriter sênior focada em ATELIÊS DE ARTESANATO e PAPELARIA CRIATIVA DE LUXO. No Brasil, chamam de artesanato afetivo.
O nome do ateliê é "${companyData.name || 'Nosso Ateliê'}".
`;

    if (activeTab === 'instagram') {
      promptText += `Gere um conteúdo de altíssimo engajamento para o INSTAGRAM.
Tipo de post: ${instaPostType === 'feed' ? 'Legenda para Post no Feed (Carrossel ou Foto única)' : instaPostType === 'stories' ? 'Ideia estruturada de Sequência de Stories (Roteiro em passos com sugestão visual)' : 'Guias de Legenda e Gancho para Reel/Short Vídeo'}.
Tema do post: `;
      if (instaTheme === 'lancamento') promptText += 'Apresentação de novidade, novidade em estoque ou novo lançamento do ateliê.';
      if (instaTheme === 'bastidores') promptText += 'Mostrar o processo produtivo de forma acolhedora, o capricho, a mesa cheia de carinho, a dedicação de quem faz com as mãos.';
      if (instaTheme === 'institucional') promptText += 'Comemoração, história da marca, valores, por que escolher o feito à mão.';
      if (instaTheme === 'promocao') promptText += 'Condição especial de fomento de vendas no mês, brinde especial ou desconto de indicação.';
    } else if (activeTab === 'facebook') {
      promptText += `Gere uma publicação atraente e otimizada para o FACEBOOK (focada em Grupos de Venda Local, Marketplace ou Página Institucional do Ateliê).
Gere um texto acolhedor, mas claramente focado em apresentar os diferenciais e facilitar o contato rápido.`;
    } else if (activeTab === 'catalog') {
      promptText += `Gere uma descrição elegante e persuasiva de catálogo.
Ideal para ser colocada abaixo da foto do produto em um Catálogo de Vendas em PDF/Site, destacando todas as belezas e sensações táteis do artesanato afetivo de forma curta, poética mas vendedora.`;
    } else if (activeTab === 'marketplace') {
      promptText += `Gere um cadastro completo de produto altamente otimizado para Plataformas de Vendas Digitais (${targetPlatform === 'shopee' ? 'Shopee (tom dinâmico, SEO direto)' : targetPlatform === 'elo7' ? 'Elo7 (artesanato e personalizáveis, tom criativo e exclusivo)' : 'E-commerce Geral e Mercado Livre'}).
Estruture a resposta contendo exatamente:
1. **Título Otimizado (SEO)**: Curto, matador, com palavras-chaves que clientes realmente buscam.
2. **Descrição do Produto**: Super organizada com marcadores/bullets (Tamanho, Benefício, Como encomendar).
3. **Seção de FAQ rápido / Cuidados com a peça**: Como guardar, prazos de envio.
4. **Palavras-chave recomendadas (Tags)**: Separadas por vírgulas.`;
    }

    promptText += `\n\n=== CONTEXTO DO PRODUTO/PEÇA ===
${customDescription || 'Artesanato geral feito com muito carinho, personalizado sob encomenda.'}
`;

    if (toneType) {
      promptText += `\nTom da Escrita: Utilizar o estilo de comunicação "${toneType.name}". (${toneType.desc})\n`;
    }

    if (ctaTextFinal) {
      promptText += `Call To Action (Chamada para Ação): Garanta que o final do texto principal tenha uma chamada clara direcionando para: "${ctaTextFinal}".\n`;
    }

    promptText += `\nDiretrizes de formatação fundamentais:
- Use emojis moderadamente de forma charmosa (relacionados ao mundo do artesanato, festas, presentes 🌸✂️✨🎈🧸).
- Use quebras de parágrafos limpas para facilitar a leitura no celular.
- Se houver hashtags, inclua-as no final de forma organizada.
- NUNCA mencione códigos técnicos, nem use termos artificiais de prompt como "Aqui está o texto:". Comece a entregar a resposta formatada diretamente para facilitar a cópia rápida.
- Seja autêntico. Escreva como uma artesã apaixonada pelo que faz.`;

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: promptText,
          model: 'gemini-3.5-flash'
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Falha ao conectar com o serviço de IA.');
      }

      setGeneratedResult(data.text);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Houve um erro inesperado ao se comunicar com a IA. Verifique se suas chaves e conexão estão ativas.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-20">
      {/* Title block */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 tracking-tight flex items-center gap-3">
            <span className="p-3 bg-pink-500 text-white rounded-3xl shrink-0 shadow-lg shadow-pink-500/20">
              <Sparkles size={24} />
            </span>
            Gerador de Conteúdo <span className="text-pink-500">com IA</span>
          </h2>
          <p className="text-gray-400 font-medium mt-1">
            Crie copys profissionais e personalizadas com o apoio de Inteligência Artificial para divulgar o seu Ateliê.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Panel Form Fields */}
        <div className="xl:col-span-5 bg-white p-6 md:p-8 rounded-[2.5rem] border border-pink-50/50 shadow-sm space-y-8">
          
          {/* Channel selection wrapper */}
          <div className="space-y-3">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
              1. Escolha onde vai postar ou usar o texto
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setActiveTab('instagram'); setGeneratedResult(''); }}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all justify-center ${activeTab === 'instagram' ? 'bg-pink-50 border-pink-200 text-pink-600 shadow-sm shadow-pink-500/5' : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <Instagram size={16} /> Instagram
              </button>
              
              <button
                type="button"
                onClick={() => { setActiveTab('facebook'); setGeneratedResult(''); }}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all justify-center ${activeTab === 'facebook' ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm shadow-blue-500/5' : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <Facebook size={16} /> Facebook
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('catalog'); setGeneratedResult(''); }}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all justify-center ${activeTab === 'catalog' ? 'bg-purple-50 border-purple-200 text-purple-600 shadow-sm shadow-purple-500/5' : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <BookOpen size={16} /> Catálogo PDF
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('marketplace'); setGeneratedResult(''); }}
                className={`flex items-center gap-2.5 p-3.5 rounded-2xl border text-xs font-black uppercase tracking-wider transition-all justify-center ${activeTab === 'marketplace' ? 'bg-orange-50 border-orange-200 text-orange-600 shadow-sm shadow-orange-500/5' : 'bg-gray-50/50 border-gray-100 text-gray-400 hover:bg-gray-50'}`}
              >
                <Store size={16} /> Plataformas
              </button>
            </div>
          </div>

          {/* Context Autofill section */}
          <div className="space-y-4 pt-4 border-t border-gray-100/70">
            <div className="flex justify-between items-center">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                2. Puxar dados cadastrados (Opcional)
              </label>
              {(selectedProductId || selectedProjectId) && (
                <button
                  type="button"
                  onClick={() => { setSelectedProductId(''); setSelectedProjectId(''); setCustomDescription(''); }}
                  className="text-[9px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                >
                  Limpar Dados
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <select
                  value={selectedProductId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-600 focus:outline-none transition-colors"
                >
                  <option value="">-- Usar Produto --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-400 mt-1 pl-1">Escolha um de seus produtos cadastrados</p>
              </div>

              <div>
                <select
                  value={selectedProjectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  className="w-full bg-gray-50 hover:bg-gray-100/70 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-600 focus:outline-none transition-colors"
                >
                  <option value="">-- Usar Encomenda --</option>
                  {projects.filter(p => p.status !== 'pending').slice(0, 15).map((p) => (
                    <option key={p.id} value={p.id}>{p.theme || p.name}</option>
                  ))}
                </select>
                <p className="text-[9px] text-gray-400 mt-1 pl-1">Ou encomendas ativas</p>
              </div>
            </div>
          </div>

          {/* Details area */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
              3. O que você quer enfatizar na peça?
            </label>
            <textarea
              value={customDescription}
              onChange={(e) => setCustomDescription(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 text-xs font-bold text-gray-700 focus:outline-none min-h-24 max-h-48 custom-scrollbar resize-none placeholder-gray-300"
              placeholder="Ex: Topo de bolo lindo com tema de Ursinho Baloeiro, feito com papel fotográfico fosco de alta gramatura e relevo 3D especial..."
            />
          </div>

          {/* Platform customized parameters */}
          {activeTab === 'instagram' && (
            <div className="space-y-4 pt-4 border-t border-gray-100/75 animate-fadeIn">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                    Modo Instagram
                  </label>
                  <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100/50">
                    <button
                      type="button"
                      onClick={() => setInstaPostType('feed')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center ${instaPostType === 'feed' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}
                    >
                      Feed
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstaPostType('stories')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center ${instaPostType === 'stories' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}
                    >
                      Stories
                    </button>
                    <button
                      type="button"
                      onClick={() => setInstaPostType('reels')}
                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center ${instaPostType === 'reels' ? 'bg-pink-500 text-white' : 'text-gray-400'}`}
                    >
                      Reels/Vídeo
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                    Tema da Divulgação
                  </label>
                  <select
                    value={instaTheme}
                    onChange={(e: any) => setInstaTheme(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs font-bold text-gray-600 focus:outline-none focus:ring-1 focus:ring-pink-300"
                  >
                    <option value="lancamento">🚀 Lançamento / Peça Pronta</option>
                    <option value="bastidores">✂️ Bastidores / Passo a Passo</option>
                    <option value="institucional">💖 Carinho / Feito à Mão</option>
                    <option value="promocao">🎁 Promoção ou Novidade</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'marketplace' && (
            <div className="space-y-4 pt-4 border-t border-gray-100/75 animate-fadeIn">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5">
                Escolha o Canal de Venda Alvo
              </label>
              <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100/50">
                <button
                  type="button"
                  onClick={() => setTargetPlatform('general')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center ${targetPlatform === 'general' ? 'bg-gray-800 text-white' : 'text-gray-400'}`}
                >
                  Geral / Loja Própria
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPlatform('shopee')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center ${targetPlatform === 'shopee' ? 'bg-orange-500 text-white/95' : 'text-gray-400'}`}
                >
                  Formatos Shopee
                </button>
                <button
                  type="button"
                  onClick={() => setTargetPlatform('elo7')}
                  className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all text-center ${targetPlatform === 'elo7' ? 'bg-blue-500 text-white/95' : 'text-gray-400'}`}
                >
                  Formatos Elo7
                </button>
              </div>
            </div>
          )}

          {/* Vibe / Tone configuration */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
              4. Escolha o estilo da sua voz (Vibe)
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 border border-gray-50 rounded-2xl p-1 bg-gray-50/20 custom-scrollbar">
              {TONES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTone(t.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-bold transition-all flex flex-col ${selectedTone === t.id ? 'bg-white text-gray-800 border-l-4 border-pink-500 shadow-sm' : 'text-gray-400 hover:bg-gray-100/50 hover:text-gray-600'}`}
                >
                  <span>{t.name}</span>
                  <span className="text-[10px] font-semibold text-gray-400 mt-0.5 leading-none">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* CTA setup */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                5. Chamda para Ação (CTA)
              </label>
              <select
                value={selectedCta}
                onChange={(e) => setSelectedCta(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-600 focus:outline-none"
              >
                {CTAS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </select>
            </div>

            {selectedCta === 'custom' && (
              <div className="space-y-1.5 animate-fadeIn">
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Qual é o seu link ou CTA?
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Clique no link azul do perfil!"
                  value={customCtaText}
                  onChange={(e) => setCustomCtaText(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs font-bold text-gray-700 focus:outline-none"
                />
              </div>
            )}
          </div>

          <button
            type="button"
            disabled={isGenerating}
            onClick={handleGenerate}
            className={`w-full py-4 text-white rounded-2xl flex items-center justify-center gap-2 font-black uppercase text-xs tracking-widest shadow-lg transition-all active:scale-98 disabled:opacity-50 ${activeTab === 'instagram' ? 'bg-pink-500 hover:bg-pink-600 shadow-pink-500/10' : activeTab === 'facebook' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/10' : activeTab === 'catalog' ? 'bg-purple-600 hover:bg-purple-700 shadow-purple-600/10' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/10'}`}
          >
            {isGenerating ? (
              <>
                <RefreshCw className="animate-spin" size={16} /> Criando com IA...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Gerar Texto Personalizado
              </>
            )}
          </button>
        </div>

        {/* Results Panel Mockup */}
        <div className="xl:col-span-7 space-y-4">
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Copy Gerada e Visualização Prévia
          </p>

          {errorMsg ? (
            <div className="bg-red-50 border border-red-100 p-6 rounded-[2rem] flex items-start gap-3 animate-fadeIn">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
              <div>
                <p className="text-red-700 text-sm font-black uppercase tracking-wider mb-1">Erro de Conexão com Gemini</p>
                <p className="text-red-600 text-xs font-medium leading-relaxed">{errorMsg}</p>
                <p className="text-[10px] text-red-500 mt-2 font-semibold">
                  *Certifique-se de preencher sua GEMINI_API_KEY no menu de configurações do AI Studio (ícone de engrenagem no canto superior direito do seu editor).
                </p>
              </div>
            </div>
          ) : !generatedResult ? (
            <div className="bg-white border border-pink-100/30 p-12 rounded-[3.5rem] shadow-sm flex flex-col items-center justify-center text-center py-20">
              <div className="p-5 bg-pink-50 rounded-full text-pink-400 mb-4 animate-bounce">
                <Wand2 size={32} />
              </div>
              <h4 className="text-gray-700 font-extrabold text-lg">Pronto para encantar?</h4>
              <p className="text-gray-400 font-semibold text-xs mt-2 max-w-sm leading-relaxed">
                Configure os detalhes do seu produto/peça ao lado e clique em "Gerar" para ver a mágica da inteligência artificial acontecer.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Actual Social Mockup representation */}
              {activeTab === 'instagram' && (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm animate-fadeIn max-w-md mx-auto">
                  {/* Top Bar Mockup */}
                  <div className="p-4 flex items-center justify-between border-b border-gray-50 bg-gray-50/20">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-yellow-400 p-0.5">
                        <div className="w-full h-full bg-white rounded-full p-0.5 flex items-center justify-center">
                          <img 
                            src="https://cdn-icons-png.flaticon.com/512/4230/4230588.png" 
                            alt="Ateliê" 
                            className="w-full h-full object-contain filter brightness-95" 
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-black text-gray-800 tracking-tight leading-none">
                          {companyData.name || 'Meu Ateliê'}
                        </p>
                        <p className="text-[9px] text-gray-400 leading-none mt-1">Patrocínio, MG</p>
                      </div>
                    </div>
                    <button className="text-gray-400 font-black">•••</button>
                  </div>

                  {/* Body Post Text Content */}
                  <div className="p-6 space-y-4">
                    {parsedSections?.title && (
                      <h4 className="text-sm font-black text-gray-800 tracking-tight">
                        {parsedSections.title}
                      </h4>
                    )}
                    <div className="text-xs text-gray-600 leading-relaxed whitespace-pre-wrap select-all selection:bg-pink-100">
                      {parsedSections?.body}
                    </div>
                    {parsedSections?.hashtags && (
                      <div className="text-xs text-blue-500 font-black tracking-tight leading-tight select-all selection:bg-pink-100/50">
                        {parsedSections.hashtags}
                      </div>
                    )}
                  </div>

                  {/* Copy Button Floating bar */}
                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-bold select-none uppercase tracking-widest text-[9px]">Amostra do Instagram</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedResult, 'all')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-pink-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-pink-600 transition-all shadow-md active:scale-95"
                    >
                      {copiedSection === 'all' ? (
                        <>
                          <Check size={12} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar Tudo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'facebook' && (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm animate-fadeIn max-w-lg mx-auto">
                  <div className="p-5 flex items-center gap-3 border-b border-gray-100">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-sm uppercase">
                      {(companyData.name || 'A').substring(0,2)}
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-800 leading-none">{companyData.name || 'Meu Ateliê'}</h4>
                      <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest font-black flex items-center gap-1">
                        🌍 Grupos de Vendas • Facebook
                      </p>
                    </div>
                  </div>

                  <div className="p-6 text-xs text-gray-600 whitespace-pre-wrap leading-relaxed select-all selection:bg-blue-50">
                    {generatedResult}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-semibold tracking-wider text-[10px]">Página/Grupo de Artesanato</span>
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedResult, 'all')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-md active:scale-95"
                    >
                      {copiedSection === 'all' ? (
                        <>
                          <Check size={12} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar Tudo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'catalog' && (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-sm animate-fadeIn max-w-md mx-auto">
                  <div className="p-6 bg-purple-50 flex items-center justify-between border-b border-purple-100/40">
                    <div className="flex items-center gap-2 text-purple-700">
                      <BookOpen size={18} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Catálogo de Produtos</span>
                    </div>
                  </div>

                  <div className="p-8">
                    <p className="text-purple-400 font-black uppercase text-[10px] tracking-widest mb-2 select-none">
                      Amostra de Resumo da Peça
                    </p>
                    <div className="text-xs text-gray-600 italic whitespace-pre-wrap leading-relaxed select-all font-medium select-all selection:bg-purple-50">
                      {generatedResult}
                    </div>
                  </div>

                  <div className="p-4 bg-purple-50/50 border-t border-purple-100/40 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedResult, 'all')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-purple-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-purple-700 transition-all shadow-md active:scale-95"
                    >
                      {copiedSection === 'all' ? (
                        <>
                          <Check size={12} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar Tudo
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'marketplace' && (
                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-sm animate-fadeIn">
                  <div className="p-5 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                    <div className="flex items-center gap-2">
                      <Store size={18} className="text-orange-500" />
                      <span className="text-xs font-black uppercase tracking-wider text-gray-700">Canal de Vendas ({targetPlatform.toUpperCase()})</span>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* Rendered structured template */}
                    {parsedSections?.title && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#9ca3af] select-none">
                          <span>Título Recomendado para SEO:</span>
                          <button 
                            onClick={() => handleCopy(parsedSections?.title || '', 'title')}
                            className="text-[9px] hover:text-orange-600 flex items-center gap-1 uppercase"
                          >
                            {copiedSection === 'title' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <p className="bg-gray-50 border border-gray-100 p-3 rounded-xl font-bold text-gray-700 text-sm select-all">
                          {parsedSections?.title || ''}
                        </p>
                      </div>
                    )}

                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#9ca3af] select-none">
                        <span>Descrição Cadastral Otimizada:</span>
                        <button 
                          onClick={() => handleCopy(parsedSections?.body || '', 'body')}
                          className="text-[9px] hover:text-orange-600 flex items-center gap-1 uppercase"
                        >
                          {copiedSection === 'body' ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                      <div className="bg-gray-50 border border-gray-100 p-4 rounded-xl text-xs font-medium text-gray-700 leading-relaxed whitespace-pre-wrap select-all">
                        {parsedSections?.body || ''}
                      </div>
                    </div>

                    {parsedSections?.hashtags && (
                      <div className="space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#9ca3af] select-none">
                          <span>Tags & Palavras-chave:</span>
                          <button 
                            onClick={() => handleCopy(parsedSections?.hashtags || '', 'hashtags')}
                            className="text-[9px] hover:text-orange-600 flex items-center gap-1 uppercase"
                          >
                            {copiedSection === 'hashtags' ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <p className="bg-orange-50 border border-orange-100 p-3 rounded-xl font-black text-orange-700 text-xs select-all">
                          {parsedSections?.hashtags || ''}
                        </p>
                      </div>
                    )}

                    {parsedSections?.tips && (
                      <div className="bg-yellow-50/50 p-4 rounded-2xl border border-yellow-100/50 space-y-1">
                        <span className="text-[10px] font-black text-yellow-800 uppercase tracking-widest">Sugestões e Dicas Extras:</span>
                        <p className="text-xs text-yellow-700 leading-relaxed font-semibold">{parsedSections.tips}</p>
                      </div>
                    )}
                  </div>

                  <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopy(generatedResult, 'all')}
                      className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                    >
                      {copiedSection === 'all' ? (
                        <>
                          <Check size={12} /> Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copiar Todos Blocos
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

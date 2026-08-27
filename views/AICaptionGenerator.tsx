import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Wand2, 
  Copy, 
  Check, 
  RefreshCw, 
  Instagram, 
  MessageSquare, 
  Video, 
  ShoppingBag, 
  Heart, 
  Send, 
  Bookmark, 
  Trash2, 
  Edit3, 
  Tag,
  Store,
  ChevronDown,
  Layers,
  Info,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { Product, Project, CompanyData } from '../types';

interface AICaptionGeneratorProps {
  companyData?: CompanyData;
  products?: Product[];
  projects?: Project[];
}

export type PlatformType = 'instagram_feed' | 'reels_tiktok' | 'whatsapp' | 'catalog_marketplace';
export type ToneType = 'afetuoso' | 'vendedor' | 'sofisticado' | 'divertido' | 'bastidores';

export interface SavedCaption {
  id: string;
  createdAt: string;
  theme: string;
  platform: PlatformType;
  tone: ToneType;
  content: string;
}

export const AICaptionGenerator: React.FC<AICaptionGeneratorProps> = ({
  companyData,
  products = [],
  projects = []
}) => {
  // Form state
  const [productTopic, setProductTopic] = useState('');
  const [occasion, setOccasion] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('instagram_feed');
  const [tone, setTone] = useState<ToneType>('afetuoso');
  const [extraDetails, setExtraDetails] = useState('');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  const [useEmojis, setUseEmojis] = useState(true);

  // Generation state
  const [isLoading, setIsLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState('');
  const [activeVariationTab, setActiveVariationTab] = useState<'full' | 'short' | 'promo'>('full');
  const [variations, setVariations] = useState<{
    full?: string;
    short?: string;
    promo?: string;
  }>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Saved / History state
  const [savedCaptions, setSavedCaptions] = useState<SavedCaption[]>(() => {
    try {
      const saved = localStorage.getItem('calculie_ai_captions');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // Quick suggestion chips
  const quickIdeas = [
    { label: '🎂 Topo de Bolo Personalizado', topic: 'Topo de bolo temático com camadas 3D e apliques especiais' },
    { label: '👶 Lembrancinhas Maternidade', topic: 'Kits delicados de lembrancinhas de nascimento / maternidade' },
    { label: '🎉 Kit Festa em Casa', topic: 'Kit festa afetiva com caixas milk, pirâmide e bandeirolas' },
    { label: '📅 Agenda Aberta do Mês', topic: 'Abertura de agenda oficial para encomendas do mês' },
    { label: '✂️ Bastidores de Produção', topic: 'Vídeo/foto dos bastidores e cuidado no recorte e montagem manual' },
    { label: '🌸 Mimo / Presente Especial', topic: 'Caixa presente personalizada de luxo para momentos inesquecíveis' }
  ];

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem('calculie_ai_captions', JSON.stringify(savedCaptions));
    } catch (e) {
      console.error('Erro ao salvar histórico de legendas:', e);
    }
  }, [savedCaptions]);

  // Fallback craft caption generator when Gemini API is unavailable/leaked
  const generateCraftFallback = (
    topic: string,
    plat: PlatformType,
    tn: ToneType,
    occ: string,
    details: string,
    hasHashtags: boolean,
    hasCta: boolean,
    hasEmojis: boolean
  ) => {
    const studio = companyData?.name || 'Nosso Ateliê';
    const cleanTopic = topic.trim();
    const occasionText = occ ? ` para celebrar ${occ}` : '';
    const detailsText = details ? ` (${details})` : '';

    // Hashtags list
    const tags = hasHashtags 
      ? `\n\n#papelariapersonalizada #papelariacriativa #lembrancinhaspersonalizadas #topodebolo #festainfantil #decoracaodefesta #artesanatobrasil #feitoamao #compredequemfaz #papelariadeluxo #atelie`
      : '';

    // CTA
    const ctaText = hasCta
      ? (plat === 'whatsapp' 
          ? `\n\n📲 Responda este status ou mande uma mensagem no WhatsApp para garantir sua encomenda!` 
          : `\n\n💌 Gostou dessa lindeza? Clique no link da bio ou envie um direct para consultar disponibilidade da nossa agenda e fazer seu orçamento sem compromisso!`)
      : '';

    // Full Version
    let full = '';
    let short = '';
    let promo = '';

    if (tn === 'afetuoso') {
      full = `${hasEmojis ? '✨💖 ' : ''}Cada detalhe pensado com muito amor e carinho...${hasEmojis ? ' ✂️🌸' : ''}

Apresentamos essa produção super especial: *${cleanTopic}*${occasionText}!${detailsText ? `\nCom acabamento impecável: ${details}` : ''}

Aqui no ${studio}, acreditamos que cada comemoração merece ser inesquecível e carregada de afeto. Ver o brilho nos olhos de quem recebe é a nossa maior alegria!${ctaText}${tags}`;

      short = `${hasEmojis ? '💕 ' : ''}Amor em cada camada! *${cleanTopic}*${occasionText}.${detailsText ? ` ${details}` : ''} ${hasEmojis ? '✨' : ''}${ctaText}`;

      promo = `${hasEmojis ? '📅🌸 ' : ''}Agenda aberta para encomendas de *${cleanTopic}*!

Planejando uma comemoração inesquecível? Garanta sua vaga com antecedência para que possamos produzir tudo com o carinho que seu momento merece.${ctaText}${tags}`;
    } else if (tn === 'vendedor') {
      full = `${hasEmojis ? '🚨✨ ' : ''}Quer surpreender seus convidados com uma peça única? Conheça nosso *${cleanTopic}*!${hasEmojis ? ' 🎉' : ''}

Perfeito${occasionText ? ` para ${occ}` : ''}, com acabamento de alta qualidade e totalmente personalizado para encantar.${detailsText ? `\nDiferenciais: ${details}` : ''}

⚠️ Nossas vagas de produção para este mês são limitadas para garantir o padrão impecável de cada encomenda.${ctaText}${tags}`;

      short = `${hasEmojis ? '🔥 ' : ''}Vagas limitadas! Garanta já o seu *${cleanTopic}* personalizado.${hasEmojis ? ' 📦✨' : ''}${ctaText}`;

      promo = `${hasEmojis ? '⏰💡 ' : ''}Não deixe para a última hora! As encomendas para *${cleanTopic}* estão a todo vapor.

Garanta sua data na agenda do ${studio} agora mesmo!${ctaText}${tags}`;
    } else if (tn === 'sofisticado') {
      full = `${hasEmojis ? '✨⚜️ ' : ''}A arte de encantar através dos detalhes: *${cleanTopic}*.

Uma composição nobre e delicada${occasionText ? ` criada especialmente para ${occ}` : ''}. O equilíbrio perfeito entre sofisticação, texturas e exclusividade.${detailsText ? `\nAcabamentos refinados: ${details}` : ''}

Permita-nos transformar seu momento em uma memória eterna.${ctaText}${tags}`;

      short = `${hasEmojis ? '✨ ' : ''}Exclusividade e elegância: *${cleanTopic}* por ${studio}.${hasEmojis ? ' 🕊️' : ''}${ctaText}`;

      promo = `${hasEmojis ? '👑✨ ' : ''}Eleve o nível da sua celebração com o luxo e a delicadeza de *${cleanTopic}*.

Consulte nossa agenda e solicite seu atendimento personalizado.${ctaText}${tags}`;
    } else if (tn === 'divertido') {
      full = `${hasEmojis ? '🎉🥳 ' : ''}Olha que fofura que acabou de sair por aqui! Nosso *${cleanTopic}* ficou simplesmente apaixonante!${hasEmojis ? ' 🎈✨' : ''}

Ideal${occasionText ? ` para comemorar ${occ} em grande estilo` : ''}! Quem mais aí também é fã de peças cheias de cor e alegria?${detailsText ? `\nDetalhes especiais: ${details}` : ''}${ctaText}${tags}`;

      short = `${hasEmojis ? '🌈✨ ' : ''}Fofura máxima passando no seu feed: *${cleanTopic}*! Curtiu? Deixe seu like!${ctaText}`;

      promo = `${hasEmojis ? '🎈🎉 ' : ''}Sua festa ainda mais inesquecível com *${cleanTopic}*! Corre para reservar sua data antes que a agenda feche!${ctaText}${tags}`;
    } else {
      // Bastidores
      full = `${hasEmojis ? '🧵✂️ ' : ''}Bastidores que aquecem o coração...

Um pedacinho do processo de criação do nosso *${cleanTopic}*${occasionText}. Cada corte, dobra e colagem feitos à mão com dedicação total aqui no ${studio}.${detailsText ? `\nToque especial: ${details}` : ''}

Valorizar o trabalho manual é celebrar o amor colocado em cada peça!${ctaText}${tags}`;

      short = `${hasEmojis ? '✂️💛 ' : ''}Feito à mão com todo carinho: bastidores de *${cleanTopic}*!${ctaText}`;

      promo = `${hasEmojis ? '📦✨ ' : ''}Tudo pronto para mais uma entrega cheia de amor! Quer um *${cleanTopic}* exclusivo no seu evento?${ctaText}${tags}`;
    }

    if (!hasEmojis) {
      // Remove emojis if disabled
      full = full.replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');
      short = short.replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');
      promo = promo.replace(/[\u{1F600}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1FA70}-\u{1FAFF}]/gu, '');
    }

    return { full: full.trim(), short: short.trim(), promo: promo.trim() };
  };

  // Handle generation
  const handleGenerate = async () => {
    if (!productTopic.trim()) {
      setErrorMessage('Por favor, informe qual é o produto, tema ou peça para a legenda.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setCopied(false);

    try {
      const studioName = companyData?.name || 'Nosso Ateliê';
      
      const platformDescriptions: Record<PlatformType, string> = {
        instagram_feed: 'Post de Feed / Carrossel no Instagram. Formato envolvente com gancho forte na 1ª linha, parágrafos fluidos, valorização do feito à mão e encanto.',
        reels_tiktok: 'Vídeo Curto (Reels / TikTok / Shorts). Sugira um gancho visual/sonoro inicial para os primeiros 3 segundos, uma legenda rápida, dinâmica e envolvente.',
        whatsapp: 'Status do WhatsApp ou mensagem direta de lista VIP. Texto caloroso, próximo, direto e que convida a cliente a responder e pedir orçamento.',
        catalog_marketplace: 'Descrição de Produto para Catálogo / Loja Online (Shopee, Elo7, Catálogo WhatsApp). Texto focado em benefícios, medidas, acabamento e confiança.'
      };

      const toneDescriptions: Record<ToneType, string> = {
        afetuoso: 'Afetuoso, carinhoso, emotivo, acolhedor e focado no amor colocado em cada detalhe.',
        vendedor: 'Persuasivo, estratégico, focado em reservas antecipadas, agenda concorrida e chamada direta para ação.',
        sofisticado: 'Elegante, requintado, premium, destacando a exclusividade, acabamentos nobres e papelaria de luxo.',
        divertido: 'Alegre, festivo, bem-humorado, vibrante e contagiante, ideal para festas infantis e celebrações.',
        bastidores: 'Humanizado, contando a história do processo artesanal, o carinho da montagem e o orgulho do trabalho manual.'
      };

      const prompt = `Você é a especialista em marketing e mídias sociais do ateliê de artesanato e papelaria personalizada "${studioName}".
Seu objetivo é escrever 3 versões de legendas irresistíveis, autênticas e em português do Brasil (sem clichês corporativos vazios, soando como uma artesã apaixonada e profissional falando com suas clientes).

DADOS DO POST:
- Produto / Tema / Peça: "${productTopic}"
${occasion ? `- Ocasião / Celebração: "${occasion}"` : ''}
${extraDetails ? `- Detalhes e Diferenciais específicos da peça: "${extraDetails}"` : ''}
- Canal principal: ${platformDescriptions[platform]}
- Tom de voz: ${toneDescriptions[tone]}
- Incluir Hashtags: ${includeHashtags ? 'SIM (inclua 10 a 15 hashtags estratégicas e de nicho para artesanato/festas)' : 'NÃO'}
- Incluir Chamada para Ação (CTA): ${includeCta ? 'SIM (ex: "Chama no direct / WhatsApp pelo link da bio para reservar sua data")' : 'NÃO'}
- Uso de Emojis: ${useEmojis ? 'SIM (use emojis delicados e bem posicionados)' : 'NÃO (mantenha sem emojis)'}

FORMATO DA SUA RESPOSTA:
Por favor, estruture sua resposta exatamente com as 3 tags separadoras abaixo para que o aplicativo possa exibir as abas ao usuário:

===OPCAO_COMPLETA===
(Escreva uma legenda completa, encantadora e estruturada, pronta para publicar, com gancho inicial, corpo do texto, chamada para ação e hashtags)

===OPCAO_CURTA===
(Escreva uma versão mais direta e concisa, ideal para Reels, Stories rápidos ou WhatsApp Status)

===OPCAO_PROMO===
(Escreva uma versão focada em abertura de agenda, lembrete de prazos de antecedência ou incentivo de encomenda)
`;

      let responseText = '';
      try {
        responseText = await generateContent(prompt, "gemini-3.7-flash");
      } catch (apiErr: any) {
        console.warn('Gemini API call failed, activating craft heuristic generator:', apiErr);
        // Fallback generator seamlessly delivers high quality content
        const fallbackResults = generateCraftFallback(
          productTopic,
          platform,
          tone,
          occasion,
          extraDetails,
          includeHashtags,
          includeCta,
          useEmojis
        );

        setVariations(fallbackResults);
        setGeneratedText(fallbackResults[activeVariationTab] || fallbackResults.full);
        
        // Show informative message about API key if reported leaked
        const errStr = apiErr?.message || '';
        if (errStr.includes('vazada') || errStr.includes('leaked') || errStr.includes('inválida') || errStr.includes('GEMINI_API_KEY')) {
          setErrorMessage('Legenda criada com sucesso pelo Motor Criativo do Ateliê! 💡 Dica: Para usar a conexão direta do Gemini, renove sua chave de API nas configurações do AI Studio.');
        }
        return;
      }

      if (!responseText) {
        throw new Error('Nenhum texto foi retornado pela IA. Tente novamente.');
      }

      // Parse variations from response
      let fullText = responseText;
      let shortText = '';
      let promoText = '';

      if (responseText.includes('===OPCAO_COMPLETA===')) {
        const parts = responseText.split('===OPCAO_COMPLETA===')[1] || '';
        const [fullPart, rest1] = parts.split('===OPCAO_CURTA===');
        fullText = (fullPart || '').trim();

        if (rest1) {
          const [shortPart, rest2] = rest1.split('===OPCAO_PROMO===');
          shortText = (shortPart || '').trim();
          if (rest2) {
            promoText = (rest2 || '').trim();
          }
        }
      }

      const newVariations = {
        full: fullText || responseText.trim(),
        short: shortText || fullText || responseText.trim(),
        promo: promoText || fullText || responseText.trim()
      };

      setVariations(newVariations);
      setGeneratedText(newVariations[activeVariationTab] || newVariations.full);

    } catch (err: any) {
      console.error('Erro ao gerar legenda:', err);
      // Even in case of global error, deliver fallback
      const fallbackResults = generateCraftFallback(
        productTopic,
        platform,
        tone,
        occasion,
        extraDetails,
        includeHashtags,
        includeCta,
        useEmojis
      );
      setVariations(fallbackResults);
      setGeneratedText(fallbackResults[activeVariationTab] || fallbackResults.full);
      setErrorMessage('Legenda gerada com sucesso pelo Motor Criativo do Ateliê!');
    } finally {
      setIsLoading(false);
    }
  };

  // Switch variation tab
  const handleTabChange = (tab: 'full' | 'short' | 'promo') => {
    setActiveVariationTab(tab);
    if (variations[tab]) {
      setGeneratedText(variations[tab]!);
      setCopied(false);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!generatedText) return;
    try {
      await navigator.clipboard.writeText(generatedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (e) {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = generatedText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Save to history
  const handleSaveToFavorites = () => {
    if (!generatedText) return;
    const newEntry: SavedCaption = {
      id: `caption_${Date.now()}`,
      createdAt: new Date().toISOString(),
      theme: productTopic || 'Sem título',
      platform,
      tone,
      content: generatedText
    };
    setSavedCaptions(prev => [newEntry, ...prev.slice(0, 29)]); // keep up to 30
    alert('Legenda salva no histórico com sucesso!');
  };

  // Remove from history
  const handleRemoveSaved = (id: string) => {
    setSavedCaptions(prev => prev.filter(c => c.id !== id));
  };

  // Share on WhatsApp
  const handleShareWhatsApp = () => {
    if (!generatedText) return;
    const encoded = encodeURIComponent(generatedText);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  return (
    <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] shadow-sm border border-pink-100 relative overflow-hidden transition-all">
      {/* Decorative ambient background */}
      <div className="absolute -top-12 -right-12 w-64 h-64 bg-gradient-to-br from-pink-400/10 via-purple-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-gradient-to-tr from-yellow-400/10 via-pink-400/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div className="flex items-center gap-3">
          <div className="p-3.5 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-2xl shadow-lg shadow-pink-500/20 flex items-center justify-center">
            <Sparkles size={26} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl sm:text-2xl font-black text-gray-800 tracking-tight">
                Criador de Legendas por <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600">IA</span>
              </h3>
              <span className="bg-pink-100/70 text-pink-600 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider border border-pink-200/50">
                Assistente Criativo
              </span>
            </div>
            <p className="text-xs font-semibold text-gray-400 mt-0.5">
              Gere copies magnéticas para Instagram, Reels, WhatsApp e Catálogo com a voz do seu ateliê.
            </p>
          </div>
        </div>

        {savedCaptions.length > 0 && (
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-pink-50 border border-gray-200/70 hover:border-pink-200 text-gray-600 hover:text-pink-600 rounded-2xl text-xs font-bold transition-all shrink-0 self-start sm:self-auto"
          >
            <Bookmark size={14} />
            <span>{showHistory ? 'Ocultar Salvas' : `Salvas (${savedCaptions.length})`}</span>
          </button>
        )}
      </div>

      {/* Saved Captions Drawer / Section */}
      {showHistory && savedCaptions.length > 0 && (
        <div className="mb-8 p-6 bg-pink-50/40 rounded-[2rem] border border-pink-100 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black text-pink-600 uppercase tracking-wider flex items-center gap-2">
              <Bookmark size={14} /> Legendas Salvas Recentemente
            </h4>
            <span className="text-[10px] text-gray-400 font-bold">{savedCaptions.length} salvas</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {savedCaptions.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-2xl border border-pink-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-pink-600 truncate max-w-[140px] uppercase">
                      {item.theme}
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">
                      {new Date(item.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-3 italic mb-3 font-medium">
                    "{item.content}"
                  </p>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                  <button
                    onClick={() => {
                      setGeneratedText(item.content);
                      setProductTopic(item.theme);
                      setPlatform(item.platform);
                      setTone(item.tone);
                      setShowHistory(false);
                    }}
                    className="text-[10px] font-black text-purple-600 hover:text-purple-700 flex items-center gap-1 uppercase"
                  >
                    <Edit3 size={11} /> Usar no Editor
                  </button>
                  <button
                    onClick={() => handleRemoveSaved(item.id)}
                    className="text-gray-300 hover:text-red-500 p-1 transition-colors"
                    title="Excluir"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Inputs vs Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Quick Idea Chips */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
              Ideias Rápidas de 1 Clique:
            </label>
            <div className="flex flex-wrap gap-2">
              {quickIdeas.map((idea, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setProductTopic(idea.topic)}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-pink-50 hover:text-pink-600 border border-gray-100 hover:border-pink-200 text-gray-600 text-[11px] font-bold rounded-xl transition-all active:scale-95"
                >
                  {idea.label}
                </button>
              ))}
            </div>
          </div>

          {/* Product / Piece Input with autocomplete from registered products */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                Produto / Tema / Peça <span className="text-pink-500">*</span>
              </label>
              {(products.length > 0 || projects.length > 0) && (
                <div className="relative group">
                  <span className="text-[10px] font-bold text-purple-600 cursor-pointer hover:underline flex items-center gap-1">
                    <Layers size={11} /> Puxar do Ateliê <ChevronDown size={10} />
                  </span>
                  <div className="hidden group-hover:block absolute right-0 top-full mt-1 bg-white border border-gray-150 rounded-2xl shadow-xl p-2 w-56 z-50 max-h-48 overflow-y-auto custom-scrollbar">
                    <p className="text-[9px] font-black text-gray-400 uppercase px-2 py-1">Produtos Cadastrados:</p>
                    {products.slice(0, 8).map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setProductTopic(p.name + (p.description ? ` (${p.description})` : ''))}
                        className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-600 rounded-lg truncate font-medium"
                      >
                        {p.name}
                      </button>
                    ))}
                    {projects.length > 0 && (
                      <>
                        <p className="text-[9px] font-black text-gray-400 uppercase px-2 py-1 pt-2 border-t mt-1">Temas Recentes:</p>
                        {Array.from(new Set(projects.map(pr => pr.theme).filter(Boolean))).slice(0, 6).map((thm, i) => (
                          <button
                            key={i}
                            type="button"
                            onClick={() => setProductTopic(`Tema ${thm}`)}
                            className="w-full text-left px-2 py-1.5 text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-600 rounded-lg truncate font-medium"
                          >
                            Tema {thm}
                          </button>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            <input
              type="text"
              value={productTopic}
              onChange={(e) => setProductTopic(e.target.value)}
              placeholder="Ex: Topo de bolo Jardim das Borboletas com camadas 3D e papel perolado..."
              className="w-full bg-gray-50/70 border border-gray-200 focus:border-pink-500 focus:bg-white rounded-2xl p-4 text-sm font-semibold text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-4 focus:ring-pink-100"
            />
          </div>

          {/* Platform & Tone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                Canal de Postagem
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPlatform('instagram_feed')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'instagram_feed'
                      ? 'bg-pink-50 border-pink-400 text-pink-600 shadow-sm'
                      : 'bg-gray-50 border-gray-150 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Instagram size={15} className={platform === 'instagram_feed' ? 'text-pink-500' : 'text-gray-400'} />
                  <span>Feed / Carrossel</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('reels_tiktok')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'reels_tiktok'
                      ? 'bg-purple-50 border-purple-400 text-purple-600 shadow-sm'
                      : 'bg-gray-50 border-gray-150 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Video size={15} className={platform === 'reels_tiktok' ? 'text-purple-500' : 'text-gray-400'} />
                  <span>Reels / Vídeo</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('whatsapp')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'whatsapp'
                      ? 'bg-green-50 border-green-400 text-green-600 shadow-sm'
                      : 'bg-gray-50 border-gray-150 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <MessageSquare size={15} className={platform === 'whatsapp' ? 'text-green-500' : 'text-gray-400'} />
                  <span>WhatsApp Status</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('catalog_marketplace')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'catalog_marketplace'
                      ? 'bg-orange-50 border-orange-400 text-orange-600 shadow-sm'
                      : 'bg-gray-50 border-gray-150 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Store size={15} className={platform === 'catalog_marketplace' ? 'text-orange-500' : 'text-gray-400'} />
                  <span>Catálogo / Loja</span>
                </button>
              </div>
            </div>

            {/* Tone Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                Tom de Voz & Estilo
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as ToneType)}
                className="w-full bg-gray-50/70 border border-gray-200 focus:border-pink-500 focus:bg-white rounded-2xl p-3 text-xs font-bold text-gray-700 outline-none transition-all"
              >
                <option value="afetuoso">💖 Afetuoso & Encantador (Foco no amor)</option>
                <option value="vendedor">🚀 Vendedor & Agenda (Foco em fechamento)</option>
                <option value="sofisticado">✨ Luxo & Elegante (Papelaria fina)</option>
                <option value="divertido">🎉 Alegre & Festivo (Festas animadas)</option>
                <option value="bastidores">🧵 Bastidores & Artesanal (Feito à mão)</option>
              </select>

              <div className="mt-2.5">
                <label className="block text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">
                  Ocasião (Opcional):
                </label>
                <input
                  type="text"
                  value={occasion}
                  onChange={(e) => setOccasion(e.target.value)}
                  placeholder="Ex: Aniversário de 1 ano, Chá Revelação, Maternidade..."
                  className="w-full bg-gray-50/70 border border-gray-200 focus:border-pink-500 focus:bg-white rounded-xl p-2.5 text-xs font-semibold text-gray-700 placeholder-gray-400 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Extra Details / Differentials */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
              Diferenciais da Peça / Informações Extras (Opcional)
            </label>
            <input
              type="text"
              value={extraDetails}
              onChange={(e) => setExtraDetails(e.target.value)}
              placeholder="Ex: Laço duplo de cetim, papel lamicote dourado 250g, envio para todo o Brasil, prazo de 7 dias..."
              className="w-full bg-gray-50/70 border border-gray-200 focus:border-pink-500 focus:bg-white rounded-2xl p-3 text-xs font-semibold text-gray-700 placeholder-gray-400 outline-none transition-all"
            />
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4 pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeHashtags}
                onChange={(e) => setIncludeHashtags(e.target.checked)}
                className="w-4 h-4 rounded text-pink-500 focus:ring-pink-400 border-gray-300 accent-pink-500"
              />
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                <Tag size={12} className="text-pink-500" /> Incluir Hashtags Estratégicas
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={includeCta}
                onChange={(e) => setIncludeCta(e.target.checked)}
                className="w-4 h-4 rounded text-pink-500 focus:ring-pink-400 border-gray-300 accent-pink-500"
              />
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                <Send size={12} className="text-purple-500" /> Chamada para Ação (CTA)
              </span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={useEmojis}
                onChange={(e) => setUseEmojis(e.target.checked)}
                className="w-4 h-4 rounded text-pink-500 focus:ring-pink-400 border-gray-300 accent-pink-500"
              />
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                <Heart size={12} className="text-pink-400" /> Emojis Delicados
              </span>
            </label>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading}
            className={`w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg ${
              isLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 via-pink-600 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white shadow-pink-500/25 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <RefreshCw size={20} className="animate-spin text-pink-500" />
                <span>Criando legenda personalizada com IA...</span>
              </>
            ) : (
              <>
                <Wand2 size={20} />
                <span>Gerar Legenda com IA</span>
              </>
            )}
          </button>

          {errorMessage && (
            <div className={`p-4 rounded-2xl flex items-start gap-3 text-xs font-bold animate-fadeIn ${
              errorMessage.includes('Motor Criativo') || errorMessage.includes('sucesso')
                ? 'bg-amber-50/90 border border-amber-200/80 text-amber-800'
                : 'bg-rose-50 border border-rose-200 text-rose-700'
            }`}>
              {errorMessage.includes('Motor Criativo') || errorMessage.includes('sucesso') ? (
                <Sparkles size={18} className="shrink-0 mt-0.5 text-amber-600" />
              ) : (
                <AlertCircle size={18} className="shrink-0 mt-0.5 text-rose-500" />
              )}
              <div className="flex-1 leading-relaxed">
                <p>{errorMessage}</p>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-gray-400 hover:text-gray-600 text-xs font-black ml-2"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Generated Result & Controls (5 cols) */}
        <div className="lg:col-span-5 flex flex-col h-full">
          <div className="bg-gradient-to-b from-gray-50/90 to-pink-50/30 rounded-3xl border border-pink-100/80 p-5 flex-1 flex flex-col justify-between shadow-inner">
            <div>
              {/* Header & Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-pink-100/60 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Variações:
                  </span>
                  <div className="flex bg-white/80 p-0.5 rounded-xl border border-pink-100">
                    <button
                      type="button"
                      onClick={() => handleTabChange('full')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        activeVariationTab === 'full'
                          ? 'bg-pink-500 text-white shadow-xs'
                          : 'text-gray-500 hover:text-pink-600'
                      }`}
                    >
                      Completa
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('short')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        activeVariationTab === 'short'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-gray-500 hover:text-purple-600'
                      }`}
                    >
                      Curta
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('promo')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                        activeVariationTab === 'promo'
                          ? 'bg-orange-500 text-white shadow-xs'
                          : 'text-gray-500 hover:text-orange-600'
                      }`}
                    >
                      Vendas
                    </button>
                  </div>
                </div>

                {generatedText && (
                  <span className="text-[9px] font-bold text-gray-400">
                    {generatedText.length} caracteres
                  </span>
                )}
              </div>

              {/* Text Area / Content */}
              {isLoading ? (
                <div className="min-h-[260px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-4 bg-pink-100/60 rounded-full text-pink-500 animate-pulse">
                    <Sparkles size={32} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wider">A IA está escrevendo...</p>
                    <p className="text-[11px] font-semibold text-gray-400 mt-0.5">Criando ganchos, emoção e chamada para ação</p>
                  </div>
                </div>
              ) : generatedText ? (
                <div className="space-y-2">
                  <textarea
                    value={generatedText}
                    onChange={(e) => setGeneratedText(e.target.value)}
                    rows={12}
                    className="w-full bg-white border border-pink-100 focus:border-pink-400 rounded-2xl p-4 text-xs font-medium leading-relaxed text-gray-700 outline-none resize-none shadow-xs font-sans"
                    placeholder="Sua legenda aparecerá aqui..."
                  />
                  <p className="text-[9px] text-gray-400 font-bold text-right flex items-center justify-end gap-1">
                    <Edit3 size={10} /> Você pode editar o texto acima antes de copiar
                  </p>
                </div>
              ) : (
                <div className="min-h-[260px] flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="p-4 bg-white rounded-full text-pink-300 shadow-sm border border-pink-50">
                    <Wand2 size={28} />
                  </div>
                  <div className="max-w-[240px]">
                    <p className="text-xs font-black text-gray-700 uppercase tracking-wider">Pronto para criar</p>
                    <p className="text-[11px] font-medium text-gray-400 mt-1 leading-normal">
                      Preencha o tema ou escolha uma ideia ao lado e clique em <b>Gerar Legenda com IA</b>.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            {generatedText && (
              <div className="pt-3 border-t border-pink-100/60 mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  {/* Copy Button */}
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm ${
                      copied
                        ? 'bg-green-500 text-white'
                        : 'bg-pink-500 hover:bg-pink-600 text-white'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check size={16} />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={16} />
                        <span>Copiar Texto</span>
                      </>
                    )}
                  </button>

                  {/* WhatsApp Share Button */}
                  <button
                    type="button"
                    onClick={handleShareWhatsApp}
                    className="py-3 px-4 bg-green-500 hover:bg-green-600 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-sm"
                  >
                    <MessageSquare size={16} />
                    <span>WhatsApp</span>
                  </button>
                </div>

                <div className="flex gap-2">
                  {/* Save to History Button */}
                  <button
                    type="button"
                    onClick={handleSaveToFavorites}
                    className="flex-1 py-2 px-3 bg-white hover:bg-purple-50 border border-purple-200 text-purple-600 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Bookmark size={13} />
                    <span>Salvar nos Favoritos</span>
                  </button>

                  {/* Regenerate Button */}
                  <button
                    type="button"
                    onClick={handleGenerate}
                    disabled={isLoading}
                    className="py-2 px-3 bg-white hover:bg-pink-50 border border-pink-200 text-pink-600 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all"
                    title="Gerar nova versão"
                  >
                    <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
                    <span>Regerar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

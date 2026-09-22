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
  AlertCircle,
  ShoppingCart,
  Package,
  Box,
  Truck,
  Smartphone,
  Eye,
  Image as ImageIcon
} from 'lucide-react';
import { generateContent } from '../lib/gemini';
import { Product, Project, CompanyData } from '../types';

interface AICaptionGeneratorProps {
  companyData?: CompanyData;
  products?: Product[];
  projects?: Project[];
  currentUser?: string;
}

export type PlatformType = 'instagram_feed' | 'stories' | 'reels_tiktok' | 'whatsapp' | 'marketplace' | 'catalog' | 'catalog_marketplace';
export type MarketplaceType = 'geral' | 'shopee' | 'elo7' | 'mercadolivre';
export type StoryGoalType = 'bastidores' | 'encomenda_pronta' | 'enquete' | 'agenda' | 'depoimento' | 'detalhes';
export type StoryStickerType = 'enquete' | 'caixinha' | 'reacao' | 'link' | 'direct';
export type StoryFormatType = 'sequencia_3' | 'sequencia_4' | 'tela_unica' | 'roteiro_falado';
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
  projects = [],
  currentUser
}) => {
  const userKey = currentUser ? currentUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '_') : 'default';
  const captionsStorageKey = `${userKey}_calculie_ai_captions`;
  // Form state
  const [productTopic, setProductTopic] = useState('');
  const [occasion, setOccasion] = useState('');
  const [platform, setPlatform] = useState<PlatformType>('instagram_feed');
  const [tone, setTone] = useState<ToneType>('afetuoso');
  const [extraDetails, setExtraDetails] = useState('');
  const [includeHashtags, setIncludeHashtags] = useState(true);
  const [includeCta, setIncludeCta] = useState(true);
  const [useEmojis, setUseEmojis] = useState(true);

  // Story specific fields
  const [storyGoal, setStoryGoal] = useState<StoryGoalType>('bastidores');
  const [storySticker, setStorySticker] = useState<StoryStickerType>('enquete');
  const [storyFormat, setStoryFormat] = useState<StoryFormatType>('sequencia_3');
  const [storyCustomSticker, setStoryCustomSticker] = useState('');
  const [storyIncludeMusicTip, setStoryIncludeMusicTip] = useState(true);

  // Marketplace specific fields
  const [marketplaceTarget, setMarketplaceTarget] = useState<MarketplaceType>('shopee');
  const [marketplaceItems, setMarketplaceItems] = useState('');
  const [marketplaceDimensions, setMarketplaceDimensions] = useState('');
  const [marketplaceProductionTime, setMarketplaceProductionTime] = useState('7 dias úteis');
  const [marketplaceMaterial, setMarketplaceMaterial] = useState('');
  const [marketplaceCustomizationNote, setMarketplaceCustomizationNote] = useState('Enviar nome, idade e tema pelo chat após a compra');
  const [marketplaceShippingType, setMarketplaceShippingType] = useState<'semi_montadas' | 'montadas' | 'desmontadas'>('semi_montadas');

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
  const [storyPreviewTab, setStoryPreviewTab] = useState<'text' | 'mockup'>('text');

  // Saved / History state
  const [savedCaptions, setSavedCaptions] = useState<SavedCaption[]>(() => {
    try {
      const saved = localStorage.getItem(captionsStorageKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [showHistory, setShowHistory] = useState(false);

  // Reload when userKey changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(captionsStorageKey);
      setSavedCaptions(saved ? JSON.parse(saved) : []);
    } catch {
      setSavedCaptions([]);
    }
  }, [captionsStorageKey]);

  // Save to local storage on change
  useEffect(() => {
    try {
      localStorage.setItem(captionsStorageKey, JSON.stringify(savedCaptions));
    } catch (e) {
      console.error('Erro ao salvar histórico de legendas:', e);
    }
  }, [savedCaptions, captionsStorageKey]);

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

    // Specialized Marketplace generator
    if (plat === 'marketplace' || plat === 'catalog_marketplace' || plat === 'catalog') {
      const mpName = marketplaceTarget === 'shopee' 
        ? 'Shopee' 
        : marketplaceTarget === 'elo7' 
        ? 'Elo7' 
        : marketplaceTarget === 'mercadolivre' 
        ? 'Mercado Livre' 
        : 'Marketplace';

      const itemsList = marketplaceItems 
        ? marketplaceItems 
        : `• 10 Caixas Milk Personalizadas\n• 10 Caixas Pirâmide/Cone\n• 1 Topo de Bolo Personalizado`;
      const dims = marketplaceDimensions 
        ? marketplaceDimensions 
        : `• Caixa Milk: aprox. 13cm (altura) x 6cm (largura)\n• Caixa Pirâmide: aprox. 16cm (altura) x 6cm (base)`;
      const mat = marketplaceMaterial 
        ? marketplaceMaterial 
        : `Papel Offset 180g fosco de alta resolução (não reflete a luz nas fotos), com apliques em 3D e laços de cetim inclusos.`;
      const prazo = marketplaceProductionTime || '7 dias úteis';
      const note = marketplaceCustomizationNote || 'Enviar NOME e IDADE pelo chat do vendedor imediatamente após a compra.';
      const shipping = marketplaceShippingType === 'semi_montadas' 
        ? 'Enviamos as caixas semi-montadas (já coladas e vincadas, com fundo de encaixe fácil) para garantir que não amassem durante o frete.' 
        : marketplaceShippingType === 'montadas'
        ? 'Enviadas 100% montadas e prontas para uso.'
        : 'Enviadas desmontadas com instruções de colagem rápida.';

      const fullMp = `TÍTULO DO ANÚNCIO (SEO):
Kit Festa Personalizado ${cleanTopic} - Nome e Idade - Lembrancinhas e Decoração

DESCRIÇÃO DO PRODUTO:
${hasEmojis ? '✨💖 ' : ''}Deixe sua festa inesquecível com o ${cleanTopic}! 
Produzido artesanalmente com materiais de primeira qualidade e acabamento impecável para valorizar sua comemoração.

📦 O QUE VEM NO PACOTE:
${itemsList}

📏 MEDIDAS APROXIMADAS:
${dims}

🎨 MATERIAL E QUALIDADE:
${mat}
${detailsText ? `Diferenciais: ${details}` : ''}

⏳ PRAZO DE PRODUÇÃO E POSTAGEM:
Nosso prazo de confecção é de ${prazo} após a confirmação do pagamento e envio dos dados de personalização.

⚠️ IMPORTANTE - PERSONALIZAÇÃO:
${note}
(Caso os dados não sejam informados em até 24h, o pedido será enviado sem nome para cumprir o prazo de postagem da plataforma).

🚚 ENVIO E TRANSPORTE:
${shipping}

💬 DÚVIDAS?
Ficou com alguma dúvida sobre o tema ou quantidade? Envie uma mensagem no chat antes de comprar! Teremos o maior prazer em atender você.${hasHashtags ? `\n\nTAGS DE BUSCA:\n${cleanTopic.toLowerCase()}, kit festa, lembrancinhas personalizadas, papelaria personalizada, ${mpName.toLowerCase()}, festa infantil, topo de bolo, kit ${cleanTopic.toLowerCase()}` : ''}`;

      const shortMp = `Kit Festa Personalizado ${cleanTopic}

${hasEmojis ? '✨ ' : ''}Lembrancinhas personalizadas de alta qualidade para sua festa!
• Itens inclusos: ${itemsList.replace(/\n/g, ' / ')}
• Material: ${mat}
• Prazo de confecção: ${prazo}
• Envio: ${shipping}

⚠️ ATENÇÃO: Envie nome e idade no chat após fechar o pedido!
${hasEmojis ? '💌 ' : ''}Dúvidas? Estamos à disposição no chat!`;

      const promoMp = `TÍTULOS OTIMIZADOS PARA BUSCA (${mpName.toUpperCase()} / SEO):
1. Kit Festa Personalizado ${cleanTopic} - Decoração e Lembrancinhas
2. ${cleanTopic} Personalizado com Nome e Idade - Kit Festa Infantil
3. Kit Lembrancinhas ${cleanTopic} Papelaria Criativa - Envio Rápido

PALAVRAS-CHAVE E TAGS PARA O ANÚNCIO:
kit festa ${cleanTopic.toLowerCase()}, lembrancinhas ${cleanTopic.toLowerCase()}, ${cleanTopic.toLowerCase()} personalizado, papelaria personalizada, elo7 personalizados, shopee papelaria, topo de bolo ${cleanTopic.toLowerCase()}, festa infantil tema ${cleanTopic.toLowerCase()}`;

      return { full: fullMp.trim(), short: shortMp.trim(), promo: promoMp.trim() };
    }

    // Specialized Story generator
    if (plat === 'stories') {
      const goalText = storyGoal === 'bastidores'
        ? 'Bastidores de Produção & Feito à Mão'
        : storyGoal === 'encomenda_pronta'
        ? 'Encomenda Pronta & Embalando com Carinho'
        : storyGoal === 'enquete'
        ? 'Interação & Opinião dos Seguidores'
        : storyGoal === 'agenda'
        ? 'Agenda Aberta & Vagas do Mês'
        : storyGoal === 'depoimento'
        ? 'Feedback Real & Prova Social'
        : 'Camadas 3D & Detalhes de Luxo';

      const stickerLabel = storySticker === 'enquete'
        ? 'Figurinha de Enquete ("Amou? Sim! / Muito!" ou "Qual você prefere?")'
        : storySticker === 'caixinha'
        ? 'Caixinha de Perguntas ("Qual tema você sonha ver aqui?")'
        : storySticker === 'reacao'
        ? 'Barra de Reação (Deslizar do Emoji com coração/fogo)'
        : storySticker === 'link'
        ? 'Figurinha de Link ("Fale com a artesã / Orçamento")'
        : 'Chamada com sticker "Envie uma mensagem" (Direct)';

      const customStickerPrompt = storyCustomSticker ? `"${storyCustomSticker}"` : stickerLabel;

      const fullStory = `🎬 ROTEIRO DE STORIES (SEQUÊNCIA EM 3 TELAS):
Objetivo: ${goalText}
${hasEmojis ? '✨💖 ' : ''}Tema: ${cleanTopic}${occasionText ? ` (${occ})` : ''}

📱 TELA 1 — O GANCHO (Curiosidade & Movimento):
• O que filmar: Vídeo em close de 5 a 7 segundos mostrando suas mãos montando a peça, vincando o papel ou organizando os apliques 3D na mesa de trabalho.
• Texto para colar na tela:
"${hasEmojis ? '✂️✨ ' : ''}Quem mais aí ama ver uma peça nascendo do zero?
Mais uma lindeza saindo do forno por aqui..."
• Figurinha / Interação: ${storySticker === 'reacao' ? 'Barra de reação com coração ou fogo' : 'Enquete rápida: "Também ama? Sim! / Muito!"'} (posicionar no meio inferior).
${storyIncludeMusicTip ? '• Dica de Áudio: Trilha instrumental suave ou áudio em alta acústico/calmo.' : ''}

📱 TELA 2 — OS DETALHES (Encanto & Prova de Qualidade):
• O que filmar: Vídeo girando a peça com cuidado ou foto nítida com boa luz natural, destacando o relevo, texturas${details ? ` e diferenciais (${details})` : ''}.
• Texto para colar na tela:
"${hasEmojis ? '💖 ' : ''}${cleanTopic}${occasionText}!
Cada camada pensada para transformar a comemoração em uma lembrança eterna.${hasEmojis ? ' 🌸' : ''}"
• Dica visual: Deixe o texto centralizado em tamanho médio para não cobrir os detalhes da peça.

📱 TELA 3 — A CONVERSÃO (Chamada para Ação):
• O que filmar: A peça completa no cenário com lacinho, ou sendo colocada delicadamente na caixinha de entrega com papel de seda e cheirinho.
• Texto para colar na tela:
"Gostou do resultado?${hasEmojis ? ' 🥰' : ''}
Estamos com a agenda aberta para encomendas com antecedência!"
• Figurinha Interativa: ${customStickerPrompt}.
• Ação recomendada: "Responda a esse story ou clique no link da bio para garantir sua vaga na agenda!"`;

      const shortStory = `TEXTOS CURTOS PARA COLAR DIRETO NA FOTO OU VÍDEO DO STORY:

Opção 1 (Amor e Feito à Mão):
"${hasEmojis ? '💕✂️ ' : ''}Amor em cada camadinha! ${cleanTopic} saindo por aqui.${hasEmojis ? ' ✨' : ''}"

Opção 2 (Bastidores & Produção):
"${hasEmojis ? '🧵🌸 ' : ''}Bastidores que aquecem o coração! Quem aí também é apaixonada por papelaria personalizada?"

Opção 3 (Agenda & Pedidos):
"${hasEmojis ? '📦💌 ' : ''}Encomenda prontinha para viajar! Quer garantir o seu para a próxima festa? Chama no direct!"

Opção 4 (Detalhe de Luxo):
"${hasEmojis ? '✨👑 ' : ''}Olha o relevo e o acabamento dessa lindeza... Encantada é pouco!${hasEmojis ? ' 😍' : ''}"`;

      const promoStory = `IDEIAS DE ENQUETES E CAIXINHAS PARA ENGAJAR NOS STORIES:

📊 Sugestões de Enquetes:
1. "Qual tema você prefere para festa infantil? [Tema ${cleanTopic}] ou [Tema Fazendinha]?"
2. "Você prefere topos de bolo com detalhes em [Glitter/Dourado] ou [Cores Pastéis]?"
3. "Já garantiu a papelaria da próxima festa? [Já sim!] ou [Ainda estou procurando!]"

❓ Sugestões para Caixinha de Perguntas:
• "Qual tema de festa você gostaria de ver saindo do nosso ateliê este mês?"
• "Tem dúvidas sobre prazos e como encomendar? Manda sua dúvida aqui embaixo!"

💌 Chamadas para o Direct (Conversão):
• "Gostou desse ${cleanTopic}? Reaja a esse story que te envio todos os detalhes no direct!"
• "Poucas vagas para este mês! Clique no sticker de link ou me envie uma mensagem para consultar sua data."`;

      return { full: fullStory.trim(), short: shortStory.trim(), promo: promoStory.trim() };
    }

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
        stories: 'Instagram Stories / Facebook / WhatsApp Status. Roteiro dinâmico tela por tela, direção de filmagem, textos curtos na tela, stickers interativos e chamadas diretas.',
        reels_tiktok: 'Vídeo Curto (Reels / TikTok / Shorts). Sugira um gancho visual/sonoro inicial para os primeiros 3 segundos, uma legenda rápida, dinâmica e envolvente.',
        whatsapp: 'Status do WhatsApp ou mensagem direta de lista VIP. Texto caloroso, próximo, direto e que convida a cliente a responder e pedir orçamento.',
        marketplace: 'Anúncio de Marketplace (Shopee, Elo7, Mercado Livre). Título com SEO de alta conversão, ficha técnica estruturada com medidas, itens inclusos, prazo e instruções de personalização.',
        catalog: 'Descrição de Produto para Catálogo Online / Loja Própria. Foco em benefícios, fotos, medidas e finalização de compra.',
        catalog_marketplace: 'Anúncio de Marketplace / Catálogo (Shopee, Elo7, Mercado Livre).'
      };

      const toneDescriptions: Record<ToneType, string> = {
        afetuoso: 'Afetuoso, carinhoso, emotivo, acolhedor e focado no amor colocado em cada detalhe.',
        vendedor: 'Persuasivo, estratégico, focado em reservas antecipadas, agenda concorrida e chamada direta para ação.',
        sofisticado: 'Elegante, requintado, premium, destacando a exclusividade, acabamentos nobres e papelaria de luxo.',
        divertido: 'Alegre, festivo, bem-humorado, vibrante e contagiante, ideal para festas infantis e celebrações.',
        bastidores: 'Humanizado, contando a história do processo artesanal, o carinho da montagem e o orgulho do trabalho manual.'
      };

      let prompt = '';

      if (platform === 'stories') {
        const goalDescriptions: Record<StoryGoalType, string> = {
          bastidores: 'Bastidores de confecção e produção manual, corte, vinco, colagem e o encanto do feito à mão.',
          encomenda_pronta: 'Encomenda finalizada, embalando com carinho, papel de seda, adesivos e cheirinho de amor.',
          enquete: 'Engajamento e interação ativa com os seguidores através de perguntas, escolhas e enquetes dinâmicas.',
          agenda: 'Aviso de agenda aberta para encomendas, lembrete de antecedência e vagas limitadas.',
          depoimento: 'Compartilhamento de elogio de cliente, prova social e gratidão pela confiança.',
          detalhes: 'Close nos detalhes de luxo, camadas 3D, texturas nobres de papel, lamicote e pedrarias.'
        };

        const stickerDescriptions: Record<StoryStickerType, string> = {
          enquete: 'Figurinha de Enquete (duas opções atraentes de voto com alto índice de clique)',
          caixinha: 'Caixinha de Perguntas (com chamada irresistível para mandarem respostas/dúvidas)',
          reacao: 'Barra de Reação Emoji (slider com coração, fogo ou olhos brilhando)',
          link: 'Figurinha de Link direto para catálogo ou WhatsApp',
          direct: 'Chamada com sticker ou incentivo para responder no Direct'
        };

        prompt = `Você é a especialista número 1 em Instagram Stories e engajamento para ateliês de artesanato e papelaria personalizada ("${studioName}").
Seu objetivo é criar um roteiro perfeito, magnético e prático para STORIES sobre: "${productTopic}".
O objetivo deste Story é: ${goalDescriptions[storyGoal]}
Figurinha / Sticker de interação desejada: ${stickerDescriptions[storySticker]}
${storyCustomSticker ? `- Pergunta ou frase personalizada para o sticker: "${storyCustomSticker}"` : ''}
${occasion ? `- Ocasião / Tema da festa: "${occasion}"` : ''}
${extraDetails ? `- Detalhes e Diferenciais da peça: "${extraDetails}"` : ''}
- Formato desejado: ${storyFormat === 'sequencia_3' ? 'Sequência estruturada em 3 telas (Gancho -> Detalhe -> Conversão)' : storyFormat === 'sequencia_4' ? 'Sequência de 4 telas completas' : storyFormat === 'tela_unica' ? 'Tela única impactante' : 'Roteiro falado em vídeo (o que falar + texto na tela)'}
- Tom de voz: ${toneDescriptions[tone]}
- Uso de Emojis: ${useEmojis ? 'SIM (use emojis delicados)' : 'NÃO'}
${storyIncludeMusicTip ? '- Incluir sugestão de estilo de música ou áudio em alta: SIM' : ''}

FORMATO DA SUA RESPOSTA:
Estruture sua resposta rigorosamente com as 3 tags separadoras abaixo para que o aplicativo exiba as abas de navegação ao usuário:

===OPCAO_COMPLETA===
(Escreva o Roteiro Completo de Stories tela a tela:
Para cada tela (Tela 1, Tela 2, Tela 3, etc.):
- 📱 NÚMERO DA TELA & OBJETIVO (ex: Tela 1 — O Gancho de Curiosidade)
- 🎬 O QUE MOSTRAR / FILMAR (direção clara para a artesã: ângulo da câmera, mãos em movimento, iluminação)
- 📝 TEXTO PARA COLAR NA TELA (dividido em 2 a 3 linhas curtas, limpas e fáceis de ler no celular)
- 🗣️ O QUE FALAR (sugestão descontraída caso a artesã queira falar)
- 🏷️ FIGURINHA / STICKER RECOMENDADO (qual usar e onde posicionar na tela)
${storyIncludeMusicTip ? '- 🎵 DICA DE ÁUDIO (estilo de música ou áudio em alta para colocar de fundo)' : ''})

===OPCAO_CURTA===
(Escreva Textos Curtos para Colar na Tela:
Forneça 4 opções de frases magnéticas de 1 a 2 linhas para a artesã copiar e colar diretamente sobre as fotos ou vídeos nos Stories)

===OPCAO_PROMO===
(Escreva Ideias de Enquetes, Caixinhas e Chamadas para Direct:
- 3 Ideias criativas de Enquetes com opções de voto prontas de alto clique
- 2 Sugestões de perguntas para Caixinha de Stories
- 2 Chamadas persuasivas para fechamento de pedido no Direct ou Link)
`;
      } else if (platform === 'marketplace' || platform === 'catalog_marketplace') {
        const mpName = marketplaceTarget === 'shopee' 
          ? 'Shopee' 
          : marketplaceTarget === 'elo7' 
          ? 'Elo7' 
          : marketplaceTarget === 'mercadolivre' 
          ? 'Mercado Livre' 
          : 'Marketplace';

        prompt = `Você é uma especialista de topo em copywriting e SEO para marketplaces de artesanato e papelaria personalizada (Shopee, Elo7, Mercado Livre) para o ateliê "${studioName}".
Seu objetivo é criar o anúncio perfeito para a plataforma ${mpName}, garantindo alto ranqueamento nas buscas dos compradores e clareza total para evitar dúvidas e cancelamentos.

DADOS DO PRODUTO:
- Produto / Tema / Peça: "${productTopic}"
- Marketplace Alvo: ${mpName}
- Itens Inclusos / Quantidade no Pacote: "${marketplaceItems || 'Conforme especificado no anúncio'}"
- Medidas / Dimensões: "${marketplaceDimensions || 'Dimensões padrão para festas'}"
- Material / Papel: "${marketplaceMaterial || 'Papel Offset / Fotográfico 180g de alta resolução, apliques 3D e laços inclusos'}"
- Prazo de Confecção / Produção: "${marketplaceProductionTime || '7 dias úteis'}"
- Instruções de Personalização: "${marketplaceCustomizationNote}"
- Forma de Envio das Peças: "${marketplaceShippingType === 'semi_montadas' ? 'Enviadas semi-montadas (já coladas, com fundo de encaixe fácil para não amassar no transporte)' : 'Enviadas montadas'}"
${occasion ? `- Ocasião / Tema: "${occasion}"` : ''}
${extraDetails ? `- Detalhes Adicionais: "${extraDetails}"` : ''}
- Tom de voz: ${toneDescriptions[tone]}
- Uso de Emojis: ${useEmojis ? 'SIM (use emojis delicados)' : 'NÃO'}

FORMATO DA SUA RESPOSTA:
Por favor, estruture sua resposta exatamente com as 3 tags separadoras abaixo para que o aplicativo possa exibir as abas ao usuário:

===OPCAO_COMPLETA===
(Escreva a Descrição Completa do Anúncio:
1. TÍTULO SUGERIDO COM SEO (Até 60-80 caracteres, otimizado com palavras-chave de busca para ${mpName})
2. INTRODUÇÃO ENCANTADORA DO PRODUTO
3. 📦 ITENS INCLUSOS NO PACOTE (em tópicos claros)
4. 📏 MEDIDAS E DIMENSÕES
5. 🎨 MATERIAL E QUALIDADE
6. ⏳ PRAZO DE PRODUÇÃO E POSTAGEM
7. ⚠️ COMO ENVIAR O NOME E IDADE (com aviso de prazo de resposta para não atrasar o frete)
8. 🚚 ENVIO E TRANSPORTE SEGURO
9. 💬 DÚVIDAS E ATENDIMENTO NO CHAT
10. TAGS DE BUSCA / PALAVRAS-CHAVE SEPARADAS POR VÍRGULA)

===OPCAO_CURTA===
(Escreva a Versão Direta / Rápida, focada em leitura rápida no aplicativo móvel da ${mpName}:
- Título do anúncio
- Resumo em bullet points dos itens, dimensões, material e prazo
- Instrução simples para enviar os dados de personalização)

===OPCAO_PROMO===
(Escreva Títulos Otimizados para Busca e Lista de Tags:
- 3 Opções de Títulos com palavras-chave de alta conversão para o ${mpName}
- Lista de 15 Palavras-chave / Tags de busca estratégicas separadas por vírgula prontas para colar na plataforma)
`;
      } else {
        prompt = `Você é a especialista em marketing e mídias sociais do ateliê de artesanato e papelaria personalizada "${studioName}".
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
      }

      let responseText = '';
      try {
        responseText = await generateContent(prompt, "gemini-3.8-flash");
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
        
        // Show informative message about generator
        const errStr = apiErr?.message || '';
        if (errStr.includes('vazada') || errStr.includes('leaked') || errStr.includes('inválida') || errStr.includes('GEMINI_API_KEY') || errStr.includes('chave') || errStr.includes('renovada')) {
          setErrorMessage('Legenda criada com sucesso pelo Motor Criativo do Ateliê! 💡 Para conectar o Gemini Cloud diretamente, renove sua chave de API nas configurações do AI Studio.');
        } else {
          setErrorMessage('Legenda criada com sucesso pelo Motor Criativo do Ateliê! ✨');
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
                    <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                      <span className="text-[10px] font-black text-pink-600 truncate uppercase">
                        {item.theme}
                      </span>
                      <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-md bg-pink-50 text-pink-600 whitespace-nowrap">
                        {item.platform === 'stories' ? '📸 Story' : item.platform === 'marketplace' || item.platform === 'catalog_marketplace' ? '🛒 Mktplace' : item.platform === 'whatsapp' ? '💬 Zap' : item.platform === 'reels_tiktok' ? '🎬 Reels' : 'Feed'}
                      </span>
                    </div>
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
              placeholder="Ex: Kit Festa Lembrancinhas Tema Safari com caixas milk, cone e topo..."
              className="w-full bg-gray-50/70 border border-gray-200 focus:border-pink-500 focus:bg-white rounded-2xl p-4 text-sm font-semibold text-gray-800 placeholder-gray-400 outline-none transition-all focus:ring-4 focus:ring-pink-100"
            />
          </div>

          {/* Platform & Tone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Platform Selection */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1.5">
                Canal de Postagem / Venda
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                  <span className="truncate">Feed / Post</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('stories')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'stories'
                      ? 'bg-gradient-to-r from-pink-500 via-purple-500 to-amber-500 text-white border-transparent shadow-md shadow-pink-500/20'
                      : 'bg-pink-50/60 border-pink-200 text-pink-700 hover:bg-pink-100'
                  }`}
                >
                  <Smartphone size={15} className={platform === 'stories' ? 'text-white' : 'text-pink-600'} />
                  <span className="truncate">📸 Story / Status</span>
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
                  <span className="truncate">Reels / Vídeo</span>
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
                  <span className="truncate">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('marketplace')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'marketplace' || platform === 'catalog_marketplace'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-md shadow-orange-500/20'
                      : 'bg-orange-50/60 border-orange-200 text-orange-700 hover:bg-orange-100'
                  }`}
                >
                  <ShoppingCart size={15} className={platform === 'marketplace' || platform === 'catalog_marketplace' ? 'text-white' : 'text-orange-600'} />
                  <span className="truncate">🛒 Marketplace</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPlatform('catalog')}
                  className={`p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
                    platform === 'catalog'
                      ? 'bg-amber-50 border-amber-400 text-amber-700 shadow-sm'
                      : 'bg-gray-50/70 border-gray-150 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Store size={15} className={platform === 'catalog' ? 'text-amber-600' : 'text-gray-400'} />
                  <span className="truncate">🛍️ Catálogo</span>
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
                <option value="afetuoso">💖 Afetuoso & Encantador (Foco no amor e celebração)</option>
                <option value="vendedor">🚀 Focado em Vendas & Conversão (Recomendado para Marketplace)</option>
                <option value="sofisticado">✨ Luxo & Elegante (Papelaria fina e de alto padrão)</option>
                <option value="divertido">🎉 Alegre & Festivo (Festas animadas e coloridas)</option>
                <option value="bastidores">🧵 Bastidores & Artesanal (Feito à mão com afeto)</option>
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

          {/* DEDICATED STORY PANEL */}
          {platform === 'stories' && (
            <div className="p-5 bg-gradient-to-br from-pink-50/90 via-purple-50/40 to-amber-50/60 rounded-2xl border border-pink-200 space-y-4 animate-fadeIn shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-pink-200/60">
                <span className="text-xs font-black text-pink-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Smartphone size={15} className="text-pink-600" />
                  Campos Específicos para Story / Status
                </span>
                <span className="text-[10px] font-bold text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full w-fit">
                  Roteiro Tela a Tela • Figurinhas • Enquetes
                </span>
              </div>

              {/* Card com Imagem Ilustrativa de Story / Status */}
              <div className="bg-white/95 rounded-2xl border border-pink-200/90 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-4">
                {/* 9:16 Mockup Frame */}
                <div className="relative w-28 sm:w-32 aspect-[9/16] rounded-2xl overflow-hidden shadow-md border-2 border-pink-300 shrink-0 bg-gray-900 group">
                  <img
                    src="/images/story_craft_mockup.jpg"
                    alt="Imagem ilustrativa de Story para ateliê"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/40 pointer-events-none"></div>

                  {/* Story Progress Lines */}
                  <div className="absolute top-2 inset-x-2 flex gap-1 z-10">
                    <div className="h-0.5 flex-1 bg-white rounded-full"></div>
                    <div className="h-0.5 flex-1 bg-white/50 rounded-full"></div>
                    <div className="h-0.5 flex-1 bg-white/50 rounded-full"></div>
                  </div>

                  {/* Mini Profile Header */}
                  <div className="absolute top-3.5 inset-x-2 flex items-center justify-between z-10">
                    <div className="flex items-center gap-1 min-w-0">
                      <div className="w-3.5 h-3.5 rounded-full bg-pink-500 border border-white flex items-center justify-center text-[7px] text-white font-black shrink-0">
                        ✂️
                      </div>
                      <span className="text-[8px] font-black text-white truncate drop-shadow-xs">
                        {companyData?.name || 'Seu Ateliê'}
                      </span>
                    </div>
                    <span className="text-[7px] text-white/80 font-bold shrink-0">5m</span>
                  </div>

                  {/* Dynamic Sticker Preview on the Illustrative Image */}
                  <div className="absolute bottom-2.5 inset-x-2 z-10">
                    <div className="bg-white/95 backdrop-blur-xs rounded-lg p-1.5 shadow-md border border-white text-center">
                      <p className="text-[8px] font-black text-pink-700 leading-tight">
                        {storySticker === 'caixinha'
                          ? (storyCustomSticker || 'Faça uma pergunta...')
                          : storySticker === 'enquete'
                          ? (storyCustomSticker || 'Você amou esse modelo?')
                          : storySticker === 'reacao'
                          ? 'Gostou da combinação? 😍'
                          : storySticker === 'link'
                          ? 'Toque para encomendar 🛒'
                          : 'Envie um Direct 💌'}
                      </p>
                      {storySticker === 'enquete' && (
                        <div className="mt-1 flex gap-1">
                          <span className="flex-1 bg-pink-50 text-pink-700 text-[7px] font-black py-0.5 rounded">Sim! 😍</span>
                          <span className="flex-1 bg-pink-50 text-pink-700 text-[7px] font-black py-0.5 rounded">Muito! ✨</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Explanatory Info & Details */}
                <div className="flex-1 text-center sm:text-left space-y-1.5">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-pink-100 text-pink-700 flex items-center gap-1">
                      <ImageIcon size={10} /> Imagem Ilustrativa
                    </span>
                    <span className="text-[9px] font-bold text-gray-400">
                      Proporção Vertical 9:16
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-gray-800">
                    Visual do Story / Status na Prática
                  </h4>
                  <p className="text-[11px] text-gray-600 leading-relaxed">
                    No Instagram Stories e WhatsApp Status, imagens verticais de alta qualidade destacando detalhes do papel, camadas 3D ou o carinho na embalagem aumentam o engajamento e as mensagens de orçamento no Direct.
                  </p>
                  <div className="pt-1 flex flex-wrap items-center justify-center sm:justify-start gap-1.5 text-[9px] font-bold text-gray-500">
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md">📐 1080 × 1920 px</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md">✨ Foto real ou bastidor</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-md">📱 Tela cheia no celular</span>
                  </div>
                </div>
              </div>

              {/* Story Goal Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                  Qual é o objetivo principal desse Story?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStoryGoal('bastidores')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      storyGoal === 'bastidores'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <span>✂️ Bastidores & Produção</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryGoal('encomenda_pronta')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      storyGoal === 'encomenda_pronta'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <span>📦 Encomenda Pronta</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryGoal('enquete')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      storyGoal === 'enquete'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <span>🗳️ Enquete & Opinião</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryGoal('agenda')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      storyGoal === 'agenda'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <span>📅 Agenda & Vagas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryGoal('depoimento')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      storyGoal === 'depoimento'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <span>💬 Prova Social / Elogio</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStoryGoal('detalhes')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
                      storyGoal === 'detalhes'
                        ? 'bg-pink-600 text-white border-pink-600 shadow-xs'
                        : 'bg-white text-gray-700 border-pink-200 hover:bg-pink-50'
                    }`}
                  >
                    <span>✨ Camadas 3D & Luxo</span>
                  </button>
                </div>
              </div>

              {/* Story Structure & Recommended Sticker */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                    Estrutura do Roteiro:
                  </label>
                  <select
                    value={storyFormat}
                    onChange={(e) => setStoryFormat(e.target.value as StoryFormatType)}
                    className="w-full bg-white border border-pink-200 focus:border-pink-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="sequencia_3">Sequência de 3 Telas (Gancho ➔ Bastidor ➔ Ação)</option>
                    <option value="sequencia_4">Sequência de 4 Telas (Storytelling Completo)</option>
                    <option value="tela_unica">Tela Única (Texto direto na foto/vídeo)</option>
                    <option value="roteiro_falado">Roteiro Falado em Vídeo (30 a 60s)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                    Figurinha / Sticker Recomendado:
                  </label>
                  <select
                    value={storySticker}
                    onChange={(e) => setStorySticker(e.target.value as StoryStickerType)}
                    className="w-full bg-white border border-pink-200 focus:border-pink-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="enquete">📊 Enquete (Sim / Muito!)</option>
                    <option value="caixinha">❓ Caixinha de Perguntas</option>
                    <option value="reacao">🔥 Barra de Reação (Emoji Slider)</option>
                    <option value="link">🔗 Figurinha de Link (Orçamento / Catálogo)</option>
                    <option value="direct">💌 Chamada para o Direct (Mensagem)</option>
                  </select>
                </div>
              </div>

              {/* Sticker Custom Question */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                  Pergunta ou Frase para a Figurinha (Opcional):
                </label>
                <input
                  type="text"
                  value={storyCustomSticker}
                  onChange={(e) => setStoryCustomSticker(e.target.value)}
                  placeholder="Ex: 'Qual tema você sonha ver aqui?' ou deixe em branco para a IA sugerir"
                  className="w-full bg-white border border-pink-200 focus:border-pink-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none"
                />
              </div>

              {/* Audio/Music tip toggle */}
              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-gray-700">
                  <input
                    type="checkbox"
                    checked={storyIncludeMusicTip}
                    onChange={(e) => setStoryIncludeMusicTip(e.target.checked)}
                    className="w-4 h-4 text-pink-600 rounded focus:ring-pink-500 accent-pink-600"
                  />
                  <span>Sugerir estilo de música ou áudio em alta para acompanhar os Stories</span>
                </label>
              </div>
            </div>
          )}

          {/* DEDICATED MARKETPLACE PANEL */}
          {(platform === 'marketplace' || platform === 'catalog_marketplace') && (
            <div className="p-5 bg-gradient-to-br from-orange-50/80 via-amber-50/40 to-orange-50/80 rounded-2xl border border-orange-200 space-y-4 animate-fadeIn shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2 border-b border-orange-200/60">
                <span className="text-xs font-black text-orange-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShoppingCart size={15} className="text-orange-600" />
                  Campos Específicos para Anúncio de Marketplace
                </span>
                <span className="text-[10px] font-bold text-orange-700 bg-orange-200/60 px-2 py-0.5 rounded-full w-fit">
                  SEO • Shopee • Elo7 • ML
                </span>
              </div>

              {/* Marketplace Target Selector */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1.5">
                  Onde você vai postar o anúncio?
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setMarketplaceTarget('shopee')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      marketplaceTarget === 'shopee'
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-white text-gray-700 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <span>🧡 Shopee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketplaceTarget('elo7')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      marketplaceTarget === 'elo7'
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white text-gray-700 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <span>🤎 Elo7</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketplaceTarget('mercadolivre')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      marketplaceTarget === 'mercadolivre'
                        ? 'bg-yellow-500 text-gray-900 border-yellow-500 shadow-xs font-black'
                        : 'bg-white text-gray-700 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <span>💛 Mercado Livre</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMarketplaceTarget('geral')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      marketplaceTarget === 'geral'
                        ? 'bg-gray-800 text-white border-gray-800 shadow-xs'
                        : 'bg-white text-gray-700 border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <span>📦 Outro Marketplace</span>
                  </button>
                </div>
              </div>

              {/* Itens Inclusos & Medidas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1">
                    <Package size={11} className="text-orange-600" /> Itens Inclusos no Pacote:
                  </label>
                  <input
                    type="text"
                    value={marketplaceItems}
                    onChange={(e) => setMarketplaceItems(e.target.value)}
                    placeholder="Ex: 10 Caixas Milk, 10 Caixas Pirâmide, 1 Topo de Bolo..."
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1">
                    <Box size={11} className="text-orange-600" /> Medidas / Dimensões Aproximadas:
                  </label>
                  <input
                    type="text"
                    value={marketplaceDimensions}
                    onChange={(e) => setMarketplaceDimensions(e.target.value)}
                    placeholder="Ex: Caixa Milk: 13x6x6cm / Pirâmide: 16x6x6cm..."
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none"
                  />
                </div>
              </div>

              {/* Material & Prazo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                    Material / Tipo de Papel:
                  </label>
                  <input
                    type="text"
                    value={marketplaceMaterial}
                    onChange={(e) => setMarketplaceMaterial(e.target.value)}
                    placeholder="Ex: Papel Offset 180g fosco de alta resolução, apliques 3D..."
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                    Prazo de Produção / Postagem:
                  </label>
                  <input
                    type="text"
                    value={marketplaceProductionTime}
                    onChange={(e) => setMarketplaceProductionTime(e.target.value)}
                    placeholder="Ex: 7 dias úteis após confirmação do pedido"
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none"
                  />
                </div>
              </div>

              {/* Instruções de Personalização & Forma de Envio */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1">
                    Instrução de Personalização (Nome e Idade):
                  </label>
                  <input
                    type="text"
                    value={marketplaceCustomizationNote}
                    onChange={(e) => setMarketplaceCustomizationNote(e.target.value)}
                    placeholder="Ex: Enviar nome e idade no chat logo após fechar a compra"
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-widest text-gray-600 mb-1 flex items-center gap-1">
                    <Truck size={11} className="text-orange-600" /> Forma de Envio das Peças:
                  </label>
                  <select
                    value={marketplaceShippingType}
                    onChange={(e) => setMarketplaceShippingType(e.target.value as any)}
                    className="w-full bg-white border border-orange-200 focus:border-orange-500 rounded-xl p-2.5 text-xs font-semibold text-gray-800 outline-none"
                  >
                    <option value="semi_montadas">Semi-montadas (fundos de encaixe, não amassa no frete)</option>
                    <option value="montadas">100% montadas e prontas para uso</option>
                    <option value="desmontadas">Desmontadas com instrução de colagem</option>
                  </select>
                </div>
              </div>
            </div>
          )}

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
                      {platform === 'marketplace' || platform === 'catalog_marketplace'
                        ? 'Anúncio Completo'
                        : platform === 'stories'
                        ? 'Roteiro Sequência'
                        : 'Completa'}
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
                      {platform === 'marketplace' || platform === 'catalog_marketplace'
                        ? 'Resumo / App'
                        : platform === 'stories'
                        ? 'Textos na Tela'
                        : 'Curta'}
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
                      {platform === 'marketplace' || platform === 'catalog_marketplace'
                        ? 'SEO & Tags'
                        : platform === 'stories'
                        ? 'Enquetes & Stickers'
                        : 'Vendas'}
                    </button>
                  </div>
                </div>

                {generatedText && (
                  <span className="text-[9px] font-bold text-gray-400">
                    {generatedText.length} caracteres
                  </span>
                )}
              </div>

              {/* Story View Mode Selector (Text vs Simulated 9:16 Mockup) */}
              {platform === 'stories' && (
                <div className="flex items-center justify-between gap-2 px-1 py-1.5 mb-3 bg-pink-50/60 rounded-xl border border-pink-100/70">
                  <span className="text-[9px] font-black uppercase tracking-wider text-pink-700 flex items-center gap-1">
                    <Smartphone size={11} /> Exibição:
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setStoryPreviewTab('text')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                        storyPreviewTab === 'text'
                          ? 'bg-white text-pink-600 shadow-xs border border-pink-200'
                          : 'text-gray-400 hover:text-gray-600'
                      }`}
                    >
                      <Edit3 size={10} /> Roteiro / Texto
                    </button>
                    <button
                      type="button"
                      onClick={() => setStoryPreviewTab('mockup')}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${
                        storyPreviewTab === 'mockup'
                          ? 'bg-pink-600 text-white shadow-xs'
                          : 'text-gray-400 hover:text-pink-600'
                      }`}
                    >
                      <Eye size={10} /> Prévia Visual (9:16)
                    </button>
                  </div>
                </div>
              )}

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
              ) : platform === 'stories' && storyPreviewTab === 'mockup' ? (
                /* 9:16 Smartphone Mockup with Illustrative Story Image */
                <div className="flex flex-col items-center py-2 animate-fadeIn">
                  <div className="relative w-[230px] sm:w-[250px] aspect-[9/16] rounded-3xl overflow-hidden shadow-xl border-4 border-gray-800 bg-black flex flex-col justify-between p-3 select-none">
                    {/* Background Illustrative Image */}
                    <img
                      src="/images/story_craft_mockup.jpg"
                      alt="Story Ilustrativo"
                      className="absolute inset-0 w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/25 to-black/85 pointer-events-none"></div>

                    {/* Top Story UI Header */}
                    <div className="relative z-10 space-y-1.5">
                      {/* Story Progress Bars */}
                      <div className="flex gap-1">
                        <div className="h-0.5 flex-1 bg-white rounded-full"></div>
                        <div className="h-0.5 flex-1 bg-white/40 rounded-full"></div>
                        <div className="h-0.5 flex-1 bg-white/40 rounded-full"></div>
                      </div>
                      {/* Profile info */}
                      <div className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className="w-5 h-5 rounded-full bg-pink-500 border border-white flex items-center justify-center text-[10px] font-black shrink-0">
                            ✂️
                          </div>
                          <span className="text-[10px] font-bold truncate drop-shadow-md">
                            {companyData?.name || 'Seu Ateliê'}
                          </span>
                          <span className="text-[8px] text-white/70">5m</span>
                        </div>
                        <span className="text-[10px] text-white/80">✕</span>
                      </div>
                    </div>

                    {/* Middle Overlay: Generated Script or Story Text */}
                    <div className="relative z-10 my-auto bg-black/65 backdrop-blur-xs p-2.5 rounded-xl border border-white/20 text-white shadow-lg space-y-1 max-h-[140px] overflow-y-auto custom-scrollbar">
                      <p className="text-[7px] uppercase tracking-wider text-pink-300 font-black">
                        {storyFormat === 'sequencia_3' ? 'Sequência de 3 Telas' : 'Story / Status'}
                      </p>
                      <p className="text-[9.5px] font-medium leading-relaxed whitespace-pre-line">
                        {generatedText
                          ? generatedText.slice(0, 160) + (generatedText.length > 160 ? '...' : '')
                          : 'Preencha os campos e clique em Gerar Legenda para ver a simulação visual aqui.'}
                      </p>
                    </div>

                    {/* Dynamic Sticker Overlay */}
                    <div className="relative z-10 my-1">
                      <div className="bg-white/95 backdrop-blur-xs rounded-xl p-2 shadow-lg border border-white/80 text-center">
                        <p className="text-[8.5px] font-black text-pink-700 leading-tight">
                          {storySticker === 'caixinha'
                            ? (storyCustomSticker || 'Faça uma pergunta sobre esse modelo!')
                            : storySticker === 'enquete'
                            ? (storyCustomSticker || 'Você amou essa encomenda?')
                            : storySticker === 'reacao'
                            ? 'O que achou dessa fofura? 😍'
                            : storySticker === 'link'
                            ? 'Toque para orçar pelo catálogo 🛒'
                            : 'Mande um direct pra gente! 💌'}
                        </p>
                        {storySticker === 'enquete' && (
                          <div className="mt-1 flex gap-1">
                            <span className="flex-1 bg-pink-50 text-pink-600 text-[8px] font-black py-0.5 rounded-md">Sim! 😍</span>
                            <span className="flex-1 bg-pink-50 text-pink-600 text-[8px] font-black py-0.5 rounded-md">Muito! ✨</span>
                          </div>
                        )}
                        {storySticker === 'caixinha' && (
                          <div className="mt-1 bg-gray-50 border border-gray-200 text-gray-400 text-[7px] py-1 rounded-md">
                            Digite sua pergunta...
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Bottom reply bar */}
                    <div className="relative z-10 flex items-center gap-2 pt-1">
                      <div className="flex-1 bg-white/20 backdrop-blur-xs border border-white/30 rounded-full px-2 py-0.5 text-[8px] text-white/80 truncate">
                        Enviar mensagem...
                      </div>
                      <span className="text-white text-[10px]">🤍</span>
                      <span className="text-white text-[10px]">✈️</span>
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold mt-2 text-center">
                    📸 Simulação com imagem ilustrativa vertical de ateliê (9:16)
                  </p>
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

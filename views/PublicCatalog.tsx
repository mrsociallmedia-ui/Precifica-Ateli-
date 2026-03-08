
import React, { useState, useEffect } from 'react';
import { Package, ExternalLink, MessageCircle, ShoppingCart, Info, Search, LayoutGrid, List } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Product, CompanyData, Material, Platform } from '../types';
import { calculateProjectBreakdown } from '../utils';

interface PublicCatalogProps {
  userEmail: string;
}

export const PublicCatalog: React.FC<PublicCatalogProps> = ({ userEmail }) => {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // No Supabase real, precisaríamos que a tabela user_data permitisse leitura pública por email
        // ou usar uma Edge Function. Para este ambiente, tentamos buscar diretamente.
        const { data, error } = await supabase
          .from('user_data')
          .select('app_state')
          .eq('user_email', userEmail.toLowerCase())
          .maybeSingle();

        if (error) throw error;

        if (data?.app_state) {
          const s = data.app_state;
          setProducts(s.craft_products || []);
          setCompanyData(s.craft_company || null);
          setMaterials(s.craft_materials || []);
          setPlatforms(s.craft_platforms || []);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo público:", err);
      } finally {
        setLoading(false);
      }
    };

    if (userEmail) fetchData();
  }, [userEmail]);

  const categories = ['Todas', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todas' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleWhatsAppContact = (productName: string, price: number) => {
    if (!companyData?.phone) return;
    const phone = companyData.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Vi o produto *${productName}* (R$ ${price.toFixed(2)}) no seu catálogo online e gostaria de saber mais informações.`);
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 border-4 border-pink-200 border-t-pink-500 rounded-full animate-spin"></div>
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Carregando Catálogo...</p>
      </div>
    );
  }

  if (!companyData && !loading) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
          <Package size={48} className="text-gray-300" />
        </div>
        <h2 className="text-2xl font-black text-gray-800 mb-2">Catálogo não encontrado</h2>
        <p className="text-gray-400 max-w-xs">O ateliê solicitado ainda não configurou seu catálogo online ou o link está incorreto.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fffcf5] font-['Quicksand'] text-[#4b5563]">
      {/* HEADER DO ATELIÊ */}
      <header className="bg-white border-b border-pink-50 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-pink-500 rounded-2xl flex items-center justify-center shadow-lg overflow-hidden shrink-0">
              {companyData?.logo ? (
                <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <Package size={24} className="text-white" />
              )}
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight leading-none">{companyData?.name || 'Meu Ateliê'}</h1>
              <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mt-1">Catálogo Online</p>
            </div>
          </div>
          {companyData?.phone && (
            <button 
              onClick={() => window.open(`https://wa.me/${companyData.phone?.replace(/\D/g, '')}`, '_blank')}
              className="bg-green-500 text-white p-3 rounded-2xl hover:bg-green-600 transition-all shadow-lg shadow-green-100 flex items-center gap-2"
            >
              <MessageCircle size={20} />
              <span className="hidden sm:inline font-black text-xs uppercase tracking-widest">Falar no Zap</span>
            </button>
          )}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {/* FILTROS E BUSCA */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="relative flex-1">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
            <input 
              type="text" 
              placeholder="O que você está procurando?" 
              className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-[2rem] shadow-sm outline-none focus:ring-2 focus:ring-pink-400 transition-all font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border ${
                  selectedCategory === cat 
                    ? 'bg-pink-500 text-white border-pink-500 shadow-lg' 
                    : 'bg-white text-gray-400 border-gray-100 hover:border-pink-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* GRID DE PRODUTOS */}
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(p => {
              // Cálculo de preço sugerido caso não tenha preço de mercado definido
              const mockProject = { 
                items: [{ productId: p.id, name: p.name, quantity: 1, hoursToMake: p.minutesToMake / 60, materials: p.materials, profitMargin: p.profitMargin }], 
                platformId: platforms[0]?.id || '', 
                excedente: companyData?.defaultExcedente || 10 
              };
              const breakdown = calculateProjectBreakdown(mockProject as any, materials, platforms, companyData!);
              const finalPrice = p.marketPrice > 0 ? p.marketPrice : breakdown.finalPrice;

              return (
                <div key={p.id} className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all group flex flex-col">
                  <div className="aspect-square bg-gray-50 relative overflow-hidden">
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-200">
                        <Package size={64} />
                      </div>
                    )}
                    <div className="absolute top-4 right-4">
                      <span className="text-[9px] font-black text-pink-500 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full uppercase tracking-widest shadow-sm border border-pink-50">
                        {p.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 flex flex-col flex-1">
                    <h3 className="text-lg font-black text-gray-800 mb-2 group-hover:text-pink-600 transition-colors">{p.name}</h3>
                    <p className="text-xs text-gray-400 font-medium line-clamp-2 mb-6 flex-1">
                      {p.description || 'Peça personalizada produzida com materiais de alta qualidade e acabamento impecável.'}
                    </p>
                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-gray-50">
                      <div>
                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-1">Valor Unitário</p>
                        <p className="text-2xl font-black text-gray-800">R$ {finalPrice.toFixed(2)}</p>
                      </div>
                      <button 
                        onClick={() => handleWhatsAppContact(p.name, finalPrice)}
                        className="bg-pink-500 text-white p-4 rounded-2xl hover:bg-pink-600 transition-all shadow-lg shadow-pink-100 group-hover:scale-110"
                        title="Pedir no WhatsApp"
                      >
                        <ShoppingCart size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Search size={32} className="text-gray-200" />
            </div>
            <h3 className="text-xl font-black text-gray-800 mb-2">Nenhum produto encontrado</h3>
            <p className="text-gray-400">Tente buscar por outro termo ou categoria.</p>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-gray-100 py-12 mt-20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 bg-pink-500 rounded-lg flex items-center justify-center shadow-md">
              <img src="https://cdn-icons-png.flaticon.com/512/4230/4230588.png" alt="Logo" className="w-5 h-5 filter brightness-0 invert" />
            </div>
            <span className="text-pink-600 font-black text-lg tracking-tight">Calculiê</span>
          </div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.3em]">
            Tecnologia para Ateliês Criativos
          </p>
        </div>
      </footer>
    </div>
  );
};

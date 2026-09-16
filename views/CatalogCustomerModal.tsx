import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Home, 
  CheckCircle2, 
  RefreshCw, 
  Search, 
  LogOut, 
  ShieldCheck,
  FileText
} from 'lucide-react';
import { CatalogCustomerProfile } from '../types';

interface CatalogCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  initialProfile: CatalogCustomerProfile | null;
  onSaveProfile: (profile: CatalogCustomerProfile) => void;
  onLogout: () => void;
}

export const CatalogCustomerModal: React.FC<CatalogCustomerModalProps> = ({
  isOpen,
  onClose,
  userEmail,
  initialProfile,
  onSaveProfile,
  onLogout
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [complement, setComplement] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup' | 'delivery'>('pickup');
  
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setName(initialProfile.name || '');
      setPhone(initialProfile.phone || '');
      setEmail(initialProfile.email || '');
      setCpf(initialProfile.cpf || '');
      setZipCode(initialProfile.zipCode || '');
      setAddress(initialProfile.address || '');
      setNeighborhood(initialProfile.neighborhood || '');
      setCity(initialProfile.city || '');
      setComplement(initialProfile.complement || '');
      setDeliveryType(initialProfile.deliveryType || 'pickup');
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  // Busca automática por CEP usando ViaCEP
  const handleCepLookup = async (cepToSearch: string) => {
    const cleanCep = cepToSearch.replace(/\D/g, '');
    if (cleanCep.length !== 8) return;

    setIsSearchingCep(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(prev => prev ? prev : (data.logradouro || ''));
        setNeighborhood(data.bairro || '');
        setCity(`${data.localidade || ''}${data.uf ? ` - ${data.uf}` : ''}`);
      } else {
        setErrorMsg('CEP não encontrado. Preencha o endereço manualmente.');
      }
    } catch (e) {
      console.warn("Erro ao buscar CEP:", e);
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!name.trim()) {
      setErrorMsg('Por favor, informe seu nome completo.');
      return;
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMsg('Por favor, informe um número de WhatsApp válido com DDD (ex: 11999999999).');
      return;
    }

    setIsSaving(true);

    const profileData: CatalogCustomerProfile = {
      id: initialProfile?.id,
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      cpf: cpf.trim() || undefined,
      zipCode: zipCode.trim() || undefined,
      address: address.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
      city: city.trim() || undefined,
      complement: complement.trim() || undefined,
      deliveryType
    };

    // 1. Salvar no cache local do cliente
    try {
      localStorage.setItem('catalog_customer_profile', JSON.stringify(profileData));
    } catch (e) {}

    // 2. Sincronizar com o sistema do ateliê
    try {
      await fetch('/api/catalog/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail,
          customer: profileData
        })
      });
    } catch (err) {
      console.warn("Aviso ao sincronizar cliente com servidor:", err);
    }

    onSaveProfile(profileData);
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-pink-100 overflow-hidden flex flex-col max-h-[92vh] animate-scaleIn"
        onClick={e => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-pink-500 to-rose-400 p-6 text-white relative">
          <button 
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 w-9 h-9 bg-white/20 hover:bg-white/30 text-white rounded-full flex items-center justify-center transition-all cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white border border-white/30 shadow-inner">
              <User size={24} />
            </div>
            <div>
              <h3 className="text-lg font-black tracking-tight">
                {initialProfile?.name ? 'Meu Perfil no Catálogo' : 'Cadastre-se no Catálogo'}
              </h3>
              <p className="text-xs text-white/90 font-medium">
                Seus dados salvos para agilizar seus pedidos e entregas
              </p>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl font-bold">
              {errorMsg}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-2xl font-bold flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Dados salvos com sucesso! Preenchimento automático ativado.</span>
            </div>
          )}

          {/* Dados Pessoais */}
          <div className="space-y-3">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-pink-500 flex items-center gap-1.5">
              <User size={13} /> Dados Pessoais
            </h4>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">
                Nome Completo <span className="text-red-500">*</span>
              </label>
              <input 
                type="text" 
                required
                placeholder="Ex: Maria Eduarda Silva"
                className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Phone size={11} className="text-emerald-500" /> WhatsApp / Celular <span className="text-red-500">*</span>
                </label>
                <input 
                  type="tel" 
                  required
                  placeholder="(11) 99999-9999"
                  className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                  <Mail size={11} className="text-blue-500" /> E-mail (Opcional)
                </label>
                <input 
                  type="email" 
                  placeholder="seuemail@exemplo.com"
                  className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1 flex items-center gap-1">
                <FileText size={11} className="text-gray-400" /> CPF (Opcional - p/ Pix e Recibo)
              </label>
              <input 
                type="text" 
                placeholder="000.000.000-00"
                className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                value={cpf}
                onChange={e => setCpf(e.target.value)}
              />
            </div>
          </div>

          {/* Endereço de Entrega */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h4 className="text-[11px] font-black uppercase tracking-widest text-pink-500 flex items-center gap-1.5">
              <MapPin size={13} /> Endereço Padrão de Entrega
            </h4>

            {/* CEP com Busca */}
            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">
                CEP (Busca automática de rua e bairro)
              </label>
              <div className="relative mt-1">
                <input 
                  type="text" 
                  placeholder="00000-000"
                  className="w-full p-3.5 pr-24 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                  value={zipCode}
                  onChange={e => {
                    const v = e.target.value;
                    setZipCode(v);
                    if (v.replace(/\D/g, '').length === 8) {
                      handleCepLookup(v);
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={() => handleCepLookup(zipCode)}
                  disabled={isSearchingCep || zipCode.replace(/\D/g, '').length !== 8}
                  className="absolute right-2 top-2 bottom-2 px-3 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl text-[10px] font-black uppercase tracking-wider disabled:opacity-40 flex items-center gap-1 transition-all cursor-pointer"
                >
                  {isSearchingCep ? <RefreshCw size={12} className="animate-spin" /> : <Search size={12} />}
                  <span>Buscar</span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">
                Rua e Número
              </label>
              <input 
                type="text" 
                placeholder="Ex: Rua das Flores, 120"
                className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                value={address}
                onChange={e => setAddress(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">
                  Bairro
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: Centro"
                  className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                  value={neighborhood}
                  onChange={e => setNeighborhood(e.target.value)}
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">
                  Cidade / UF
                </label>
                <input 
                  type="text" 
                  placeholder="Ex: São Paulo - SP"
                  className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                  value={city}
                  onChange={e => setCity(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider ml-1">
                Complemento (Opcional)
              </label>
              <input 
                type="text" 
                placeholder="Ex: Apto 32, Bloco B, Casa dos fundos"
                className="w-full mt-1 p-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-xs font-bold text-gray-800 outline-none focus:bg-white focus:border-pink-400 transition-all"
                value={complement}
                onChange={e => setComplement(e.target.value)}
              />
            </div>
          </div>

          <div className="p-3 bg-pink-50/50 rounded-2xl border border-pink-100 text-[11px] text-pink-900 flex items-center gap-2">
            <ShieldCheck size={16} className="text-pink-600 shrink-0" />
            <span>Seus dados ficam seguros no seu dispositivo e serão usados apenas para a confecção e entrega dos seus pedidos.</span>
          </div>

          {/* Botões do Rodapé */}
          <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-4 bg-pink-500 hover:bg-pink-600 active:scale-95 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-pink-200 transition-all cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Salvando Dados...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>Salvar Dados no Catálogo</span>
                </>
              )}
            </button>

            {initialProfile?.name && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Deseja desconectar seu perfil deste dispositivo?")) {
                    onLogout();
                    onClose();
                  }
                }}
                className="w-full sm:w-auto px-5 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 font-black text-xs uppercase tracking-wider rounded-2xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <LogOut size={14} />
                <span>Desconectar</span>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

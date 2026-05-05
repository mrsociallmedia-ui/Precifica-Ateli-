
import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Building2, 
  Zap, 
  Edit3, 
  X,
  Store,
  Clock,
  Briefcase,
  Calendar,
  Receipt,
  Headphones,
  MessageCircle,
  Mail,
  CalendarDays,
  Lock,
  ShieldCheck,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Users,
  Settings,
  Info
} from 'lucide-react';
import { CompanyData, Platform } from '../types';
import { supabase } from '../supabaseClient';

interface SettingsViewProps {
  companyData: CompanyData;
  setCompanyData: React.Dispatch<React.SetStateAction<CompanyData>>;
  platforms: Platform[];
  setPlatforms: React.Dispatch<React.SetStateAction<Platform[]>>;
  currentUser: string;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  companyData, setCompanyData, platforms, setPlatforms, currentUser 
}) => {
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [platformName, setPlatformName] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const [platformFixedFee, setPlatformFixedFee] = useState('');
  const [platformShippingSubsidy, setPlatformShippingSubsidy] = useState('');

  // Estados para Redefinição de Senha
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [isUpdatingPass, setIsUpdatingPass] = useState(false);
  const [passMessage, setPassMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    const totalMonthlyCosts = (Number(companyData.desiredSalary) || 0) + 
                             (Number(companyData.fixedCostsMonthly) || 0) + 
                             (Number(companyData.meiTax) || 0);
    
    const daily = Number(companyData.workHoursDaily) || 1;
    const days = Number(companyData.workDaysMonthly) || 1;
    const totalHours = daily * days;
    
    const calculatedRate = totalMonthlyCosts / (totalHours || 1);
    
    if (Math.abs(companyData.hourlyRate - calculatedRate) > 0.01) {
      setCompanyData(prev => ({ ...prev, hourlyRate: calculatedRate }));
    }
  }, [companyData.desiredSalary, companyData.fixedCostsMonthly, companyData.meiTax, companyData.workHoursDaily, companyData.workDaysMonthly, setCompanyData]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyData({ ...companyData, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (newPassword.length < 6) {
      setPassMessage({ type: 'error', text: 'A senha deve ter no mínimo 6 caracteres.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPassMessage({ type: 'error', text: 'As senhas não coincidem.' });
      return;
    }

    setIsUpdatingPass(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      
      setPassMessage({ type: 'success', text: 'Senha atualizada com sucesso!' });
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPassMessage({ type: 'error', text: err.message || 'Erro ao atualizar senha.' });
    } finally {
      setIsUpdatingPass(false);
    }
  };

  const openAddPlatform = () => {
    setEditingPlatform(null);
    setPlatformName('');
    setPlatformFee('');
    setPlatformFixedFee('');
    setPlatformShippingSubsidy('');
    setShowPlatformForm(true);
  };

  const openEditPlatform = (p: Platform) => {
    setEditingPlatform(p);
    setPlatformName(p.name);
    setPlatformFee(p.feePercentage.toString());
    setPlatformFixedFee(p.fixedFee?.toString() || '');
    setPlatformShippingSubsidy(p.shippingSubsidy?.toString() || '');
    setShowPlatformForm(true);
  };

  const handleSavePlatform = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName || platformFee === '') return;
    const fee = parseFloat(platformFee);
    const fixed = platformFixedFee ? parseFloat(platformFixedFee) : 0;
    const subsidy = platformShippingSubsidy ? parseFloat(platformShippingSubsidy) : 0;

    const platformData = {
      name: platformName,
      feePercentage: fee,
      fixedFee: fixed,
      shippingSubsidy: subsidy
    };

    if (editingPlatform) {
      setPlatforms(platforms.map(p => p.id === editingPlatform.id ? { ...p, ...platformData } : p));
    } else {
      setPlatforms([...platforms, { id: Date.now().toString(), ...platformData }]);
    }
    setShowPlatformForm(false);
  };

  const deletePlatform = (id: string) => {
    if (confirm('Deseja excluir este canal de venda?')) {
      setPlatforms(platforms.filter(p => p.id !== id));
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn pb-20 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight">Configuração do <span className="text-blue-500">Ateliê</span></h2>
          <p className="text-gray-400 font-medium text-sm">Gerencie seu perfil, horários e canais de venda.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1 space-y-6">
            <div className="flex flex-col items-center gap-6">
              <div className="relative group">
                <div className="w-48 h-48 bg-white rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center relative">
                  {companyData.logo ? (
                    <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-gray-300 text-center p-4">
                      <Camera size={48} className="mx-auto mb-2 opacity-30" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Logo Ateliê</p>
                    </div>
                  )}
                </div>
                <label className="absolute -bottom-2 -right-2 bg-pink-500 p-4 rounded-3xl text-white shadow-xl cursor-pointer hover:scale-110 transition-transform active:scale-95">
                  <Camera size={20} />
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                </label>
              </div>
              
              <div className="p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100/50 text-center w-full">
                 <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Status da Conta</p>
                 <p className="text-xs font-bold text-blue-700 truncate">{currentUser}</p>
              </div>
            </div>

            {/* Seção de Suporte */}
            <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-green-50 space-y-6">
              <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-[10px] tracking-widest border-b border-gray-50 pb-4">
                <Headphones size={16} className="text-green-500" /> Suporte & Atendimento
              </h4>
              <div className="space-y-4">
                <a 
                  href="https://wa.me/5566992442924" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-green-50 rounded-2xl border border-green-100 hover:bg-green-100 transition-colors group"
                >
                  <div className="p-2 bg-green-500 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none mb-1">WhatsApp</p>
                    <p className="text-sm font-black text-gray-700 leading-none">(66) 99244-2924</p>
                  </div>
                </a>

                <a 
                  href="mailto:mrsociallmedia@gmail.com"
                  className="flex items-center gap-3 p-4 bg-blue-50 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-colors group"
                >
                  <div className="p-2 bg-blue-500 text-white rounded-xl shadow-sm group-hover:scale-110 transition-transform">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">E-mail</p>
                    <p className="text-sm font-black text-gray-700 leading-none truncate w-32 md:w-full">mrsociallmedia@gmail.com</p>
                  </div>
                </a>

                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <div className="flex items-center gap-2 mb-2 text-gray-400">
                     <CalendarDays size={14} />
                     <span className="text-[10px] font-black uppercase tracking-widest">Horário de Atendimento</span>
                  </div>
                  <p className="text-xs font-bold text-gray-600">Segunda à Sexta</p>
                  <div className="flex items-center gap-1 mt-1">
                     <Clock size={12} className="text-gray-300" />
                     <p className="text-xs font-black text-gray-800">08:00 às 18:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 space-y-8">
            {/* Perfil da Empresa */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-50 space-y-8">
              <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
                <Building2 size={16} className="text-blue-500" /> Perfil da Empresa
              </h4>
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Ateliê</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp de Contato</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CNPJ (Opcional)</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={companyData.cnpj} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            {/* Mão de Obra */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-8">
              <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
                <Briefcase size={16} className="text-pink-500" /> Mão de Obra & Horários
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Salário Desejado (R$)</label>
                  <input type="number" className="w-full p-4 bg-pink-50 border border-pink-100 rounded-2xl font-black text-pink-600" value={companyData.desiredSalary} onChange={e => setCompanyData({...companyData, desiredSalary: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custos Fixos Mensais (R$)</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={companyData.fixedCostsMonthly} onChange={e => setCompanyData({...companyData, fixedCostsMonthly: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                    <Receipt size={12} className="text-red-400" /> Taxa MEI / Simples (R$)
                  </label>
                  <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={companyData.meiTax} onChange={e => setCompanyData({...companyData, meiTax: parseFloat(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Clock size={12} /> Horas Trabalhadas por Dia</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={companyData.workHoursDaily} onChange={e => setCompanyData({...companyData, workHoursDaily: parseFloat(e.target.value) || 1})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1"><Calendar size={12} /> Dias Trabalhados por Mês</label>
                  <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={companyData.workDaysMonthly} onChange={e => setCompanyData({...companyData, workDaysMonthly: parseFloat(e.target.value) || 1})} />
                </div>
              </div>
              
              <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white flex justify-between items-center shadow-lg shadow-blue-100">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Seu Valor por Hora Calculado</p>
                  <h4 className="text-4xl font-black">R$ {companyData.hourlyRate.toFixed(2)}</h4>
                </div>
                <Zap className="opacity-20" size={48} />
              </div>
            </div>

            {/* Canais de Venda */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-50 space-y-8">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                 <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest">
                   <Store size={16} className="text-yellow-500" /> Canais de Venda & Taxas
                 </h4>
                 <button 
                   onClick={openAddPlatform}
                   className="p-2 bg-yellow-400 text-yellow-900 rounded-xl hover:bg-yellow-500 transition-all flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                 >
                   <Plus size={14} /> Adicionar Canal
                 </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 {platforms.map(p => (
                   <div key={p.id} className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100 flex items-center justify-between group">
                      <div>
                         <p className="text-sm font-black text-gray-700">{p.name}</p>
                         <p className="text-xs font-black text-blue-500">{p.feePercentage}% de comissão</p>
                         {(p.fixedFee || 0) > 0 && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">+ R$ {p.fixedFee?.toFixed(2)} taxa fixa</p>}
                         {(p.shippingSubsidy || 0) > 0 && <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">- R$ {p.shippingSubsidy?.toFixed(2)} subsídio frete</p>}
                         {p.name.toLowerCase().includes('shopee') && (
                           <button 
                             onClick={() => document.getElementById('shopee-config')?.scrollIntoView({ behavior: 'smooth' })}
                             className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1 hover:underline flex items-center gap-1"
                           >
                             <Settings size={10} /> Configuração da sua Loja Shopee
                           </button>
                         )}
                         {p.name.toLowerCase().includes('elo7') && (
                           <div className="mt-2 flex items-center gap-2 px-2 py-1 bg-orange-50 rounded-lg border border-orange-100 w-fit">
                              <Info size={10} className="text-orange-500" />
                              <span className="text-[8px] font-black text-orange-600 uppercase tracking-widest">Configurado para Elo7</span>
                           </div>
                         )}
                      </div>
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => openEditPlatform(p)} className="p-2 text-gray-300 hover:text-blue-500 transition-colors">
                            <Edit3 size={16} />
                         </button>
                         <button onClick={() => deletePlatform(p.id)} className="p-2 text-gray-200 hover:text-red-500 transition-colors">
                            <Trash2 size={16} />
                         </button>
                      </div>
                   </div>
                 ))}
              </div>

              {/* Configuração Específica Shopee */}
              <div id="shopee-config" className="mt-10 pt-10 border-t border-gray-100 space-y-8">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                      <img src="https://cdn-icons-png.flaticon.com/512/5968/5968944.png" alt="Shopee" className="w-6 h-6 filter brightness-0 invert" />
                    </div>
                    <div>
                      <h5 className="text-sm font-black text-gray-800 uppercase tracking-tight">Configuração da sua Loja Shopee</h5>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Defina seu regime tributário para cálculos automáticos</p>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Cadastro na Shopee</label>
                    <div className="grid grid-cols-1 gap-3">
                      <button 
                        onClick={() => setCompanyData({...companyData, shopeeSellerType: 'cnpj'})}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${companyData.shopeeSellerType === 'cnpj' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${companyData.shopeeSellerType === 'cnpj' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <Building2 size={16} />
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-black uppercase tracking-widest ${companyData.shopeeSellerType === 'cnpj' ? 'text-orange-600' : 'text-gray-600'}`}>CNPJ</p>
                            <p className="text-[10px] font-medium text-gray-400">Vendedor Profissional / Empresa</p>
                          </div>
                        </div>
                        {companyData.shopeeSellerType === 'cnpj' && <CheckCircle2 size={18} className="text-orange-500" />}
                      </button>

                      <button 
                        onClick={() => setCompanyData({...companyData, shopeeSellerType: 'cpf_no_fee'})}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${companyData.shopeeSellerType === 'cpf_no_fee' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${companyData.shopeeSellerType === 'cpf_no_fee' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <Users size={16} />
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-black uppercase tracking-widest ${companyData.shopeeSellerType === 'cpf_no_fee' ? 'text-orange-600' : 'text-gray-600'}`}>CPF — Sem Taxa Extra</p>
                            <p className="text-[10px] font-medium text-gray-400">Até 450 pedidos nos últimos 90 dias</p>
                          </div>
                        </div>
                        {companyData.shopeeSellerType === 'cpf_no_fee' && <CheckCircle2 size={18} className="text-orange-500" />}
                      </button>

                      <button 
                        onClick={() => setCompanyData({...companyData, shopeeSellerType: 'cpf_with_fee'})}
                        className={`p-4 rounded-2xl border flex items-center justify-between transition-all ${companyData.shopeeSellerType === 'cpf_with_fee' ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-100' : 'bg-white border-gray-100 hover:border-orange-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${companyData.shopeeSellerType === 'cpf_with_fee' ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                            <AlertCircle size={16} />
                          </div>
                          <div className="text-left">
                            <p className={`text-xs font-black uppercase tracking-widest ${companyData.shopeeSellerType === 'cpf_with_fee' ? 'text-orange-600' : 'text-gray-600'}`}>CPF — +R$3,00 por pedido</p>
                            <p className="text-[10px] font-medium text-gray-400">Mais de 450 pedidos nos últimos 90 dias</p>
                          </div>
                        </div>
                        {companyData.shopeeSellerType === 'cpf_with_fee' && <CheckCircle2 size={18} className="text-orange-500" />}
                      </button>
                    </div>
                 </div>

                 <div className="space-y-4">
                    <h6 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tabela de Comissão e Subsídio (Shopee)</h6>
                    <div className="overflow-hidden rounded-3xl border border-gray-100 shadow-sm bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-gray-50 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-3">Valor do item</th>
                            <th className="px-4 py-3">Comissão</th>
                            <th className="px-4 py-3">Subsídio Pix</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 font-bold text-gray-600">
                          <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">Até R$79,99</td>
                            <td className="px-4 py-3">20% + R$4 + R$3 de taxa vendedor CPF</td>
                            <td className="px-4 py-3">-</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">Acima de R$80 até R$99,99</td>
                            <td className="px-4 py-3">14% + R$16 + R$3 de taxa vendedor CPF</td>
                            <td className="px-4 py-3">5%</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">Acima de R$100 até R$199,99</td>
                            <td className="px-4 py-3">14% + R$20 + R$3 de taxa vendedor CPF</td>
                            <td className="px-4 py-3">5%</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">Acima de R$200 até R$499,99</td>
                            <td className="px-4 py-3">14% + R$26 + R$3 de taxa vendedor CPF</td>
                            <td className="px-4 py-3">5%</td>
                          </tr>
                          <tr className="hover:bg-gray-50/50 transition-colors">
                            <td className="px-4 py-3">Acima de R$500</td>
                            <td className="px-4 py-3">14% + R$26 + R$3 de taxa vendedor CPF</td>
                            <td className="px-4 py-3">8%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[9px] text-gray-400 font-medium italic px-1">
                      * A taxa de R$3 para vendedor CPF é aplicada apenas se o vendedor atingir o limite de pedidos conforme política da Shopee.
                    </p>
                 </div>
              </div>
            </div>


            {/* Segurança da Conta - REDEFINIR SENHA */}
            <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-8">
              <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
                <Lock size={16} className="text-gray-500" /> Segurança da Conta
              </h4>
              
              <form onSubmit={handleUpdatePassword} className="space-y-6">
                {passMessage && (
                  <div className={`p-4 rounded-2xl flex items-center gap-3 animate-fadeIn ${passMessage.type === 'success' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                    {passMessage.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                    <p className="text-xs font-bold">{passMessage.text}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <div className="relative">
                      <input 
                        type={showNewPass ? "text" : "password"} 
                        required 
                        className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-blue-50 transition-all" 
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Mínimo 6 dígitos"
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPass(!showNewPass)} 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500"
                      >
                        {showNewPass ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                    <input 
                      type={showNewPass ? "text" : "password"} 
                      required 
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-blue-50 transition-all" 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isUpdatingPass || !newPassword}
                  className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all hover:bg-black disabled:opacity-50"
                >
                  {isUpdatingPass ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                  {isUpdatingPass ? 'Processando...' : 'Redefinir Senha de Acesso'}
                </button>
              </form>
            </div>
          </div>
        </div>

      {showPlatformForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
            <button onClick={() => setShowPlatformForm(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
              <Store size={24} className="text-yellow-500" /> {editingPlatform ? 'Editar Canal' : 'Novo Canal'}
            </h3>
            <form onSubmit={handleSavePlatform} className="space-y-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome da Plataforma / Meio</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" placeholder="Ex: Shopee, Instagram, etc" value={platformName} onChange={e => setPlatformName(e.target.value)} />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Comissão (%)</label>
                  <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-blue-600" placeholder="0.00" value={platformFee} onChange={e => setPlatformFee(e.target.value)} />
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Taxa Fixa (R$)</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="0.00" value={platformFixedFee} onChange={e => setPlatformFixedFee(e.target.value)} />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subsídio Frete (R$)</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-black text-gray-700" placeholder="0.00" value={platformShippingSubsidy} onChange={e => setPlatformShippingSubsidy(e.target.value)} />
                 </div>
               </div>

               {platformName.toLowerCase().includes('shopee') && (
                 <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 space-y-4 animate-fadeIn">
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-6 h-6 bg-orange-500 rounded-lg flex items-center justify-center">
                       <Settings size={12} className="text-white" />
                     </div>
                     <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Configuração da sua Loja Shopee</span>
                   </div>
                   
                   <div className="grid grid-cols-1 gap-2">
                     {[
                       { id: 'cnpj', label: 'CNPJ', sub: 'Empresa' },
                       { id: 'cpf_no_fee', label: 'CPF', sub: 'Até 450 ped.' },
                       { id: 'cpf_with_fee', label: 'CPF + R$3', sub: '> 450 ped.' }
                     ].map(type => (
                       <button
                         key={type.id}
                         type="button"
                         onClick={() => setCompanyData({...companyData, shopeeSellerType: type.id as any})}
                         className={`p-3 rounded-xl border flex items-center justify-between transition-all ${companyData.shopeeSellerType === type.id ? 'bg-white border-orange-500 shadow-sm' : 'bg-white/50 border-gray-100'}`}
                       >
                         <div className="text-left">
                           <p className="text-[10px] font-black text-gray-700 uppercase">{type.label}</p>
                           <p className="text-[8px] font-bold text-gray-400 uppercase">{type.sub}</p>
                         </div>
                         {companyData.shopeeSellerType === type.id && <CheckCircle2 size={14} className="text-orange-500" />}
                       </button>
                     ))}
                   </div>
                   <p className="text-[8px] text-orange-400 font-bold uppercase text-center">Isso afetará todos os cálculos da Shopee</p>
                 </div>
               )}

               <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setShowPlatformForm(false)} className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 px-6 py-4 bg-yellow-400 text-yellow-900 font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-lg">Salvar Canal</button>
               </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

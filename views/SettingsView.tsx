
import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Save, 
  Plus, 
  Trash2, 
  Building2, 
  Calendar, 
  DollarSign, 
  Wallet, 
  Star, 
  Info, 
  Zap, 
  Edit3, 
  X,
  Download,
  Upload,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { CompanyData, Platform } from '../types';

interface SettingsViewProps {
  companyData: CompanyData;
  setCompanyData: React.Dispatch<React.SetStateAction<CompanyData>>;
  platforms: Platform[];
  setPlatforms: React.Dispatch<React.SetStateAction<Platform[]>>;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ 
  companyData, setCompanyData, platforms, setPlatforms 
}) => {
  const [showPlatformForm, setShowPlatformForm] = useState(false);
  const [editingPlatform, setEditingPlatform] = useState<Platform | null>(null);
  const [platformName, setPlatformName] = useState('');
  const [platformFee, setPlatformFee] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cálculo automático do valor da hora sempre que os campos dependentes mudarem
  useEffect(() => {
    const totalMonthlyCosts = (Number(companyData.desiredSalary) || 0) + 
                             (Number(companyData.fixedCostsMonthly) || 0) + 
                             (Number(companyData.meiTax) || 0);
    const hours = Number(companyData.workHoursMonthly) || 1;
    const calculatedRate = totalMonthlyCosts / hours;
    
    if (Math.abs(companyData.hourlyRate - calculatedRate) > 0.01) {
      setCompanyData(prev => ({ ...prev, hourlyRate: calculatedRate }));
    }
  }, [companyData.desiredSalary, companyData.fixedCostsMonthly, companyData.meiTax, companyData.workHoursMonthly, companyData.hourlyRate, setCompanyData]);

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

  const openPlatformForm = (platform?: Platform) => {
    if (platform) {
      setEditingPlatform(platform);
      setPlatformName(platform.name);
      setPlatformFee(platform.feePercentage.toString());
    } else {
      setEditingPlatform(null);
      setPlatformName('');
      setPlatformFee('');
    }
    setShowPlatformForm(true);
  };

  const handleSavePlatform = (e: React.FormEvent) => {
    e.preventDefault();
    if (!platformName || platformFee === '') return;
    const fee = parseFloat(platformFee);
    if (editingPlatform) {
      setPlatforms(platforms.map(p => p.id === editingPlatform.id ? { ...p, name: platformName, feePercentage: fee } : p));
    } else {
      setPlatforms([...platforms, { id: Date.now().toString(), name: platformName, feePercentage: fee }]);
    }
    setShowPlatformForm(false);
  };

  // Funções de Backup
  const handleExportData = () => {
    const data: Record<string, any> = {};
    const keys = [
      'craft_company', 'craft_materials', 'craft_customers', 'craft_platforms', 
      'craft_projects', 'craft_products', 'craft_transactions', 
      'craft_prod_categories', 'craft_trans_categories', 'craft_pay_methods',
      'precifica_users'
    ];
    
    keys.forEach(key => {
      const val = localStorage.getItem(key);
      if (val) data[key] = JSON.parse(val);
    });

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_precifica_atelie_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm('Atenção! Ao importar este backup, todos os dados ATUAIS serão substituídos. Deseja continuar?')) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        Object.entries(data).forEach(([key, value]) => {
          localStorage.setItem(key, JSON.stringify(value));
        });
        alert('Dados restaurados com sucesso! O aplicativo será recarregado.');
        window.location.reload();
      } catch (error) {
        alert('Erro ao processar o arquivo de backup. Certifique-se de que é um arquivo .json válido.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Configurações do <span className="text-blue-500">Ateliê</span></h2>
          <p className="text-gray-400 font-medium">Dados da sua empresa e base de cálculos automáticos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Logo e Perfil */}
        <div className="md:col-span-1 flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-48 h-48 bg-white rounded-[3rem] border-4 border-white shadow-2xl overflow-hidden flex items-center justify-center relative">
              {companyData.logo ? (
                <img src={companyData.logo} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <div className="text-gray-300 text-center p-4">
                  <Camera size={48} className="mx-auto mb-2 opacity-30" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sua Logo</p>
                </div>
              )}
            </div>
            <label className="absolute -bottom-2 -right-2 bg-pink-500 p-4 rounded-3xl text-white shadow-xl cursor-pointer hover:scale-110 transition-transform active:scale-95">
              <Camera size={20} />
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
            </label>
          </div>
          <div className="text-center">
            <h3 className="font-black text-gray-800 text-2xl tracking-tight">{companyData.name || 'Seu Ateliê'}</h3>
            <p className="text-pink-500 font-black text-[10px] uppercase tracking-[0.2em] mt-1">Gestão Profissional</p>
          </div>

          {/* Seção de Backup - Nova */}
          <div className="w-full bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100 space-y-4">
            <h4 className="font-black text-gray-700 flex items-center gap-2 uppercase text-[10px] tracking-widest border-b border-gray-50 pb-3">
              <ShieldCheck size={14} className="text-green-500" /> Segurança dos Dados
            </h4>
            <div className="space-y-3">
              <button 
                onClick={handleExportData}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-blue-50 text-gray-500 hover:text-blue-600 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <Download size={16} /> Exportar Backup
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-3 bg-gray-50 hover:bg-yellow-50 text-gray-500 hover:text-yellow-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
              >
                <Upload size={16} /> Restaurar Backup
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json" 
                onChange={handleImportData} 
              />
            </div>
            <div className="bg-yellow-50 p-3 rounded-xl flex gap-2">
               <AlertTriangle size={14} className="text-yellow-600 shrink-0" />
               <p className="text-[9px] text-yellow-800 font-bold leading-tight">
                 Seus dados ficam salvos apenas neste navegador. Recomendamos baixar um backup semanalmente.
               </p>
            </div>
          </div>
        </div>

        {/* Dados da Empresa */}
        <div className="md:col-span-2 space-y-8">
          {/* Identificação */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-50 space-y-8">
            <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Building2 size={16} /></div>
              Identificação & Contato
            </h4>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Ateliê / Logomarca</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                  value={companyData.name}
                  onChange={e => setCompanyData({...companyData, name: e.target.value})}
                  placeholder="Ex: Doce Papel Ateliê"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">WhatsApp de Vendas</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                    value={companyData.phone}
                    onChange={e => setCompanyData({...companyData, phone: e.target.value})}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CNPJ (Opcional)</label>
                  <input 
                    type="text" 
                    placeholder="00.000.000/0000-00"
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                    value={companyData.cnpj}
                    onChange={e => setCompanyData({...companyData, cnpj: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Precificação Base */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-8">
            <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
              <div className="p-2 bg-pink-50 text-pink-500 rounded-xl"><DollarSign size={16} /></div>
              Base de Cálculo da Sua Hora
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest flex items-center gap-1">
                   <Star size={10} /> Salário Desejado (Pró-labore)
                </label>
                <input 
                  type="number" step="100"
                  className="w-full p-4 bg-pink-50 border border-pink-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-400 font-black text-pink-600 text-xl"
                  value={companyData.desiredSalary}
                  onChange={e => setCompanyData({...companyData, desiredSalary: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                   <Calendar size={10} /> Horas de Trabalho por Mês
                </label>
                <input 
                  type="number"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-xl"
                  value={companyData.workHoursMonthly}
                  onChange={e => setCompanyData({...companyData, workHoursMonthly: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            <div className="p-8 bg-blue-500 rounded-[2.5rem] shadow-xl shadow-blue-100 text-white relative overflow-hidden group">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Cálculo Automático</p>
                    <h4 className="text-xl font-black">Seu Valor de Hora Trabalhada</h4>
                  </div>
                  <div className="bg-white/20 px-8 py-4 rounded-3xl backdrop-blur-md border border-white/30 text-center">
                    <p className="text-3xl font-black">R$ {companyData.hourlyRate.toFixed(2)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">por hora</p>
                  </div>
               </div>
               <Zap className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform" />
            </div>
          </div>

          {/* Plataformas */}
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-50 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-gray-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                Plataformas & Maquininhas
              </h4>
              <button 
                onClick={() => openPlatformForm()}
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm"
              >
                + Adicionar
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platforms.map(p => (
                <div key={p.id} className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-100 group">
                  <div className="flex flex-col">
                    <span className="text-sm font-black text-gray-700">{p.name}</span>
                    <span className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">{p.feePercentage}% de taxa</span>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openPlatformForm(p)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={18} /></button>
                    <button onClick={() => setPlatforms(platforms.filter(plat => plat.id !== p.id))} className="p-2 text-gray-200 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Plataforma */}
      {showPlatformForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
            <button onClick={() => setShowPlatformForm(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors"><X size={24} /></button>
            <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
               <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl">{editingPlatform ? <Edit3 size={20} /> : <Plus size={20} />}</div>
               {editingPlatform ? 'Editar Taxa' : 'Nova Plataforma'}
            </h3>
            <form onSubmit={handleSavePlatform} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nome</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold" value={platformName} onChange={e => setPlatformName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Taxa (%)</label>
                <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold" value={platformFee} onChange={e => setPlatformFee(e.target.value)} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPlatformForm(false)} className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-4 bg-yellow-400 text-yellow-900 font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-lg">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

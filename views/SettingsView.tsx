
import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Plus, 
  Trash2, 
  Building2, 
  DollarSign, 
  Zap, 
  Edit3, 
  X,
  Info,
  Database,
  Download,
  Upload,
  CheckCircle2,
  ShieldCheck
} from 'lucide-react';
import { CompanyData, Platform } from '../types';

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
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success'>('idle');

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

  const handleExportData = () => {
    const userKey = currentUser.trim().toLowerCase();
    const keys = [
      'craft_company', 'craft_materials', 'craft_customers', 
      'craft_platforms', 'craft_projects', 'craft_products', 
      'craft_transactions', 'craft_prod_categories', 
      'craft_trans_categories', 'craft_pay_methods'
    ];
    
    const db: Record<string, any> = {};
    keys.forEach(k => {
      const data = localStorage.getItem(`${userKey}_${k}`);
      if (data) db[k] = JSON.parse(data);
    });

    const blob = new Blob([JSON.stringify(db, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_precifica_${userKey}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    setBackupStatus('success');
    setTimeout(() => setBackupStatus('idle'), 3000);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const db = JSON.parse(event.target?.result as string);
        const userKey = currentUser.trim().toLowerCase();
        
        if (confirm('Atenção: A importação irá substituir seus dados atuais. Deseja continuar?')) {
          Object.entries(db).forEach(([k, v]) => {
            localStorage.setItem(`${userKey}_${k}`, JSON.stringify(v));
          });
          alert('Dados importados com sucesso! O sistema irá reiniciar para aplicar as mudanças.');
          window.location.reload();
        }
      } catch (err) {
        alert('Erro ao importar arquivo. Verifique se o formato está correto.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-4xl font-black text-gray-800 tracking-tight">Configurações do <span className="text-blue-500">Ateliê</span></h2>
          <p className="text-gray-400 font-medium text-sm">Gerencie seu banco de dados e base de cálculos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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
            <p className="text-pink-500 font-black text-[10px] uppercase tracking-widest mt-1">Gestão Profissional</p>
          </div>

          {/* Seção Banco de Dados */}
          <div className="w-full bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
             <div className="flex items-center gap-2 mb-2">
                <Database size={18} className="text-blue-500" />
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Banco de Dados</h4>
             </div>
             
             <div className="space-y-3">
               <button 
                onClick={handleExportData}
                className="w-full py-3 bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
               >
                 {backupStatus === 'success' ? <CheckCircle2 size={16} /> : <Download size={16} />}
                 {backupStatus === 'success' ? 'Backup Concluído' : 'Exportar Backup'}
               </button>

               <label className="w-full py-3 bg-gray-50 hover:bg-yellow-50 text-gray-600 hover:text-yellow-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer">
                 <Upload size={16} /> Importar Banco
                 <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
               </label>
             </div>
             
             <div className="pt-4 border-t border-gray-50 flex items-center gap-2">
                <ShieldCheck size={14} className="text-green-500" />
                <span className="text-[9px] font-black text-gray-300 uppercase">Seus dados estão seguros</span>
             </div>
          </div>
          
          <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex gap-3 items-start">
             <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
             <p className="text-[11px] text-blue-700 font-bold leading-relaxed">
               As alterações são salvas automaticamente no banco de dados do usuário: <span className="text-blue-600">{currentUser}</span>.
             </p>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-50 space-y-8">
            <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Building2 size={16} /></div>
              Dados da Empresa
            </h4>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Ateliê / Fantasia</label>
                <input 
                  type="text" 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                  value={companyData.name}
                  onChange={e => setCompanyData({...companyData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp de Vendas</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                    value={companyData.phone}
                    onChange={e => setCompanyData({...companyData, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CNPJ (Opcional)</label>
                  <input 
                    type="text" 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold"
                    value={companyData.cnpj}
                    onChange={e => setCompanyData({...companyData, cnpj: e.target.value})}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-8">
            <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
              <div className="p-2 bg-pink-50 text-pink-500 rounded-xl"><DollarSign size={16} /></div>
              Custos e Mão de Obra
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest ml-1">Salário Desejado</label>
                <input 
                  type="number" step="100"
                  className="w-full p-4 bg-pink-50 border border-pink-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-400 font-black text-pink-600 text-xl"
                  value={companyData.desiredSalary}
                  onChange={e => setCompanyData({...companyData, desiredSalary: parseFloat(e.target.value) || 0})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Horas Mensais</label>
                <input 
                  type="number"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold text-xl text-gray-700"
                  value={companyData.workHoursMonthly}
                  onChange={e => setCompanyData({...companyData, workHoursMonthly: parseInt(e.target.value) || 1})}
                />
              </div>
            </div>

            <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">Cálculo da sua Mão de Obra</p>
                    <h4 className="text-xl font-black">Valor da sua Hora</h4>
                  </div>
                  <div className="bg-white/20 px-8 py-4 rounded-3xl backdrop-blur-md border border-white/30 text-center">
                    <p className="text-3xl font-black">R$ {companyData.hourlyRate.toFixed(2)}</p>
                    <p className="text-[9px] font-bold uppercase tracking-widest opacity-70">por hora</p>
                  </div>
               </div>
               <Zap className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-yellow-50 space-y-6">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-gray-700 flex items-center gap-2 uppercase text-xs tracking-widest">
                Plataformas de Venda
              </h4>
              <button 
                onClick={() => openPlatformForm()}
                className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
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
                    <button onClick={() => openPlatformForm(p)} className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl transition-all"><Edit3 size={16} /></button>
                    <button onClick={() => setPlatforms(platforms.filter(plat => plat.id !== p.id))} className="p-2 text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPlatformForm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-10 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-yellow-400"></div>
            <button onClick={() => setShowPlatformForm(false)} className="absolute top-6 right-6 text-gray-300 hover:text-gray-500 transition-colors"><X size={24} /></button>
            <h3 className="text-2xl font-black text-gray-800 mb-8 flex items-center gap-3">
               <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl">{editingPlatform ? <Edit3 size={20} /> : <Plus size={20} />}</div>
               {editingPlatform ? 'Editar Taxa' : 'Nova Taxa'}
            </h3>
            <form onSubmit={handleSavePlatform} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nome da Plataforma/Maquininha</label>
                <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold" value={platformName} onChange={e => setPlatformName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Taxa de Desconto (%)</label>
                <input type="number" step="0.01" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-yellow-400 font-bold" value={platformFee} onChange={e => setPlatformFee(e.target.value)} />
              </div>
              <div className="flex gap-4 pt-4">
                <button type="button" onClick={() => setShowPlatformForm(false)} className="flex-1 px-6 py-4 border-2 border-gray-50 text-gray-400 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-50 transition-all">Cancelar</button>
                <button type="submit" className="flex-1 px-6 py-4 bg-yellow-400 text-yellow-900 font-black rounded-2xl hover:bg-yellow-500 transition-all shadow-lg">Salvar Taxa</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

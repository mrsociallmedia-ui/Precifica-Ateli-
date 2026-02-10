
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
  Calendar,
  Cloud,
  CloudLightning,
  RefreshCw,
  Copy,
  Shield,
  ZapOff
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncCode, setSyncCode] = useState(() => localStorage.getItem('precifica_sync_id') || '');

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

  const handleGenerateSyncId = () => {
    if (syncCode) return;
    const newId = 'PR-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    localStorage.setItem('precifica_sync_id', newId);
    setSyncCode(newId);
    alert('Nuvem Ativada! Suas alterações serão sincronizadas automaticamente a partir de agora.');
  };

  const handleCloudSync = async () => {
    if (!syncCode) {
      handleGenerateSyncId();
    }
    
    setIsSyncing(true);
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
    db['precifica_users'] = JSON.parse(localStorage.getItem('precifica_users') || '[]');

    try {
      const response = await fetch(`https://api.npoint.io/${syncCode.replace('PR-', '')}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(db)
      });
      
      if (response.ok) {
        setBackupStatus('success');
        setTimeout(() => setBackupStatus('idle'), 3000);
      } else {
        throw new Error('Falha no upload');
      }
    } catch (error) {
      alert('Erro ao conectar com a Nuvem. Verifique sua internet.');
    } finally {
      setIsSyncing(false);
    }
  };

  const copySyncCode = () => {
    navigator.clipboard.writeText(syncCode);
    alert('Código de Sincronização copiado! Guarde-o para acessar em outros navegadores.');
  };

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
          alert('Dados importados! Reiniciando...');
          window.location.reload();
        }
      } catch (err) {
        alert('Erro ao importar arquivo.');
      }
    };
    reader.readAsText(file);
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

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fadeIn pb-20 px-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl md:text-4xl font-black text-gray-800 tracking-tight">Ajustes do <span className="text-blue-500">Ateliê</span></h2>
          <p className="text-gray-400 font-medium text-sm">Gerencie sua conta e sincronize dados na internet.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 flex flex-col items-center gap-6">
          {/* Card de Nuvem Inteligente */}
          <div className="w-full bg-gradient-to-br from-blue-600 to-blue-400 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden group">
            <div className="relative z-10 space-y-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-white/20 rounded-xl"><Cloud size={20} /></div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em]">Cloud Sync Ativo</h4>
              </div>
              
              <div>
                <h3 className="text-xl font-black">Nuvem Automática</h3>
                <p className="text-[10px] opacity-70 font-bold uppercase mt-1">Sincronização em Tempo Real</p>
              </div>

              {!syncCode ? (
                <button 
                  onClick={handleGenerateSyncId}
                  className="w-full py-3 bg-white text-blue-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <CloudLightning size={14} /> Ativar Agora
                </button>
              ) : (
                <div className="space-y-4 pt-2">
                  <div className="bg-white/10 p-3 rounded-2xl border border-white/20 backdrop-blur-sm">
                    <p className="text-[8px] font-black uppercase opacity-60 mb-1">Seu Código Universal</p>
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono font-black text-sm">{syncCode}</span>
                      <button onClick={copySyncCode} className="p-2 hover:bg-white/20 rounded-lg transition-all"><Copy size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="p-3 bg-blue-500/30 rounded-2xl border border-white/10">
                    <p className="text-[10px] leading-tight opacity-90 font-bold">
                      Suas alterações são enviadas para a nuvem automaticamente toda vez que você mexe no app.
                    </p>
                  </div>

                  <button 
                    onClick={handleCloudSync}
                    disabled={isSyncing}
                    className="w-full py-3 bg-white/10 text-white border border-white/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isSyncing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Forçar Sincronismo
                  </button>
                </div>
              )}
            </div>
            <CloudLightning className="absolute -bottom-6 -right-6 w-32 h-32 opacity-10 rotate-12 group-hover:scale-110 transition-transform" />
          </div>

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
          
          <div className="w-full bg-white p-7 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
             <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-500 rounded-xl"><Database size={18} /></div>
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Backup Local</h4>
             </div>
             <button onClick={handleExportData} className="w-full py-3.5 bg-gray-50 hover:bg-blue-50 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
               {backupStatus === 'success' ? <CheckCircle2 size={16} /> : <Download size={16} />}
               {backupStatus === 'success' ? 'Backup Concluído' : 'Exportar Arquivo'}
             </button>
             <label className="w-full py-3.5 bg-gray-50 hover:bg-yellow-50 text-gray-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer">
               <Upload size={16} /> Importar Arquivo
               <input type="file" accept=".json" className="hidden" onChange={handleImportData} />
             </label>
          </div>
        </div>

        <div className="md:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-blue-50 space-y-8">
            <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
              <Building2 size={16} className="text-blue-500" /> Dados da Empresa
            </h4>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Ateliê</label>
                <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={companyData.name} onChange={e => setCompanyData({...companyData, name: e.target.value})} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">WhatsApp</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={companyData.phone} onChange={e => setCompanyData({...companyData, phone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">CNPJ</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={companyData.cnpj} onChange={e => setCompanyData({...companyData, cnpj: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-pink-50 space-y-8">
            <h4 className="font-black text-gray-700 flex items-center gap-3 uppercase text-xs tracking-widest border-b border-gray-50 pb-4">
              <DollarSign size={16} className="text-pink-500" /> Custos de Mão de Obra
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-pink-400 uppercase tracking-widest">Salário Desejado</label>
                <input type="number" className="w-full p-4 bg-pink-50 border border-pink-100 rounded-2xl font-black text-pink-600" value={companyData.desiredSalary} onChange={e => setCompanyData({...companyData, desiredSalary: parseFloat(e.target.value) || 0})} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Custos Fixos</label>
                <input type="number" className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold" value={companyData.fixedCostsMonthly} onChange={e => setCompanyData({...companyData, fixedCostsMonthly: parseFloat(e.target.value) || 0})} />
              </div>
            </div>
            
            <div className="p-8 bg-blue-600 rounded-[2.5rem] text-white flex justify-between items-center">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-80">Seu Valor por Hora</p>
                <h4 className="text-4xl font-black">R$ {companyData.hourlyRate.toFixed(2)}</h4>
              </div>
              <Zap className="opacity-20" size={48} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

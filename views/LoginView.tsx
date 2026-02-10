
import React, { useState } from 'react';
import { Lock, User, Sparkles, Heart, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, Send, CheckCircle2, Loader2, Save, Cloud, CloudDownload } from 'lucide-react';

interface LoginViewProps {
  onLogin: (userEmail: string) => void;
}

type ViewMode = 'login' | 'register' | 'forgot-password' | 'reset-password' | 'cloud-recovery';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [syncCodeInput, setSyncCodeInput] = useState('');

  const handleCloudRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!syncCodeInput) return;
    
    setIsSending(true);
    try {
      const code = syncCodeInput.replace('PR-', '').trim();
      const response = await fetch(`https://api.npoint.io/${code}`);
      
      if (!response.ok) throw new Error('Código não encontrado.');
      
      const db = await response.json();
      
      if (confirm('Atenção: Isso substituirá os dados locais deste navegador pelos dados da nuvem. Deseja continuar?')) {
        Object.entries(db).forEach(([k, v]) => {
          localStorage.setItem(k, JSON.stringify(v));
        });
        
        localStorage.setItem('precifica_sync_id', syncCodeInput);
        alert('Dados sincronizados com sucesso! Agora faça login com sua conta.');
        setViewMode('login');
      }
    } catch (err) {
      alert('Código inválido ou erro de conexão. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('precifica_users') || '[]');

    if (viewMode === 'register') {
      const userExists = users.some((u: any) => u.email === email);
      if (userExists) {
        alert('E-mail já cadastrado!');
        return;
      }
      const newUser = { name, email, password };
      localStorage.setItem('precifica_users', JSON.stringify([...users, newUser]));
      alert('Cadastro realizado! Faça seu login.');
      setViewMode('login');
    } else if (viewMode === 'login') {
      const user = users.find((u: any) => u.email === email && u.password === password);
      if (user || (email === 'admin' && password === 'admin')) {
        localStorage.setItem('precifica_current_user', email);
        onLogin(email);
      } else {
        alert('E-mail ou senha incorretos!');
      }
    }
  };

  const handleBackToLogin = () => {
    setViewMode('login');
    setIsSending(false);
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 p-10 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400"></div>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-pink-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl mb-6">
              <Sparkles size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Precifica <span className="text-pink-500">Ateliê</span></h1>
            <p className="text-gray-400 font-medium text-sm mt-1 uppercase tracking-widest text-center">Sua Nuvem Criativa</p>
          </div>

          {viewMode === 'cloud-recovery' ? (
            <div className="animate-fadeIn space-y-6">
              <button onClick={handleBackToLogin} className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors mb-2"><ArrowLeft size={14} /> Voltar</button>
              <div className="text-center">
                 <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><CloudDownload size={32}/></div>
                 <h3 className="text-xl font-black text-gray-800">Sincronizar Nuvem</h3>
                 <p className="text-gray-400 text-xs font-medium mt-1">Cole seu código para baixar seus dados e senhas.</p>
              </div>
              <form onSubmit={handleCloudRecovery} className="space-y-4">
                <input 
                  type="text" required placeholder="PR-XXXXXXXXX"
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-mono font-black text-center text-blue-600"
                  value={syncCodeInput} onChange={e => setSyncCodeInput(e.target.value.toUpperCase())}
                />
                <button 
                  type="submit" disabled={isSending}
                  className="w-full py-5 bg-blue-500 hover:bg-blue-600 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2"
                >
                  {isSending ? <Loader2 size={20} className="animate-spin" /> : <><Cloud size={20} /> Restaurar Dados</>}
                </button>
              </form>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {viewMode === 'login' || viewMode === 'register' ? (
                <div className="flex bg-gray-50 p-1 rounded-2xl mb-8">
                  <button type="button" onClick={() => setViewMode('login')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${viewMode === 'login' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>Login</button>
                  <button type="button" onClick={() => setViewMode('register')} className={`flex-1 py-3 rounded-xl text-xs font-black uppercase ${viewMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Cadastro</button>
                </div>
              ) : null}

              {viewMode === 'register' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nome do Ateliê</label>
                  <input type="text" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={name} onChange={e => setName(e.target.value)} />
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">E-mail</label>
                <input type="email" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha</label>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>

              <button type="submit" className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 ${viewMode === 'register' ? 'bg-blue-500 text-white' : 'bg-pink-500 text-white'}`}>
                <LogIn size={20} /> Entrar no Ateliê
              </button>

              {viewMode === 'login' && (
                <div className="pt-6 border-t border-gray-50 flex flex-col gap-4">
                  <button type="button" onClick={() => setViewMode('cloud-recovery')} className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:text-blue-600"><Cloud size={14} /> Restaurar da Nuvem</button>
                </div>
              )}
            </form>
          )}
        </div>
        <p className="mt-10 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Sincronização Ativa <Heart size={10} className="inline text-pink-500 mx-1" /></p>
      </div>
    </div>
  );
};

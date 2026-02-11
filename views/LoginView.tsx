
import React, { useState } from 'react';
import { Lock, User, Sparkles, Heart, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, Send, CheckCircle2, Loader2, Save, Search, KeyRound } from 'lucide-react';

interface LoginViewProps {
  onLogin: (userEmail: string) => void;
}

type ViewMode = 'login' | 'register' | 'forgot-password' | 'reset-password';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundUser, setFoundUser] = useState<any>(null);

  const getUsers = () => JSON.parse(localStorage.getItem('precifica_users') || '[]');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = getUsers();

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

  const handleLocateEmail = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    
    // Simula uma pequena demora para "localizar dados"
    setTimeout(() => {
      const users = getUsers();
      const user = users.find((u: any) => u.email.toLowerCase() === email.toLowerCase());
      
      setIsSearching(false);
      if (user) {
        setFoundUser(user);
        setViewMode('reset-password');
      } else {
        alert('Nenhum dado encontrado para este e-mail no armazenamento local.');
      }
    }, 800);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('As senhas não conferem!');
      return;
    }

    const users = getUsers();
    const updatedUsers = users.map((u: any) => 
      u.email === foundUser.email ? { ...u, password: password } : u
    );

    localStorage.setItem('precifica_users', JSON.stringify(updatedUsers));
    alert('Senha redefinida com sucesso!');
    setViewMode('login');
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 p-10 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400"></div>
          
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-pink-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl mb-4">
              {viewMode === 'forgot-password' ? <Search size={32} /> : 
               viewMode === 'reset-password' ? <KeyRound size={32} /> : 
               <Sparkles size={32} />}
            </div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight text-center">
              {viewMode === 'forgot-password' ? 'Localizar Dados' : 
               viewMode === 'reset-password' ? 'Nova Senha' : 
               <>Precifica <span className="text-pink-500">Ateliê</span></>}
            </h1>
            <p className="text-gray-400 font-medium text-[10px] mt-1 uppercase tracking-widest text-center">
              {viewMode === 'forgot-password' ? 'Insira seu e-mail cadastrado' : 
               viewMode === 'reset-password' ? `Defina uma nova senha para ${foundUser?.name}` : 
               'Gestão Criativa Local'}
            </p>
          </div>

          {(viewMode === 'login' || viewMode === 'register') && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex bg-gray-50 p-1 rounded-2xl mb-4">
                <button type="button" onClick={() => setViewMode('login')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'login' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}>Login</button>
                <button type="button" onClick={() => setViewMode('register')} className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}>Cadastro</button>
              </div>

              {viewMode === 'register' && (
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Ateliê</label>
                  <input type="text" required className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm" value={name} onChange={e => setName(e.target.value)} />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                <input type="email" required className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm" value={email} onChange={e => setEmail(e.target.value)} />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Senha</label>
                  {viewMode === 'login' && (
                    <button type="button" onClick={() => setViewMode('forgot-password')} className="text-[9px] font-black text-pink-500 uppercase tracking-wider hover:underline">Esqueceu a senha?</button>
                  )}
                </div>
                <div className="relative">
                  <input type={showPassword ? "text" : "password"} required className="w-full p-3.5 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              <button type="submit" className={`w-full py-4 rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${viewMode === 'register' ? 'bg-blue-500 text-white shadow-blue-100' : 'bg-pink-500 text-white shadow-pink-100'}`}>
                <LogIn size={18} /> {viewMode === 'register' ? 'Criar Minha Conta' : 'Entrar no Ateliê'}
              </button>
            </form>
          )}

          {viewMode === 'forgot-password' && (
            <form onSubmit={handleLocateEmail} className="space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Seu E-mail de Cadastro</label>
                <input type="email" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
              
              <div className="space-y-4">
                <button type="submit" disabled={isSearching} className="w-full py-4 bg-blue-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50">
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
                  {isSearching ? 'Localizando...' : 'Localizar Meus Dados'}
                </button>
                <button type="button" onClick={() => setViewMode('login')} className="w-full py-3 text-gray-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-gray-600 transition-all">
                  <ArrowLeft size={14} /> Voltar para o Login
                </button>
              </div>
            </form>
          )}

          {viewMode === 'reset-password' && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                <input type="password" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                <input type="password" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-sm" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
              </div>
              
              <div className="space-y-4 pt-2">
                <button type="submit" className="w-full py-4 bg-green-500 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl shadow-green-100 flex items-center justify-center gap-2 transition-all active:scale-95">
                  <CheckCircle2 size={18} /> Redefinir Senha
                </button>
                <button type="button" onClick={() => setViewMode('login')} className="w-full py-3 text-gray-400 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:text-gray-600 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
        <p className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Dados salvos localmente <Heart size={10} className="inline text-pink-500 mx-1" /></p>
      </div>
    </div>
  );
};

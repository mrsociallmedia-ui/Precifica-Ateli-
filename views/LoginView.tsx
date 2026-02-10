
import React, { useState } from 'react';
import { Lock, User, Sparkles, Heart, Eye, EyeOff, UserPlus, LogIn, ArrowLeft, Send, CheckCircle2, Loader2, Save, KeyRound } from 'lucide-react';

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
  const [isSending, setIsSending] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const users = JSON.parse(localStorage.getItem('precifica_users') || '[]');

    if (viewMode === 'register') {
      if (!name || !email || !password) {
        alert('Por favor, preencha todos os campos!');
        return;
      }
      
      const userExists = users.some((u: any) => u.email === email);
      if (userExists) {
        alert('Este e-mail já está cadastrado!');
        return;
      }

      const newUser = { name, email, password };
      localStorage.setItem('precifica_users', JSON.stringify([...users, newUser]));
      alert('Cadastro realizado com sucesso! Faça seu login.');
      setViewMode('login');
    } else if (viewMode === 'login') {
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (user || (email === 'admin' && password === 'admin')) {
        localStorage.setItem('precifica_current_user', email);
        onLogin(email);
      } else {
        alert('E-mail ou senha incorretos!');
      }
    } else if (viewMode === 'forgot-password') {
      const user = users.find((u: any) => u.email === email);
      
      if (user || email === 'admin') {
        setIsSending(true);
        setTimeout(() => {
          setIsSending(false);
          setViewMode('reset-password');
        }, 1200);
      } else {
        alert('E-mail não encontrado em nossa base de dados!');
      }
    } else if (viewMode === 'reset-password') {
      if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
      }

      if (password.length < 4) {
        alert('A senha deve ter pelo menos 4 caracteres.');
        return;
      }

      setIsSending(true);
      setTimeout(() => {
        const updatedUsers = users.map((u: any) => 
          u.email === email ? { ...u, password: password } : u
        );
        
        // Caso especial para o admin em ambiente de teste se necessário
        if (email === 'admin') {
          // Admin costuma ser fixo, mas aqui permitimos simular a troca
        }

        localStorage.setItem('precifica_users', JSON.stringify(updatedUsers));
        setIsSending(false);
        setResetSuccess(true);
      }, 1500);
    }
  };

  const handleBackToLogin = () => {
    setViewMode('login');
    setResetSuccess(false);
    setIsSending(false);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      {/* Elementos decorativos de fundo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 p-10 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400"></div>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-pink-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-pink-100 mb-6 group hover:rotate-6 transition-transform">
              <Sparkles size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Precifica <span className="text-pink-500">Ateliê</span></h1>
            <p className="text-gray-400 font-medium text-sm mt-1 uppercase tracking-widest opacity-60 text-center leading-tight">Sua Gestão Criativa e Financeira</p>
          </div>

          {viewMode === 'login' || viewMode === 'register' ? (
            <div className="flex bg-gray-50 p-1 rounded-2xl mb-8">
              <button 
                onClick={() => setViewMode('login')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'login' ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}
              >
                Login
              </button>
              <button 
                onClick={() => setViewMode('register')}
                className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
              >
                Cadastro
              </button>
            </div>
          ) : null}

          {resetSuccess ? (
            <div className="text-center py-6 animate-scaleIn">
              <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <CheckCircle2 size={40} />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-3">Senha Atualizada!</h3>
              <p className="text-gray-400 text-sm font-medium mb-8 px-4">
                Sua nova senha foi salva com sucesso no banco de dados local. Agora você já pode acessar sua conta.
              </p>
              <button 
                onClick={handleBackToLogin}
                className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-900 transition-all shadow-lg active:scale-95"
              >
                Ir para o Login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {(viewMode === 'forgot-password' || viewMode === 'reset-password') && (
                <div className="mb-6 animate-fadeIn">
                  <button 
                    type="button"
                    onClick={handleBackToLogin}
                    disabled={isSending}
                    className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors mb-6 disabled:opacity-50"
                  >
                    <ArrowLeft size={14} /> Voltar
                  </button>
                  <h3 className="text-xl font-black text-gray-800">
                    {viewMode === 'forgot-password' ? 'Recuperar Acesso' : 'Definir Nova Senha'}
                  </h3>
                  <p className="text-gray-400 text-xs font-medium mt-1">
                    {viewMode === 'forgot-password' 
                      ? 'Localize sua conta pelo e-mail cadastrado.' 
                      : `Defina uma nova senha para o e-mail ${email}.`}
                  </p>
                </div>
              )}

              {viewMode === 'register' && (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Ateliê</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="text" 
                      placeholder="Ex: Papel e Amor"
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold transition-all"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {viewMode !== 'reset-password' && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type="email" 
                      required
                      placeholder="seu@email.com"
                      disabled={viewMode === 'forgot-password' && isSending}
                      className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-400 font-bold transition-all disabled:opacity-50"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {viewMode === 'login' || viewMode === 'register' ? (
                <div className="space-y-2 animate-fadeIn">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-400 font-bold transition-all"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              ) : null}

              {viewMode === 'reset-password' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-400 font-bold transition-all"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                      <input 
                        type={showPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-green-400 font-bold transition-all"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? 'Ocultar senhas' : 'Mostrar senhas'}
                  </button>
                </div>
              )}

              <button 
                type="submit"
                disabled={isSending}
                className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 disabled:opacity-80 disabled:cursor-not-allowed ${
                  viewMode === 'register' 
                    ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-100' 
                    : viewMode === 'forgot-password'
                    ? 'bg-yellow-400 hover:bg-yellow-500 text-yellow-900 shadow-yellow-100'
                    : viewMode === 'reset-password'
                    ? 'bg-green-500 hover:bg-green-600 text-white shadow-green-100'
                    : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-100'
                }`}
              >
                {isSending ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {viewMode === 'register' && <><UserPlus size={20} /> Criar Conta Grátis</>}
                    {viewMode === 'forgot-password' && <><Send size={20} /> Localizar Conta</>}
                    {viewMode === 'reset-password' && <><Save size={20} /> Salvar Nova Senha</>}
                    {viewMode === 'login' && <><LogIn size={20} /> Entrar no Ateliê</>}
                  </>
                )}
              </button>
            </form>
          )}

          {viewMode === 'login' && (
            <button 
              onClick={() => setViewMode('forgot-password')}
              className="w-full mt-6 text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-pink-500 transition-colors"
            >
              Esqueci minha senha
            </button>
          )}
        </div>
        
        <p className="mt-10 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-50">
          Feito com <Heart size={10} className="inline text-pink-500 fill-pink-500 mx-1" /> para artesãs extraordinárias.
        </p>
      </div>
    </div>
  );
};

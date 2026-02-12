
import React, { useState } from 'react';
import { Sparkles, Heart, LogIn, ShieldCheck, Mail, Lock, UserPlus, ArrowLeft, RefreshCw, AlertCircle, KeyRound, Monitor } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (import.meta as any).env?.VITE_SUPABASE_URL || (window as any).process?.env?.SUPABASE_URL || '';
const SUPABASE_KEY = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || (window as any).process?.env?.SUPABASE_ANON_KEY || '';
const supabase = (SUPABASE_URL && SUPABASE_KEY) ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

interface LoginViewProps {
  onLogin: (userEmail: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase) {
      setError("O banco de dados em nuvem não está configurado. Use o 'Modo Local' abaixo.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setMessage(null);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onLogin(data.user.email!);
      } 
      else if (mode === 'signup') {
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Cadastro realizado! Verifique seu e-mail para confirmar a conta.");
        setMode('login');
      } 
      else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage("E-mail de recuperação enviado com sucesso!");
      }
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro na autenticação.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGuestLogin = () => {
    onLogin('visitante@local.com');
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 relative overflow-hidden transition-all duration-500">
          
          <div className="flex bg-gray-50/50 p-2 border-b border-gray-100">
            <button 
              onClick={() => { setMode('login'); setError(null); setMessage(null); }}
              className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${mode === 'login' ? 'bg-white text-pink-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LogIn size={14} /> Entrar
            </button>
            <button 
              onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
              className={`flex-1 py-4 rounded-2xl font-black text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 ${mode === 'signup' ? 'bg-white text-blue-500 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <UserPlus size={14} /> Cadastrar
            </button>
          </div>

          <div className="p-10 pt-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-pink-500 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg mb-4 transform rotate-3">
                <Sparkles size={28} />
              </div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight text-center">
                Precifica <span className="text-pink-500">Ateliê</span>
              </h1>
              <p className="text-gray-400 font-bold text-[8px] mt-1 uppercase tracking-[0.2em]">
                {mode === 'forgot' ? 'Recuperação de Senha' : 'Gestão Criativa Profissional'}
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 animate-shake">
                <AlertCircle size={18} className="shrink-0" />
                <p className="text-xs font-bold leading-tight">{error}</p>
              </div>
            )}

            {message && (
              <div className="mb-6 p-4 bg-green-50 border border-green-100 rounded-2xl flex items-center gap-3 text-green-600">
                <ShieldCheck size={18} className="shrink-0" />
                <p className="text-xs font-bold leading-tight">{message}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-5">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Mail size={12} className="text-blue-400" /> E-mail
                </label>
                <input 
                  type="email" 
                  required 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  placeholder="seu@email.com"
                />
              </div>

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Lock size={12} className="text-pink-400" /> Senha
                  </label>
                  <input 
                    type="password" 
                    required 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-1 animate-slideDown">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-green-400" /> Confirmar Senha
                  </label>
                  <input 
                    type="password" 
                    required 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end px-2">
                  <button 
                    type="button" 
                    onClick={() => setMode('forgot')}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors flex items-center gap-1"
                  >
                    <KeyRound size={10} /> Esqueceu a senha?
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70 ${
                  mode === 'login' ? 'bg-pink-500 text-white shadow-pink-100 hover:bg-pink-600' :
                  mode === 'signup' ? 'bg-blue-500 text-white shadow-blue-100 hover:bg-blue-600' :
                  'bg-gray-800 text-white shadow-gray-100 hover:bg-black'
                }`}
              >
                {isSubmitting ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : mode === 'login' ? (
                  <LogIn size={18} />
                ) : mode === 'signup' ? (
                  <UserPlus size={18} />
                ) : (
                  <RefreshCw size={18} />
                )}
                {isSubmitting ? 'Processando...' : mode === 'login' ? 'Entrar no Ateliê' : mode === 'signup' ? 'Criar Conta' : 'Enviar E-mail'}
              </button>
            </form>

            <div className="relative my-8">
               <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-100"></div></div>
               <div className="relative flex justify-center text-[8px] font-black uppercase tracking-widest"><span className="bg-white px-4 text-gray-300">Ou use sem nuvem</span></div>
            </div>

            <button 
              onClick={handleGuestLogin}
              className="w-full py-4 bg-gray-50 text-gray-400 border border-gray-100 rounded-[2rem] font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 hover:text-gray-600 transition-all flex items-center justify-center gap-2"
            >
              <Monitor size={14} /> Entrar no Modo Local (Teste)
            </button>

            {mode === 'forgot' && (
              <div className="mt-6 flex justify-center">
                <button 
                  onClick={() => setMode('login')}
                  className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={12} /> Voltar para o Login
                </button>
              </div>
            )}
          </div>
        </div>
        
        <p className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          Feito com <Heart size={10} className="inline text-pink-500 mx-1" /> para artesãos
        </p>
      </div>
    </div>
  );
};

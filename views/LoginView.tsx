
import React, { useState, useEffect } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Sparkles, Heart, LogIn, ShieldCheck, Mail, Lock, UserPlus, ArrowLeft, RefreshCw, AlertCircle, KeyRound, Send, CheckCircle2, Hash } from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginViewProps {
  onLogin: (userEmail: string) => void;
}

type AuthMode = 'login' | 'signup' | 'forgot' | 'verify-reset';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otpToken, setOtpToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Fallback para quando o usuário clicar em um link de recuperação (embora queiramos o código)
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, _session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('verify-reset');
        setError(null);
        setMessage("Link de recuperação validado. Defina sua nova senha abaixo.");
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) onLogin(data.user.email!);
      } 
      else if (mode === 'signup') {
        if (password.length < 6) throw new Error("A senha deve ter pelo menos 6 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");
        
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        
        setMessage("Cadastro realizado! Verifique seu e-mail para confirmar sua conta.");
        setMode('login');
      } 
      else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        
        setMessage("Um código foi enviado ao seu e-mail. Insira-o abaixo para redefinir sua senha.");
        setMode('verify-reset');
      }
      else if (mode === 'verify-reset') {
        if (otpToken.length < 6) throw new Error("Insira o código de 6 dígitos.");
        if (password.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas não coincidem.");

        // Verifica o código e atualiza a senha no mesmo fluxo
        if (!supabase.isMock) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            email,
            token: otpToken,
            type: 'recovery'
          });
          if (verifyError) throw verifyError;

          const { error: updateError } = await supabase.auth.updateUser({ password });
          if (updateError) throw updateError;
        }

        setMessage("Sua senha foi atualizada com sucesso! Agora você já pode entrar.");
        setMode('login');
        setPassword('');
        setOtpToken('');
      }
    } catch (err: any) {
      let errorMsg = err.message || "Erro inesperado.";
      if (err.message?.includes("Invalid login credentials")) errorMsg = "E-mail ou senha incorretos.";
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 relative overflow-hidden">
          
          {(mode === 'login' || mode === 'signup') && (
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
          )}

          <div className="p-10 pt-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-14 h-14 bg-pink-500 rounded-[1.2rem] flex items-center justify-center text-white shadow-lg mb-4 transform rotate-3">
                <Sparkles size={28} />
              </div>
              <h1 className="text-xl font-black text-gray-800 tracking-tight text-center">
                Precifica <span className="text-pink-500">Ateliê</span>
              </h1>
              <p className="text-gray-400 font-bold text-[8px] mt-1 uppercase tracking-[0.2em]">
                {mode === 'forgot' ? 'Recuperação de Acesso' : 
                 mode === 'verify-reset' ? 'Definir Nova Senha' : 
                 'Sua gestão criativa profissional'}
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
                <CheckCircle2 size={18} className="shrink-0" />
                <p className="text-xs font-bold leading-tight">{message}</p>
              </div>
            )}

            <form onSubmit={handleAuth} className="space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Mail size={12} className="text-blue-400" /> E-mail
                </label>
                <input 
                  type="email" required 
                  className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                  value={email} onChange={e => setEmail(e.target.value)} 
                  placeholder="exemplo@gmail.com"
                />
              </div>

              {mode === 'verify-reset' && (
                <div className="space-y-1 animate-slideDown">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Hash size={12} /> Código de 6 Dígitos
                  </label>
                  <input 
                    type="text" required maxLength={6}
                    className="w-full p-4 bg-blue-50 border border-blue-100 rounded-2xl outline-none font-black text-blue-600 text-center text-xl tracking-[0.5em] focus:ring-4 focus:ring-blue-100 transition-all placeholder:text-gray-300" 
                    value={otpToken} onChange={e => setOtpToken(e.target.value.replace(/\D/g, ''))} 
                    placeholder="000000"
                  />
                </div>
              )}

              {mode !== 'forgot' && (
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <Lock size={12} className={`text-${mode === 'verify-reset' ? 'blue' : 'pink'}-400`} /> 
                    {mode === 'verify-reset' ? 'Nova Senha' : 'Senha'}
                  </label>
                  <input 
                    type="password" required 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                    value={password} onChange={e => setPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
              )}

              {(mode === 'signup' || mode === 'verify-reset') && (
                <div className="space-y-1 animate-slideDown">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                    <ShieldCheck size={12} className="text-green-400" /> Confirmar {mode === 'verify-reset' ? 'Nova Senha' : 'Senha'}
                  </label>
                  <input 
                    type="password" required 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} 
                    placeholder="••••••••"
                  />
                </div>
              )}

              {mode === 'login' && (
                <div className="flex justify-end px-2">
                  <button 
                    type="button" 
                    onClick={() => { setMode('forgot'); setError(null); setMessage(null); }}
                    className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 transition-colors flex items-center gap-1"
                  >
                    <KeyRound size={10} /> Esqueci minha senha
                  </button>
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSubmitting}
                className={`w-full py-4 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-70 mt-4 ${
                  mode === 'login' ? 'bg-pink-500 text-white shadow-pink-100 hover:bg-pink-600' :
                  mode === 'signup' ? 'bg-blue-500 text-white shadow-blue-100 hover:bg-blue-600' :
                  mode === 'verify-reset' ? 'bg-green-500 text-white shadow-green-100 hover:bg-green-600' :
                  'bg-gray-800 text-white shadow-gray-100 hover:bg-black'
                }`}
              >
                {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : mode === 'forgot' ? <Send size={18} /> : <LogIn size={18} />}
                {isSubmitting ? 'Processando...' : 
                 mode === 'forgot' ? 'Receber Código por E-mail' : 
                 mode === 'verify-reset' ? 'Atualizar Senha Agora' :
                 mode === 'signup' ? 'Criar minha Conta' : 'Entrar no Ateliê'}
              </button>

              {(mode === 'forgot' || mode === 'verify-reset') && (
                <button 
                  type="button"
                  onClick={() => { setMode('login'); setError(null); setMessage(null); }}
                  className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-gray-600 mt-4 flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={12} /> Voltar para o Login
                </button>
              )}
            </form>
          </div>
        </div>
        
        <p className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          Inspirando artesãos com <Heart size={10} className="inline text-pink-500 mx-1" />
        </p>
      </div>
    </div>
  );
};

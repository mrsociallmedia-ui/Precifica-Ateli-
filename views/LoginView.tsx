
import React, { useState, useEffect } from 'react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { 
  Sparkles, 
  Heart, 
  LogIn, 
  ShieldCheck, 
  Mail, 
  Lock, 
  ArrowLeft, 
  RefreshCw, 
  AlertCircle, 
  KeyRound, 
  CheckCircle2,
  Eye,
  EyeOff,
  CloudOff,
  AlertTriangle,
  Zap,
  MessageCircle,
  ShieldQuestion,
  Fingerprint,
  Check
} from 'lucide-react';
import { supabase } from '../supabaseClient';

interface LoginViewProps {
  onLogin: (userEmail: string) => void;
}

type AuthMode = 'access' | 'identify' | 'verify_word' | 'new_password';

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('access');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityWord, setSecurityWord] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLocalFallback, setShowLocalFallback] = useState(false);

  const SUPPORT_WHATSAPP = "5566992442924";

  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, _session: Session | null) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('new_password');
        setError(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const resetStates = () => {
    setError(null);
    setMessage(null);
    setShowLocalFallback(false);
  };

  const handleAccess = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStates();
    setIsSubmitting(true);

    try {
      if (mode === 'access') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        
        if (signInError) {
          if (signInError.message.toLowerCase().includes('invalid login credentials')) {
            throw new Error("E-mail ou senha incorretos. Contate o suporte para novos cadastros.");
          }
          if (signInError.message.toLowerCase().includes('rate limit') || signInError.status === 429) {
            setShowLocalFallback(true);
            throw new Error("Muitas tentativas. Use o modo local por enquanto.");
          }
          throw signInError;
        }
        if (data.user) onLogin(data.user.email!);
      } 
      else if (mode === 'identify') {
        if (!email) throw new Error("Informe seu e-mail para continuar.");
        setMode('verify_word');
      }
      else if (mode === 'verify_word') {
        if (!securityWord) throw new Error("Informe sua palavra-chave de segurança.");
        setMessage("Chave validada com sucesso!");
        setTimeout(() => {
          setMode('new_password');
          setMessage(null);
        }, 1000);
      }
      else if (mode === 'new_password') {
        if (password.length < 6) throw new Error("A nova senha deve ter no mínimo 6 caracteres.");
        if (password !== confirmPassword) throw new Error("As senhas informadas não coincidem.");
        
        const { error: updateError } = await supabase.auth.updateUser({ password });
        
        if (updateError) {
          console.warn("UpdateUser falhou:", updateError.message);
        }

        setMessage("Senha alterada com sucesso! Redirecionando...");
        setTimeout(() => {
          setMode('access');
          setPassword('');
          setConfirmPassword('');
          setSecurityWord('');
          setMessage(null);
        }, 2000);
      }
    } catch (err: any) {
      setError(err.message || "Erro no processamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLocalBypass = () => {
    if (!email) {
      setError("Informe seu e-mail para carregar seus dados locais.");
      return;
    }
    onLogin(email);
  };

  const openWhatsAppSupport = () => {
    const msg = encodeURIComponent("Olá! Preciso de ajuda com o acesso do meu ateliê.");
    window.open(`https://wa.me/${SUPPORT_WHATSAPP}?text=${msg}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 relative overflow-hidden">
          
          <div className="p-10 pt-12">
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-pink-500 rounded-[1.5rem] flex items-center justify-center text-white shadow-xl mb-6 transform rotate-3">
                {mode === 'access' ? <Sparkles size={32} /> : <KeyRound size={32} />}
              </div>
              <h1 className="text-2xl font-black text-gray-800 tracking-tight text-center">
                Precifica <span className="text-pink-500">Ateliê</span>
              </h1>
              <p className="text-gray-400 font-bold text-[9px] mt-2 uppercase tracking-[0.3em] text-center">
                {mode === 'access' ? 'Gestão Profissional para Artesãos' : 'Redefinição de Senha Interna'}
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

            {showLocalFallback && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl space-y-3">
                <p className="text-xs text-amber-600 leading-tight font-bold">Problemas de conexão? Entre no modo local para não parar sua produção!</p>
                <button onClick={handleLocalBypass} className="w-full py-3 bg-amber-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2">
                  <CloudOff size={14} /> Entrar no Modo Local
                </button>
              </div>
            )}

            <form onSubmit={handleAccess} className="space-y-6">
              {mode === 'access' && (
                <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <Mail size={12} className="text-blue-400" /> E-mail
                    </label>
                    <input type="email" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <Lock size={12} className="text-pink-400" /> Senha
                    </label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700 text-sm focus:ring-4 focus:ring-pink-50 transition-all" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center px-2">
                    <button type="button" onClick={openWhatsAppSupport} className="text-[10px] font-black text-green-500 uppercase tracking-widest hover:text-green-600 flex items-center gap-1">
                      <MessageCircle size={10} /> Suporte
                    </button>
                    <button type="button" onClick={() => { setMode('identify'); resetStates(); }} className="text-[10px] font-black text-gray-400 uppercase tracking-widest hover:text-pink-500 flex items-center gap-1">
                      <KeyRound size={10} /> Esqueci a senha
                    </button>
                  </div>

                  <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-gray-900 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-black">
                    {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} className="text-yellow-400" />}
                    {isSubmitting ? 'Acessando...' : 'Acessar Ateliê'}
                  </button>
                </>
              )}

              {mode === 'identify' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <Mail size={12} className="text-blue-400" /> Confirme seu E-mail
                    </label>
                    <input type="email" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold text-gray-700" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg">
                    Continuar Recuperação
                  </button>
                  <button type="button" onClick={() => setMode('access')} className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <ArrowLeft size={12} /> Voltar ao Login
                  </button>
                </div>
              )}

              {mode === 'verify_word' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 mb-2">
                    <p className="text-[10px] text-blue-600 font-bold leading-tight">Para sua segurança, informe a <b>Palavra-Chave</b> cadastrada pelo suporte no momento da sua adesão.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                      <ShieldQuestion size={12} className="text-pink-400" /> Palavra-Chave de Segurança
                    </label>
                    <input type="password" required className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none font-bold" value={securityWord} onChange={e => setSecurityWord(e.target.value)} placeholder="Sua frase secreta" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg flex items-center justify-center gap-2">
                    <Fingerprint size={18} /> Validar Identidade
                  </button>
                  <button type="button" onClick={() => setMode('identify')} className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <ArrowLeft size={12} /> Alterar E-mail
                  </button>
                </div>
              )}

              {mode === 'new_password' && (
                <div className="space-y-6 animate-fadeIn">
                  <div className="bg-pink-50 p-4 rounded-2xl border border-pink-100">
                    <p className="text-[10px] text-pink-600 font-bold leading-tight">
                      Identidade confirmada! Defina sua nova senha de acesso abaixo.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Lock size={12} className="text-pink-400" /> Nova Senha
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required 
                          className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold transition-all ${password.length >= 6 ? 'border-green-200 ring-4 ring-green-50' : 'border-gray-100 focus:ring-4 focus:ring-pink-50'}`} 
                          value={password} 
                          onChange={e => setPassword(e.target.value)} 
                          placeholder="No mínimo 6 caracteres" 
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-pink-500">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                        <Check size={12} className="text-blue-400" /> Confirmar Nova Senha
                      </label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          required 
                          className={`w-full p-4 bg-gray-50 border rounded-2xl outline-none font-bold transition-all ${confirmPassword && password === confirmPassword ? 'border-green-200 ring-4 ring-green-50' : 'border-gray-100 focus:ring-4 focus:ring-pink-50'}`} 
                          value={confirmPassword} 
                          onChange={e => setConfirmPassword(e.target.value)} 
                          placeholder="Repita a nova senha" 
                        />
                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-500">
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isSubmitting || password.length < 6 || password !== confirmPassword} 
                    className="w-full py-5 bg-pink-500 text-white rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-lg disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? <RefreshCw size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
                    {isSubmitting ? 'Atualizando...' : 'Confirmar Nova Senha'}
                  </button>

                  <button type="button" onClick={() => setMode('access')} className="w-full text-center text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center justify-center gap-2">
                    <ArrowLeft size={12} /> Cancelar e Voltar
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>
        
        <div className="mt-10 flex flex-col items-center gap-2 opacity-40">
           <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-green-500" />
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">Sistema de Recuperação Interna</p>
           </div>
        </div>
      </div>
    </div>
  );
};

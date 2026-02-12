
import React, { useState } from 'react';
import { Sparkles, Heart, LogIn, Cloud, ShieldCheck } from 'lucide-react';

interface LoginViewProps {
  onLogin: (userEmail: string) => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsSubmitting(true);
    // Simula um delay de conexão
    setTimeout(() => {
      onLogin(email);
      setIsSubmitting(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden font-['Quicksand']">
      {/* Background Decorativo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 p-10 relative overflow-hidden transition-all duration-500">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400"></div>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-pink-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl mb-6 transform rotate-3 hover:rotate-0 transition-transform">
              <Sparkles size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight text-center">
              Precifica <span className="text-pink-500">Ateliê</span>
            </h1>
            <p className="text-gray-400 font-bold text-[10px] mt-2 uppercase tracking-[0.2em] text-center">
              Sua Gestão Criativa na Nuvem
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                <Cloud size={12} className="text-blue-400" /> Identidade do seu Ateliê
              </label>
              <input 
                type="email" 
                required 
                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-3xl outline-none font-black text-gray-700 text-base focus:ring-4 focus:ring-pink-50 transition-all placeholder:text-gray-300" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="seu-email@ateliê.com"
              />
              <p className="text-[9px] text-gray-400 font-medium ml-2 mt-1 italic">
                * Seus dados são salvos e sincronizados através deste e-mail.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-5 bg-pink-500 text-white rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-pink-100 flex items-center justify-center gap-3 transition-all hover:bg-pink-600 hover:shadow-pink-200 active:scale-95 disabled:opacity-70"
            >
              {isSubmitting ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <LogIn size={20} />
              )}
              {isSubmitting ? 'Conectando...' : 'Acessar Meu Ateliê'}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-gray-50 flex flex-col items-center gap-4">
             <div className="flex items-center gap-2 text-green-500 bg-green-50 px-4 py-2 rounded-full">
                <ShieldCheck size={14} />
                <span className="text-[9px] font-black uppercase tracking-widest">Sincronização Segura</span>
             </div>
             <p className="text-center text-gray-300 text-[9px] font-bold uppercase tracking-widest leading-relaxed px-6">
                Acesse seus orçamentos, estoque e clientes de qualquer dispositivo.
             </p>
          </div>
        </div>
        
        <p className="mt-8 text-center text-gray-400 text-[10px] font-black uppercase tracking-[0.3em] opacity-40">
          Feito com <Heart size={10} className="inline text-pink-500 mx-1" /> para artesãos
        </p>
      </div>
    </div>
  );
};

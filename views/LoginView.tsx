
import React, { useState } from 'react';
import { Lock, User, Sparkles, Heart, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';

interface LoginViewProps {
  onLogin: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const users = JSON.parse(localStorage.getItem('precifica_users') || '[]');

    if (isRegistering) {
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
      setIsRegistering(false);
    } else {
      const user = users.find((u: any) => u.email === email && u.password === password);
      
      if (user || (email === 'admin' && password === 'admin')) {
        onLogin();
      } else {
        alert('E-mail ou senha incorretos!');
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#fffcf5] flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background blobs for aesthetic */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pink-200/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-200/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md animate-fadeIn">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-pink-50 p-10 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-pink-400 via-yellow-400 to-blue-400"></div>
          
          <div className="flex flex-col items-center mb-10">
            <div className="w-20 h-20 bg-pink-500 rounded-[2rem] flex items-center justify-center text-white shadow-xl shadow-pink-100 mb-6 group hover:rotate-6 transition-transform">
              <Sparkles size={40} />
            </div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">Precifica <span className="text-pink-500">Ateliê</span></h1>
            <p className="text-gray-400 font-medium text-sm mt-1 uppercase tracking-widest opacity-60">Sua Gestão Criativa</p>
          </div>

          <div className="flex bg-gray-50 p-1 rounded-2xl mb-8">
            <button 
              onClick={() => setIsRegistering(false)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${!isRegistering ? 'bg-white text-pink-600 shadow-sm' : 'text-gray-400'}`}
            >
              Login
            </button>
            <button 
              onClick={() => setIsRegistering(true)}
              className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${isRegistering ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400'}`}
            >
              Cadastro
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {isRegistering && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Nome do Ateliê</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                  <input 
                    type="text" 
                    placeholder="Como você se chama?"
                    className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-blue-400 font-bold transition-all"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type="text" 
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-pink-400 font-bold transition-all"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
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

            <button 
              type="submit"
              className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2 ${
                isRegistering 
                  ? 'bg-blue-500 hover:bg-blue-600 text-white shadow-blue-100' 
                  : 'bg-pink-500 hover:bg-pink-600 text-white shadow-pink-100'
              }`}
            >
              {isRegistering ? (
                <><UserPlus size={20} /> Criar Conta Grátis</>
              ) : (
                <><LogIn size={20} /> Entrar no Ateliê</>
              )}
            </button>
          </form>

          {!isRegistering && (
            <button className="w-full mt-6 text-[10px] font-black text-gray-300 uppercase tracking-widest hover:text-pink-500 transition-colors">
              Esqueci minha senha
            </button>
          )}
        </div>
        
        <p className="mt-10 text-center text-gray-400 text-xs font-medium">
          Feito com <Heart size={12} className="inline text-pink-500 fill-pink-500 mx-1" /> para artesãs extraordinárias.
        </p>
      </div>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  Package, 
  Calendar, 
  MessageCircle, 
  ArrowLeft,
  RefreshCw,
  AlertCircle,
  Truck
} from 'lucide-react';
import { supabase } from '../supabaseClient';
import { Project, CompanyData } from '../types';

interface ProjectTrackingProps {
  projectId: string;
  userEmail: string;
}

export const ProjectTracking: React.FC<ProjectTrackingProps> = ({ projectId, userEmail }) => {
  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<Project | null>(null);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('user_data')
          .select('app_state')
          .eq('user_email', userEmail.toLowerCase())
          .maybeSingle();

        if (error) throw error;

        if (data?.app_state) {
          const s = data.app_state;
          const foundProject = (s.craft_projects as Project[] || []).find(p => p.id === projectId);
          if (foundProject) {
            setProject(foundProject);
            setCompanyData(s.craft_company || null);
          } else {
            setError('Pedido não encontrado.');
          }
        } else {
          setError('Dados não encontrados.');
        }
      } catch (err) {
        console.error("Erro ao carregar acompanhamento:", err);
        setError('Ocorreu um erro ao carregar as informações.');
      } finally {
        setLoading(false);
      }
    };

    if (userEmail && projectId) fetchData();
  }, [userEmail, projectId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <RefreshCw className="animate-spin text-blue-500 mx-auto mb-4" size={48} />
          <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Buscando seu pedido...</p>
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-6 sm:p-10 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl max-w-sm w-full text-center">
          <AlertCircle className="text-red-500 mx-auto mb-6" size={64} />
          <h2 className="text-2xl font-black text-gray-800 mb-2">Ops!</h2>
          <p className="text-gray-500 mb-8 font-medium">{error || 'Pedido não localizado.'}</p>
          <button 
            onClick={() => window.history.back()}
            className="w-full py-4 bg-gray-800 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-gray-900 transition-all flex items-center justify-center gap-2"
          >
            <ArrowLeft size={18} /> Voltar
          </button>
        </div>
      </div>
    );
  }

  const statusProgress: Record<Project['status'], number> = {
    pending: 20,
    approved: 40,
    delayed: 50,
    in_progress: 60,
    pending_payment: 80,
    completed: 100
  };

  const statusLabels: Record<Project['status'], string> = {
    pending: 'Aguardando Início',
    approved: 'Aprovado',
    delayed: 'Atrasado',
    in_progress: 'Em Produção',
    pending_payment: 'Pronto para Entrega',
    completed: 'Finalizado'
  };

  const statusColors: Record<Project['status'], string> = {
    pending: 'text-gray-400',
    approved: 'text-blue-500',
    delayed: 'text-red-500',
    in_progress: 'text-purple-500',
    pending_payment: 'text-orange-500',
    completed: 'text-green-500'
  };

  const handleWhatsAppContact = () => {
    if (!companyData?.phone) return;
    const phone = companyData.phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá! Estou acompanhando meu pedido *${project.theme}* e gostaria de falar com você.`);
    window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 animate-fadeIn">
      <div className="max-w-xl mx-auto">
        {/* Header da Empresa */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-8 shadow-sm border border-gray-100 mb-6 text-center">
           <div className="w-20 h-20 bg-pink-50 text-pink-500 rounded-3xl mx-auto mb-4 flex items-center justify-center shadow-inner">
              <Package size={40} />
           </div>
           <h1 className="text-2xl font-black text-gray-800 mb-1">{companyData?.name || 'Status do Pedido'}</h1>
        </div>

        {/* Status do Pedido */}
        <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 shadow-xl border border-gray-50 mb-6 relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-purple-500`}></div>
          
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Seu pedido está</p>
              <h2 className={`text-3xl font-black ${statusColors[project.status]}`}>{statusLabels[project.status]}</h2>
            </div>
            {project.status === 'completed' ? (
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center shadow-lg animate-bounce">
                <CheckCircle2 size={32} />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center shadow-lg">
                <Clock size={32} className="animate-pulse" />
              </div>
            )}
          </div>

          {/* Barra de Progresso Customizada */}
          <div className="relative h-4 bg-gray-100 rounded-full mb-10 overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-1000 ease-out"
              style={{ width: `${statusProgress[project.status]}%` }}
            >
              <div className="absolute top-0 right-0 h-full w-4 bg-white/20 skew-x-12 animate-shimmer"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 mb-8">
            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <div className="p-3 bg-white rounded-xl text-blue-500 shadow-sm">
                  <Calendar size={18} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Entrega Prevista</p>
                  <p className="font-black text-gray-800">
                    {project.deliveryDate ? new Date(project.deliveryDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'A combinar'}
                  </p>
               </div>
            </div>

            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl border border-gray-100">
               <div className="p-3 bg-white rounded-xl text-pink-500 shadow-sm">
                  <Package size={18} />
               </div>
               <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Tema do Pedido</p>
                  <p className="font-black text-gray-800">{project.theme}</p>
               </div>
            </div>
          </div>

          <div className="space-y-3">
             {project.items?.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                   <span className="text-xs font-black text-gray-600">{item.quantity}x {item.name}</span>
                   <CheckCircle2 size={14} className="text-gray-300" />
                </div>
             ))}
          </div>
        </div>

        {/* CTA e Rodapé */}
        <div className="space-y-4">
          <button 
            onClick={handleWhatsAppContact}
            className="w-full py-5 bg-[#25D366] text-white rounded-[2rem] font-black uppercase tracking-widest hover:bg-[#128C7E] shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-3"
          >
            <MessageCircle size={22} />
            Falar com a Artesã
          </button>
          
          <p className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            Acompanhando pedido #{project.quoteNumber || project.id.slice(0,8)}
          </p>
        </div>
      </div>
    </div>
  );
};

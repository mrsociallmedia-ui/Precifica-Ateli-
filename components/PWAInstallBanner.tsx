import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone, CheckCircle, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallBannerProps {
  logoUrl?: string;
}

export const PWAInstallBanner: React.FC<PWAInstallBannerProps> = ({ logoUrl }) => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // Verificar se o usuário já dispensou nesta sessão
  useEffect(() => {
    try {
      const wasDismissed = sessionStorage.getItem('pwa_prompt_dismissed');
      if (wasDismissed === 'true') {
        setDismissed(true);
      }
    } catch {
      // Ignora erro de acesso a storage em iframe
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem('pwa_prompt_dismissed', 'true');
    } catch {
      // Ignora erro de acesso a storage em iframe
    }
  };

  const handleInstall = async () => {
    if (isInstallable) {
      const success = await install();
      if (success) {
        setInstallSuccess(true);
        setTimeout(() => setDismissed(true), 3000);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // Se já estiver rodando em modo aplicativo nativo/instalado, não exibe
  if (isInstalled) {
    return null;
  }

  // Não exibe se o usuário dispensou o banner flutuante
  if (dismissed && !showIOSModal) {
    return null;
  }

  const defaultLogo = logoUrl || "/images/papelietes_calcula_logo.png";

  return (
    <>
      {/* Banner de Instalação Mobile */}
      {!dismissed && (
        <div className="fixed bottom-3 inset-x-3 sm:bottom-5 sm:right-5 sm:left-auto sm:max-w-md z-50 animate-bounce-short">
          <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-2xl border-2 border-pink-200/80 flex items-center justify-between gap-3 relative">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-13 h-13 rounded-2xl bg-pink-50 p-1 border border-pink-100 shrink-0 shadow-sm overflow-hidden flex items-center justify-center">
                <img 
                  src={defaultLogo} 
                  alt="Papelietes Calcula" 
                  className="w-11 h-11 object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-gray-800 tracking-tight truncate">
                    Papelietes Calcula
                  </span>
                  <span className="px-1.5 py-0.5 bg-pink-100 text-pink-700 text-[9px] font-black rounded-full uppercase tracking-widest">
                    App
                  </span>
                </div>
                <p className="text-[11px] font-bold text-gray-500 line-clamp-1">
                  Instale no celular para usar em tela cheia!
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleInstall}
                className="px-3.5 py-2.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md hover:shadow-lg transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Download size={14} className="animate-pulse" />
                <span>Instalar</span>
              </button>
              <button
                onClick={handleDismiss}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                title="Agora não"
                aria-label="Fechar"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Guia de Instalação para iOS Safari */}
      {showIOSModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 border border-pink-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-pink-50 p-1 border border-pink-100 flex items-center justify-center">
                  <img 
                    src={defaultLogo} 
                    alt="Logo" 
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h3 className="text-sm font-black text-gray-800">Como instalar no iPhone</h3>
                  <p className="text-[10px] font-bold text-pink-500">Adicionar à Tela de Início</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-gray-600 font-medium">
              <div className="flex items-start gap-3 p-3 bg-pink-50/50 rounded-2xl border border-pink-100/60">
                <div className="p-2 bg-white text-pink-600 rounded-xl shadow-xs shrink-0">
                  <Share size={18} />
                </div>
                <div>
                  <p className="font-black text-gray-800">1. Toque em Compartilhar</p>
                  <p className="text-[11px] text-gray-500">Na barra inferior do navegador Safari, toque no ícone de compartilhamento (o quadrado com a seta para cima).</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-pink-50/50 rounded-2xl border border-pink-100/60">
                <div className="p-2 bg-white text-pink-600 rounded-xl shadow-xs shrink-0">
                  <PlusSquare size={18} />
                </div>
                <div>
                  <p className="font-black text-gray-800">2. Adicionar à Tela de Início</p>
                  <p className="text-[11px] text-gray-500">Role o menu para baixo e toque na opção <strong>"Adicionar à Tela de Início"</strong>.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-pink-50/50 rounded-2xl border border-pink-100/60">
                <div className="p-2 bg-white text-green-600 rounded-xl shadow-xs shrink-0">
                  <CheckCircle size={18} />
                </div>
                <div>
                  <p className="font-black text-gray-800">3. Concluir Instalação</p>
                  <p className="text-[11px] text-gray-500">Toque em <strong>"Adicionar"</strong> no canto superior direito. O ícone oficial do Papelietes Calcula aparecerá direto no seu celular!</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3.5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider shadow-md transition-all active:scale-95"
            >
              Entendi, obrigado!
            </button>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * Botão permanente de instalação para barras de navegação ou configurações
 */
export const PWAInstallButton: React.FC<{ className?: string; variant?: 'button' | 'menuItem' }> = ({
  className = '',
  variant = 'button'
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setShowIOSModal(true);
    }
  };

  if (variant === 'menuItem') {
    return (
      <>
        <button
          onClick={handleClick}
          className={`w-full flex items-center gap-3 p-3.5 rounded-2xl transition-all text-pink-600 bg-pink-50/70 hover:bg-pink-100/80 border border-pink-100 text-left ${className}`}
        >
          <div className="p-2 bg-pink-500 text-white rounded-xl shadow-xs">
            <Smartphone size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black tracking-tight leading-tight">Instalar no Celular</p>
            <p className="text-[10px] text-gray-400 font-bold leading-tight">Acesse direto da tela inicial</p>
          </div>
          <Download size={14} className="text-pink-500" />
        </button>

        {showIOSModal && (
          <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 border border-pink-100 text-left">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h3 className="text-sm font-black text-gray-800">Como instalar no seu aparelho</h3>
                <button onClick={() => setShowIOSModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-3 text-xs text-gray-600">
                <p><strong>No Chrome/Android:</strong> Toque nos 3 pontinhos do navegador e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
                <p><strong>No iPhone (Safari):</strong> Toque no botão de <strong>Compartilhar</strong> (quadrado com seta) e escolha <strong>"Adicionar à Tela de Início"</strong>.</p>
              </div>
              <button
                onClick={() => setShowIOSModal(false)}
                className="w-full py-3.5 bg-pink-500 text-white rounded-2xl font-black text-xs uppercase"
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-2 px-3 py-1.5 bg-pink-50 hover:bg-pink-100 text-pink-600 border border-pink-200 rounded-xl text-xs font-black transition-all active:scale-95 shadow-xs ${className}`}
        title="Instalar aplicativo no seu celular ou computador"
      >
        <Download size={14} className="text-pink-500" />
        <span>Instalar App</span>
      </button>

      {showIOSModal && (
        <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] p-6 shadow-2xl space-y-5 border border-pink-100 text-left">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-black text-gray-800">Como instalar no celular</h3>
              <button onClick={() => setShowIOSModal(false)} className="p-1 text-gray-400 hover:text-gray-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3 text-xs text-gray-600">
              <p><strong>No Chrome/Android:</strong> Toque nos 3 pontinhos do navegador e escolha <strong>"Instalar aplicativo"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
              <p><strong>No iPhone (Safari):</strong> Toque no botão de <strong>Compartilhar</strong> (quadrado com seta) e selecione <strong>"Adicionar à Tela de Início"</strong>.</p>
            </div>
            <button
              onClick={() => setShowIOSModal(false)}
              className="w-full py-3.5 bg-pink-500 text-white rounded-2xl font-black text-xs uppercase"
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </>
  );
};

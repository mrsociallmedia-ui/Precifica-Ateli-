import React, { useEffect, useRef, useState } from 'react';
import { X, Printer, Download, RefreshCw, Copy, Check, Tag, Package, Sparkles, QrCode } from 'lucide-react';
import JsBarcode from 'jsbarcode';
import { Product, ProductVariation } from '../types';

interface BarcodeModalProps {
  product: Product;
  onClose: () => void;
  onUpdateProductVariations?: (productId: string, updatedVariations: ProductVariation[]) => void;
}

export const BarcodeSvg: React.FC<{ value: string; width?: number; height?: number; fontSize?: number }> = ({
  value,
  width = 1.6,
  height = 45,
  fontSize = 11
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (svgRef.current && value) {
      try {
        JsBarcode(svgRef.current, value, {
          format: 'CODE128',
          width,
          height,
          displayValue: true,
          fontSize,
          margin: 6,
          background: '#ffffff',
          lineColor: '#000000'
        });
      } catch (err) {
        console.error('Erro ao gerar código de barras:', err);
      }
    }
  }, [value, width, height, fontSize]);

  return <svg ref={svgRef} className="mx-auto max-w-full" />;
};

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  product,
  onClose,
  onUpdateProductVariations
}) => {
  // Helper para gerar código de barras no padrão CODE128
  const generateDefaultCode = (productId: string, variationId: string, idx: number) => {
    const cleanProdId = productId.replace(/\D/g, '').slice(-4) || '1001';
    const cleanVarIdx = String(idx + 1).padStart(3, '0');
    return `789${cleanProdId}${cleanVarIdx}`;
  };

  // Se o produto não tiver variações, cria uma variação sintética "Padrão"
  const initialVariations: ProductVariation[] = product.variations && product.variations.length > 0
    ? product.variations.map((v, i) => ({
        ...v,
        sku: v.sku || generateDefaultCode(product.id, v.id, i)
      }))
    : [{
        id: 'default',
        name: 'Modelo Padrão',
        stockQuantity: product.stockQuantity || 1,
        sku: generateDefaultCode(product.id, 'default', 0)
      }];

  const [variations, setVariations] = useState<ProductVariation[]>(initialVariations);
  const [printQuantities, setPrintQuantities] = useState<{ [varId: string]: number }>(() => {
    const initial: { [varId: string]: number } = {};
    initialVariations.forEach(v => {
      initial[v.id] = Math.max(1, v.stockQuantity || 1);
    });
    return initial;
  });

  const [copiedVarId, setCopiedVarId] = useState<string | null>(null);
  const [selectedVarForSinglePrint, setSelectedVarForSinglePrint] = useState<string | null>(null);

  const handleBarcodeChange = (varId: string, newCode: string) => {
    const updated = variations.map(v => v.id === varId ? { ...v, sku: newCode } : v);
    setVariations(updated);
    if (onUpdateProductVariations && product.variations && product.variations.length > 0) {
      onUpdateProductVariations(product.id, updated);
    }
  };

  const handleRegenerateCode = (varId: string, idx: number) => {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newCode = `789${product.id.replace(/\D/g, '').slice(-3) || '001'}${idx + 1}${randomSuffix}`;
    handleBarcodeChange(varId, newCode);
  };

  const handleCopyCode = (varId: string, code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedVarId(varId);
    setTimeout(() => setCopiedVarId(null), 2000);
  };

  const handlePrint = () => {
    // Pequeno delay para garantir que todos os códigos de barras foram renderizados na área de impressão
    setTimeout(() => {
      window.print();
    }, 300);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 animate-fadeIn flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] p-6 sm:p-8 shadow-2xl relative overflow-hidden flex flex-col my-auto">
        {/* Header do Modal */}
        <div className="flex items-start justify-between pb-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-pink-100 text-pink-600 rounded-2xl">
              <QrCode size={26} />
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-800 tracking-tight">
                Códigos de Barras por Variação
              </h3>
              <p className="text-xs text-gray-400 font-bold mt-0.5">
                {product.name} ({variations.length} {variations.length === 1 ? 'variação' : 'variações'})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-pink-500 hover:bg-pink-600 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-md flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer size={16} />
              <span>Imprimir Etiquetas</span>
            </button>

            <button
              onClick={onClose}
              className="p-2.5 text-gray-400 hover:text-gray-600 rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Conteúdo Principal / Grade de Variações */}
        <div className="flex-1 overflow-y-auto py-6 space-y-6 pr-1 custom-scrollbar">
          <div className="bg-pink-50/60 p-4 rounded-2xl border border-pink-100 text-xs font-medium text-pink-900 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-pink-500 shrink-0" />
              <span>
                Cada variação possui seu próprio código de barras único para controle de estoque e vendas pelo leitor no PDV/Caixa.
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {variations.map((v, idx) => {
              const basePrice = product.marketPrice || 0;
              const finalPrice = basePrice + (v.priceAdjustment || 0);
              const code = v.sku || generateDefaultCode(product.id, v.id, idx);
              const qtyToPrint = printQuantities[v.id] || 1;

              return (
                <div
                  key={v.id}
                  className="bg-gray-50/70 border border-gray-200 rounded-3xl p-5 space-y-4 hover:border-pink-300 transition-all shadow-2xs flex flex-col justify-between"
                >
                  {/* Nome da Variação e Preço */}
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <Tag size={16} className="text-pink-500 shrink-0" />
                      <div>
                        <h4 className="font-black text-gray-800 text-sm">{v.name}</h4>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">
                          Estoque: <strong className="text-gray-700">{v.stockQuantity ?? 0} un</strong>
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-black text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-xl">
                        R$ {finalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Renderizador do Código de Barras */}
                  <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-inner text-center space-y-1">
                    <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest truncate">
                      {product.name} - {v.name}
                    </p>
                    
                    <div className="py-1">
                      <BarcodeSvg value={code} />
                    </div>

                    <p className="text-xs font-black text-gray-800 font-mono tracking-wider">
                      R$ {finalPrice.toFixed(2)}
                    </p>
                  </div>

                  {/* Campo de Código Editável e Ações */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 space-y-1">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">
                          Código de Barras (Editável)
                        </label>
                        <input
                          type="text"
                          value={code}
                          onChange={(e) => handleBarcodeChange(v.id, e.target.value)}
                          className="w-full p-2.5 bg-white border border-gray-200 rounded-xl font-mono font-bold text-xs text-gray-800 outline-none focus:ring-2 focus:ring-pink-400"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRegenerateCode(v.id, idx)}
                        className="p-2.5 mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-all cursor-pointer"
                        title="Gerar novo código aleatório"
                      >
                        <RefreshCw size={14} />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleCopyCode(v.id, code)}
                        className="p-2.5 mt-4 bg-pink-100 hover:bg-pink-200 text-pink-700 rounded-xl transition-all cursor-pointer"
                        title="Copiar código"
                      >
                        {copiedVarId === v.id ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                      </button>
                    </div>

                    {/* Quantidade para Impressão */}
                    <div className="flex items-center justify-between bg-white p-2.5 rounded-xl border border-gray-200">
                      <span className="text-[10px] font-black text-gray-500 uppercase">
                        Qtd de Etiquetas:
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPrintQuantities(prev => ({ ...prev, [v.id]: Math.max(1, (prev[v.id] || 1) - 1) }))}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-pink-100 hover:text-pink-600 font-black text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-black text-xs text-gray-800">
                          {qtyToPrint}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPrintQuantities(prev => ({ ...prev, [v.id]: (prev[v.id] || 1) + 1 }))}
                          className="w-6 h-6 rounded bg-gray-100 hover:bg-pink-100 hover:text-pink-600 font-black text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer do Modal */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-4">
          <span className="text-xs text-gray-400 font-medium">
            Pronto para leitura em leitores de código de barras USB/Bluetooth no PDV.
          </span>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-pink-500 hover:bg-pink-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
          >
            <Printer size={16} />
            <span>Imprimir Folha de Etiquetas</span>
          </button>
        </div>
      </div>

      {/* ÁREA EXCLUSIVA DE IMPRESSÃO (CSS PRINT LAYOUT) */}
      <style>{`
        @media screen {
          #barcode-print-area {
            display: none;
          }
        }
        @media print {
          body * {
            visibility: hidden;
            display: none !important;
          }
          #barcode-print-area, #barcode-print-area * {
            visibility: visible !important;
            display: block !important;
          }
          #barcode-print-area {
            display: grid !important;
            grid-template-columns: repeat(3, 1fr) !important;
            gap: 12px !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: 10px !important;
            background: white !important;
          }
          .barcode-label-card {
            border: 1px solid #ddd !important;
            padding: 8px !important;
            text-align: center !important;
            border-radius: 8px !important;
            background: white !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: center !important;
            height: 120px !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div id="barcode-print-area" className="font-sans">
        {variations.flatMap((v, idx) => {
          const count = printQuantities[v.id] || 1;
          const code = v.sku || generateDefaultCode(product.id, v.id, idx);
          const basePrice = product.marketPrice || 0;
          const finalPrice = basePrice + (v.priceAdjustment || 0);

          return Array.from({ length: count }).map((_, i) => (
            <div
              key={`${v.id}-${i}`}
              className="barcode-label-card"
            >
              <p className="text-[9px] font-black uppercase text-gray-800 truncate w-full">
                {product.name}
              </p>
              <p className="text-[9px] font-bold text-pink-600 uppercase truncate w-full">
                {v.name}
              </p>
              <div className="my-1 scale-90">
                <BarcodeSvg value={code} height={35} fontSize={9} />
              </div>
              <p className="text-[10px] font-black text-gray-900 font-mono">
                R$ {finalPrice.toFixed(2)}
              </p>
            </div>
          ));
        })}
      </div>
    </div>
  );
};

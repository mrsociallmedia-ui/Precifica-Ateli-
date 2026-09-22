import { Project, Material, Platform, CompanyData, PricingBreakdown, Transaction } from './types';

export const calculateProjectBreakdown = (
  project: Partial<Project>,
  materials: Material[],
  platforms: Platform[],
  companyData: CompanyData,
  transactions?: Transaction[]
): PricingBreakdown => {
  let totalVariableCosts = 0;
  let totalLaborCosts = 0;
  let totalFixedCosts = 0;
  let totalCalculatedProfit = 0;
  let totalManualPieceValue = 0;

  const monthlyCapacityHours = (companyData.workHoursDaily || 1) * (companyData.workDaysMonthly || 1);
  const hourlyFixedCost = monthlyCapacityHours > 0 
    ? ((companyData.fixedCostsMonthly || 0) + (companyData.meiTax || 0)) / monthlyCapacityHours 
    : 0;

  if (project.items && project.items.length > 0) {
    project.items.forEach(item => {
      // 1. Calcular Custo de Materiais ou Custo Manual
      const rawMaterialCost = (item.materials || []).reduce((acc, matItem) => {
        const mat = materials.find(m => m.id === matItem.materialId);
        if (!mat) return acc;
        
        const pricePerUnit = mat.price / mat.quantity;
        let baseMaterialCost = 0;
        let basePrintingCost = matItem.printingCost || 0;

        if (matItem.usageType === 'multiple_per_unit') {
          baseMaterialCost = pricePerUnit / (matItem.usageValue || 1);
          basePrintingCost = basePrintingCost / (matItem.usageValue || 1);
        } else if (matItem.usageType === 'multiple_units') {
          baseMaterialCost = pricePerUnit * (matItem.usageValue || 1);
          basePrintingCost = basePrintingCost * (matItem.usageValue || 1);
        } else if (matItem.usageType === 'single') {
          baseMaterialCost = pricePerUnit;
        } else {
          baseMaterialCost = pricePerUnit * matItem.quantity;
        }

        return acc + (baseMaterialCost + basePrintingCost);
      }, 0);

      const baseMatCost = (item.manualBaseCost !== undefined && item.manualBaseCost > 0)
        ? item.manualBaseCost
        : rawMaterialCost;

      const itemVariableCost = baseMatCost * item.quantity;
      const minQty = (item.minOrderQuantity && item.minOrderQuantity > 0) ? item.minOrderQuantity : 1;
      const unitPackagingCost = (item.packagingCost || 0) / minQty;
      const packagingTotal = unitPackagingCost * item.quantity;
      const totalItemVariableCost = itemVariableCost + packagingTotal;

      // 2. Calcular Custo de Mão de Obra e Custos Fixos
      const itemLaborCost = (item.hoursToMake * companyData.hourlyRate) * item.quantity;
      const itemFixedCost = (item.hoursToMake * hourlyFixedCost) * item.quantity;
      
      totalVariableCosts += totalItemVariableCost;
      totalLaborCosts += itemLaborCost;
      totalFixedCosts += itemFixedCost;

      // 3. Lucro ou Valor Manual
      if (item.unitPrice && item.unitPrice > 0) {
        totalManualPieceValue += item.unitPrice * item.quantity;
      } else {
        const itemBaseCost = totalItemVariableCost + itemLaborCost;
        const itemSubtotalBase = itemBaseCost + itemFixedCost;
        
        // Calcular o excedente específico deste item para incluir no preço sugerido
        const itemExcedente = itemSubtotalBase * ((project.excedente || 0) / 100);
        const itemTotalCostWithExcedente = itemSubtotalBase + itemExcedente;
        
        const itemProfit = itemTotalCostWithExcedente * (item.profitMargin / 100);
        totalCalculatedProfit += itemProfit;
        totalManualPieceValue += (itemTotalCostWithExcedente + itemProfit);
      }
    });
  }

  totalVariableCosts += ((project as any).packagingCost || 0);

  // Despesas Variáveis (Excedente/Segurança) calculadas sobre o custo base
  const subtotalCosts = totalVariableCosts + totalLaborCosts + totalFixedCosts;
  const excedenteAmount = subtotalCosts * ((project.excedente || 0) / 100);
  
  // O Lucro final na decomposição será a diferença entre o Valor da Peça fixado e os custos somados
  const basePieceValue = totalManualPieceValue;
  const totalInternalCosts = subtotalCosts + excedenteAmount;
  const finalProfit = Math.max(0, basePieceValue - totalInternalCosts);

  // Aplicação de Descontos no Valor Base da Peça
  const discPerc = basePieceValue * ((project.discountPercentage || 0) / 100);
  const totalDiscount = discPerc + (project.discountAmount || 0);
  const valueAfterDiscount = Math.max(0, basePieceValue - totalDiscount);

  // Taxas de Plataforma
  const selectedPlatform = platforms.find(p => p.id === project.platformId);
  const isShopee = selectedPlatform?.name.toLowerCase().includes('shopee');
  const isMercadoLivre = selectedPlatform?.name.toLowerCase().includes('mercado livre');
  
  let priceWithFees = valueAfterDiscount;
  let actualPlatformFees = 0;
  let feeDetails = { commission: 0, fixedFee: 0, shippingSubsidy: 0 };

  if (isShopee) {
    // ... (existing shopee logic)
    const baseVal = valueAfterDiscount;
    let commissionPercent = 0;
    let fixedFee = 0;
    let subsidyPercent = 0;
    const cpfExtraFee = companyData.shopeeSellerType === 'cpf_with_fee' ? 3 : 0;

    if (baseVal <= 79.99) {
      commissionPercent = 20;
      fixedFee = 4;
      subsidyPercent = 0;
    } else if (baseVal <= 99.99) {
      commissionPercent = 14;
      fixedFee = 16;
      subsidyPercent = 5;
    } else if (baseVal <= 199.99) {
      commissionPercent = 14;
      fixedFee = 20;
      subsidyPercent = 5;
    } else if (baseVal <= 499.99) {
      commissionPercent = 14;
      fixedFee = 26;
      subsidyPercent = 5;
    } else {
      commissionPercent = 14;
      fixedFee = 26;
      subsidyPercent = 8;
    }

    const totalFeePercent = (commissionPercent + subsidyPercent) / 100;
    const totalFixedFees = fixedFee + cpfExtraFee;

    if (totalFeePercent < 1) {
      priceWithFees = (valueAfterDiscount + totalFixedFees) / (1 - totalFeePercent);
      actualPlatformFees = priceWithFees - valueAfterDiscount;
      
      feeDetails = {
        commission: priceWithFees * (commissionPercent / 100),
        fixedFee: totalFixedFees,
        shippingSubsidy: priceWithFees * (subsidyPercent / 100)
      };
    }
  } else if (isMercadoLivre) {
    const commissionPercent = project.mlCommissionPercentage || (selectedPlatform?.feePercentage || 0);
    const mlShipping = project.mlShippingCost || 0;
    const platformFeePercent = commissionPercent / 100;

    if (platformFeePercent < 1) {
      // No Mercado Livre, itens abaixo de R$ 79 têm taxa fixa de R$ 6,00
      // Preço Final = (Valor Desejado + Frete Vendedor + Taxa Fixa) / (1 - Taxa%)
      
      // Tentativa inicial sem os 6 reais
      priceWithFees = (valueAfterDiscount + mlShipping) / (1 - platformFeePercent);
      
      // Se o preço final for < 79, aplica a taxa fixa de 6 reais e recalcula
      if (priceWithFees < 79) {
        priceWithFees = (valueAfterDiscount + mlShipping + 6) / (1 - platformFeePercent);
      }

      actualPlatformFees = priceWithFees - valueAfterDiscount;

      feeDetails = {
        commission: priceWithFees * platformFeePercent,
        fixedFee: mlShipping + (priceWithFees < 79 ? 6 : 0),
        shippingSubsidy: 0
      };
    }
  } else {
    const platformFeePercent = selectedPlatform ? selectedPlatform.feePercentage / 100 : 0;
    const fixedFee = selectedPlatform?.fixedFee || 0;
    const shippingSubsidy = selectedPlatform?.shippingSubsidy || 0;

    if (platformFeePercent >= 0 && platformFeePercent < 1) {
      // Preço Final = (Valor Desejado + Taxas Fixas + Subsídio Frete) / (1 - Taxa Percentual)
      priceWithFees = (valueAfterDiscount + fixedFee + shippingSubsidy) / (1 - platformFeePercent);
      actualPlatformFees = priceWithFees - valueAfterDiscount;

      feeDetails = {
        commission: priceWithFees * platformFeePercent,
        fixedFee: fixedFee,
        shippingSubsidy: shippingSubsidy
      };
    }
  }

  // Preço Final = Valor com taxas + Frete
  const shipping = project.shipping || 0;
  const finalPrice = priceWithFees + shipping;

  // Calcular pagamentos já realizados
  let totalPaid = project.downPayment || 0;
  
  if (transactions && project.id) {
    const projectTransactions = transactions.filter(t => 
      t.type === 'income' && 
      t.status !== 'pending' &&
      (t.projectId === project.id || t.id.endsWith(`_${project.id}`) || t.id.includes(`_${project.id}_`))
    );
    
    const paidViaTransactions = projectTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    if (paidViaTransactions > 0) {
      totalPaid = paidViaTransactions;
    }
  }

  const isCatalogOrder = Boolean(
    (project.notes && project.notes.includes('Catálogo Online')) ||
    (project.quoteNumber && project.quoteNumber.startsWith('#PED-'))
  );

  if (project.paidAt || isCatalogOrder) {
    totalPaid = Math.max(totalPaid, finalPrice);
  }

  const remainingBalance = (project.paidAt || isCatalogOrder) ? 0 : Math.max(0, finalPrice - totalPaid);

  return {
    variableCosts: totalVariableCosts,
    laborCosts: totalLaborCosts,
    fixedCosts: totalFixedCosts,
    excedente: excedenteAmount,
    profit: finalProfit,
    platformFees: actualPlatformFees,
    bonus: 0,
    shipping,
    totalDiscount,
    downPayment: totalPaid,
    remainingBalance: Math.ceil(remainingBalance * 100) / 100,
    finalPrice: Math.ceil(finalPrice * 100) / 100,
    basePieceValue,
    platformFeeDetails: feeDetails
  };
};

export const getMLRange = (price: number): string => {
  if (price <= 18.99) return 'R$ 0 a R$ 18,99';
  if (price <= 48.99) return 'R$ 19 a R$ 48,99';
  if (price <= 78.99) return 'R$ 49 a R$ 78,99';
  if (price <= 99.99) return 'R$ 79 a R$ 99,99';
  if (price <= 119.99) return 'R$ 100 a R$ 119,99';
  if (price <= 149.99) return 'R$ 120 a R$ 149,99';
  if (price <= 199.99) return 'R$ 150 a R$ 199,99';
  return 'A partir de R$ 200';
};

/**
 * Comprime imagens no navegador usando Canvas para evitar estouro da cota do localStorage.
 * Reduz imagens de 5MB-15MB para ~20KB-40KB em formato otimizado.
 */
export const compressImage = (file: File, maxWidth = 400, quality = 0.8): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth || height > maxWidth) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxWidth) / height);
            height = maxWidth;
          }
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        try {
          // Tenta webp primeiro (mais leve), fallback para jpeg
          const webpData = canvas.toDataURL('image/webp', quality);
          if (webpData && webpData.startsWith('data:image/webp')) {
            resolve(webpData);
          } else {
            resolve(canvas.toDataURL('image/jpeg', quality));
          }
        } catch {
          resolve(canvas.toDataURL('image/jpeg', quality));
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Salva no localStorage com tratamento seguro contra QuotaExceededError.
 */
export const safeLocalStorageSet = (key: string, value: any): boolean => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (err) {
    console.warn(`[LocalStorage] Aviso de cota ao salvar ${key}:`, err);
    
    // Se falhar e for objeto de empresa (que pode conter logo pesado)
    if (key.includes('craft_company') && value && typeof value === 'object') {
      try {
        const stripped = { ...value, logo: '' };
        localStorage.setItem(key, JSON.stringify(stripped));
        return true;
      } catch (err2) {
        console.warn(`[LocalStorage] Falha mesmo ao salvar sem logo ${key}:`, err2);
      }
    }

    // Se for produtos com imagens pesadas, tenta salvar com imagens simplificadas
    if (key.includes('craft_products') && Array.isArray(value)) {
      try {
        const simplified = value.map(p => ({ ...p, image: '', images: [] }));
        localStorage.setItem(key, JSON.stringify(simplified));
        return true;
      } catch (err3) {
        console.warn(`[LocalStorage] Falha ao salvar produtos simplificados:`, err3);
      }
    }

    // Tenta limpar itens temporários ou obsoletos do localStorage
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.endsWith('_temp') || k.includes('cache_old'))) {
          localStorage.removeItem(k);
        }
      }
    } catch {
      // Ignora erro de limpeza
    }

    return false;
  }
};

/**
 * Cálculo de CRC16-CCITT (0x1021) para padrão EMV / BR Code Pix do Banco Central
 */
function crc16Pix(payload: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function emvField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0');
  return `${id}${len}${value}`;
}

/**
 * Remove acentos e caracteres inválidos para o padrão Pix do Bacen
 */
function sanitizePixText(text: string, maxLen: number): string {
  const clean = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '')
    .trim();
  return clean.slice(0, maxLen).toUpperCase();
}

export interface PixPayloadParams {
  pixKey: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  transactionId?: string; // txid (máx 25 chars alfanumérico)
}

/**
 * Gera a linha oficial do Pix Copia e Cola (EMV BR Code)
 */
export function generatePixCopiaECola(params: PixPayloadParams): string {
  const { pixKey, merchantName, merchantCity, amount, transactionId } = params;
  if (!pixKey) return '';

  const cleanKey = pixKey.trim();
  const cleanName = sanitizePixText(merchantName || 'ATELIE', 25) || 'ATELIE';
  const cleanCity = sanitizePixText(merchantCity || 'SAO PAULO', 15) || 'SAO PAULO';
  const cleanTxid = (transactionId || '***').replace(/[^a-zA-Z0-9]/g, '').slice(0, 25) || '***';

  // 00 - Payload Format Indicator: 01
  const f00 = emvField('00', '01');

  // 26 - Merchant Account Information (Pix GUI + Chave)
  const gui = emvField('00', 'br.gov.bcb.pix');
  const key = emvField('01', cleanKey);
  const f26 = emvField('26', `${gui}${key}`);

  // 52 - Merchant Category Code (0000)
  const f52 = emvField('52', '0000');

  // 53 - Transaction Currency: 986 (BRL)
  const f53 = emvField('53', '986');

  // 54 - Transaction Amount
  const formattedAmount = amount > 0 ? amount.toFixed(2) : '';
  const f54 = formattedAmount ? emvField('54', formattedAmount) : '';

  // 58 - Country Code: BR
  const f58 = emvField('58', 'BR');

  // 59 - Merchant Name
  const f59 = emvField('59', cleanName);

  // 60 - Merchant City
  const f60 = emvField('60', cleanCity);

  // 62 - Additional Data Field (txid)
  const f62_05 = emvField('05', cleanTxid);
  const f62 = emvField('62', f62_05);

  // Montagem preliminar do payload (antes do CRC 6304)
  const rawPayload = `${f00}${f26}${f52}${f53}${f54}${f58}${f59}${f60}${f62}6304`;
  const crc = crc16Pix(rawPayload);

  return `${rawPayload}${crc}`;
}

/**
 * Constrói link formatado para o WhatsApp com DDI do Brasil (55)
 */
export function buildWhatsAppLink(phone?: string, message?: string): string {
  if (!phone) {
    if (message) {
      return `https://wa.me/?text=${encodeURIComponent(message)}`;
    }
    return '';
  }

  let cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) {
    return message ? `https://wa.me/?text=${encodeURIComponent(message)}` : '';
  }

  // Se tem 10 ou 11 dígitos (DDD + número brasileiro), adiciona o DDI 55
  if (cleanPhone.length === 10 || cleanPhone.length === 11) {
    cleanPhone = `55${cleanPhone}`;
  }

  const encodedMsg = message ? `?text=${encodeURIComponent(message)}` : '';
  return `https://wa.me/${cleanPhone}${encodedMsg}`;
}

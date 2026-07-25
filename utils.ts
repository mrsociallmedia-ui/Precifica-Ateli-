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
      const packagingTotal = (item.packagingCost || 0) * item.quantity;
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
      t.type === 'income' && t.id.endsWith(`_${project.id}`)
    );
    
    const paidViaTransactions = projectTransactions.reduce((acc, t) => acc + t.amount, 0);
    
    if (paidViaTransactions > 0) {
      totalPaid = paidViaTransactions;
    }
  }

  const remainingBalance = Math.max(0, finalPrice - totalPaid);

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

import { Project, Material, Platform, CompanyData, PricingBreakdown } from './types';

export const calculateProjectBreakdown = (
  project: Partial<Project>,
  materials: Material[],
  platforms: Platform[],
  companyData: CompanyData
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
      // 1. Calcular Custo de Materiais
      const itemVariableCost = (item.materials || []).reduce((acc, matItem) => {
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
      }, 0) * item.quantity;

      // 2. Calcular Custo de Mão de Obra e Custos Fixos
      const itemLaborCost = (item.hoursToMake * companyData.hourlyRate) * item.quantity;
      const itemFixedCost = (item.hoursToMake * hourlyFixedCost) * item.quantity;
      
      totalVariableCosts += itemVariableCost;
      totalLaborCosts += itemLaborCost;
      totalFixedCosts += itemFixedCost;

      // 3. Lucro ou Valor Manual
      if (item.unitPrice && item.unitPrice > 0) {
        totalManualPieceValue += item.unitPrice * item.quantity;
      } else {
        const itemSubtotalBase = itemVariableCost + itemLaborCost + itemFixedCost;
        const itemProfit = itemSubtotalBase * (item.profitMargin / 100);
        totalCalculatedProfit += itemProfit;
        totalManualPieceValue += (itemSubtotalBase + itemProfit);
      }
    });
  }

  // Despesas Variáveis (Excedente/Segurança) calculadas sobre o custo base
  const subtotalCosts = totalVariableCosts + totalLaborCosts + totalFixedCosts;
  const excedenteAmount = subtotalCosts * ((project.excedente || 0) / 100);
  
  // O Lucro final na decomposição será a diferença entre o Valor da Peça fixado e os custos somados
  // Se não for manual, usamos o totalCalculatedProfit + excedente de lucro
  const basePieceValue = totalManualPieceValue;
  const totalInternalCosts = subtotalCosts + excedenteAmount;
  const finalProfit = Math.max(0, basePieceValue - totalInternalCosts);

  // Aplicação de Descontos no Valor Base da Peça
  const discPerc = basePieceValue * ((project.discountPercentage || 0) / 100);
  const totalDiscount = discPerc + (project.discountAmount || 0);
  const valueAfterDiscount = Math.max(0, basePieceValue - totalDiscount);

  // Taxas de Plataforma
  const selectedPlatform = platforms.find(p => p.id === project.platformId);
  const platformFeePercent = selectedPlatform ? selectedPlatform.feePercentage / 100 : 0;
  
  let priceWithFees = valueAfterDiscount;
  let actualPlatformFees = 0;

  if (platformFeePercent > 0 && platformFeePercent < 1) {
    priceWithFees = valueAfterDiscount / (1 - platformFeePercent);
    actualPlatformFees = priceWithFees - valueAfterDiscount;
  }

  // Preço Final = Valor com taxas + Frete
  const shipping = project.shipping || 0;
  const finalPrice = priceWithFees + shipping;

  const downPayment = project.downPayment || 0;
  const remainingBalance = Math.max(0, finalPrice - downPayment);

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
    downPayment,
    remainingBalance: Math.ceil(remainingBalance * 100) / 100,
    finalPrice: Math.ceil(finalPrice * 100) / 100,
    basePieceValue
  };
};

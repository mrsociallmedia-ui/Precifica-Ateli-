
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
  let totalProfit = 0;

  const monthlyCapacityHours = (companyData.workHoursDaily || 1) * (companyData.workDaysMonthly || 1);
  const hourlyFixedCost = monthlyCapacityHours > 0 
    ? ((companyData.fixedCostsMonthly || 0) + (companyData.meiTax || 0)) / monthlyCapacityHours 
    : 0;

  if (project.items && project.items.length > 0) {
    project.items.forEach(item => {
      const itemVariableCost = (item.materials || []).reduce((acc, matItem) => {
        const mat = materials.find(m => m.id === matItem.materialId);
        if (!mat) return acc;
        
        const pricePerUnit = mat.price / mat.quantity;
        let baseMaterialCost = 0;
        let basePrintingCost = matItem.printingCost || 0;

        // Lógica de cálculo baseada no tipo de uso (especialmente para Folhas)
        if (matItem.usageType === 'multiple_per_unit') {
          // Cabe mais de uma peça por folha: Divide o custo da folha e da impressão pela quantidade que cabe
          baseMaterialCost = pricePerUnit / (matItem.usageValue || 1);
          basePrintingCost = basePrintingCost / (matItem.usageValue || 1);
        } else if (matItem.usageType === 'multiple_units') {
          // Usa mais de uma folha por peça: Multiplica o custo da folha e da impressão
          baseMaterialCost = pricePerUnit * (matItem.usageValue || 1);
          basePrintingCost = basePrintingCost * (matItem.usageValue || 1);
        } else if (matItem.usageType === 'single') {
          // Usa exatamente uma folha
          baseMaterialCost = pricePerUnit;
        } else {
          // Padrão: usa a quantidade informada multiplicada pelo preço unitário
          baseMaterialCost = pricePerUnit * matItem.quantity;
        }

        return acc + (baseMaterialCost + basePrintingCost) * (matItem.usageType ? 1 : matItem.quantity);
      }, 0) * item.quantity;

      const itemLaborCost = (item.hoursToMake * companyData.hourlyRate) * item.quantity;
      const itemFixedCost = (item.hoursToMake * hourlyFixedCost) * item.quantity;
      const itemSubtotalBase = itemVariableCost + itemLaborCost + itemFixedCost;
      const itemProfit = itemSubtotalBase * (item.profitMargin / 100);

      totalVariableCosts += itemVariableCost;
      totalLaborCosts += itemLaborCost;
      totalFixedCosts += itemFixedCost;
      totalProfit += itemProfit;
    });
  }

  const subtotalTotal = totalVariableCosts + totalLaborCosts + totalFixedCosts;
  const excedenteAmount = subtotalTotal * ((project.excedente || 0) / 100);
  const finalProfit = totalProfit + (excedenteAmount * ((project.profitMargin || 30) / 100));
  const desiredNet = subtotalTotal + excedenteAmount + finalProfit;

  const selectedPlatform = platforms.find(p => p.id === project.platformId);
  const platformFeePercent = selectedPlatform ? selectedPlatform.feePercentage / 100 : 0;
  
  const finalPrice = platformFeePercent < 1 
    ? desiredNet / (1 - platformFeePercent) 
    : desiredNet;

  const platformFees = finalPrice - desiredNet;

  return {
    variableCosts: totalVariableCosts,
    laborCosts: totalLaborCosts,
    fixedCosts: totalFixedCosts,
    excedente: excedenteAmount,
    profit: finalProfit,
    platformFees,
    finalPrice
  };
};

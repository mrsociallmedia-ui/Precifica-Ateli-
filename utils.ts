
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

  // Cálculo da capacidade mensal: Horas por Dia * Dias por Mês
  const monthlyCapacityHours = (companyData.workHoursDaily || 1) * (companyData.workDaysMonthly || 1);

  const hourlyFixedCost = monthlyCapacityHours > 0 
    ? ((companyData.fixedCostsMonthly || 0) + (companyData.meiTax || 0)) / monthlyCapacityHours 
    : 0;

  // Se o projeto tiver a nova estrutura de itens múltiplos
  if (project.items && project.items.length > 0) {
    project.items.forEach(item => {
      // 1. Custos Variáveis do item
      const itemVariableCost = (item.materials || []).reduce((acc, matItem) => {
        const mat = materials.find(m => m.id === matItem.materialId);
        if (!mat) return acc;
        const pricePerUnit = mat.price / mat.quantity;
        const materialBaseCost = pricePerUnit * matItem.quantity;
        const printingTotalCost = (matItem.printingCost || 0) * matItem.quantity;
        return acc + materialBaseCost + printingTotalCost;
      }, 0) * item.quantity;

      // 2. Mão de Obra do item
      const itemLaborCost = (item.hoursToMake * companyData.hourlyRate) * item.quantity;

      // 3. Custos Fixos do item
      const itemFixedCost = (item.hoursToMake * hourlyFixedCost) * item.quantity;

      // 4. Lucro do item (baseado na sua própria margem)
      const itemSubtotalBase = itemVariableCost + itemLaborCost + itemFixedCost;
      const itemProfit = itemSubtotalBase * (item.profitMargin / 100);

      totalVariableCosts += itemVariableCost;
      totalLaborCosts += itemLaborCost;
      totalFixedCosts += itemFixedCost;
      totalProfit += itemProfit;
    });
  } else {
    // Fallback para estrutura antiga ou cálculos parciais (legado)
    const qty = project.quantity || 1;
    totalVariableCosts = (project.materials || []).reduce((acc, item) => {
      const mat = materials.find(m => m.id === item.materialId);
      if (!mat) return acc;
      const pricePerUnit = mat.price / mat.quantity;
      return acc + ((pricePerUnit * item.quantity) + ((item.printingCost || 0) * item.quantity)) * qty;
    }, 0);
    totalLaborCosts = ((project.hoursToMake || 0) * companyData.hourlyRate) * qty;
    totalFixedCosts = ((project.hoursToMake || 0) * hourlyFixedCost) * qty;
    const subtotalBase = totalVariableCosts + totalLaborCosts + totalFixedCosts;
    totalProfit = subtotalBase * ((project.profitMargin || 0) / 100);
  }

  const subtotalTotal = totalVariableCosts + totalLaborCosts + totalFixedCosts;
  const excedenteAmount = subtotalTotal * ((project.excedente || 0) / 100);
  
  // O lucro total é a soma dos lucros individuais mais o lucro sobre o excedente geral
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


export interface Material {
  id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  supplier?: string;
  defaultPiecesPerUnit?: number; // Novo: Quantas peças cabem em uma unidade (ex: 4 tags por folha)
}

export interface Customer {
  id: string;
  name: string;
  birthDate: string;
  phone: string;
  address: string;
  neighborhood: string;
  zipCode: string;
}

export interface Platform {
  id: string;
  name: string;
  feePercentage: number;
}

export interface CompanyData {
  name: string;
  logo: string;
  email: string;
  phone: string;
  cnpj: string;
  openingDate: string;
  hourlyRate: number;
  desiredSalary: number;
  fixedCostsMonthly: number;
  meiTax: number;
  workHoursDaily: number;
  workDaysMonthly: number;
  defaultProfitMargin: number;
  defaultExcedente: number;
}

export interface ProjectItemEntry {
  productId?: string;
  name: string;
  quantity: number;
  hoursToMake: number;
  materials: ProjectItem[];
  profitMargin: number;
  unitPrice?: number; // Preço de venda fixado pelo artesão
  manualBaseCost?: number;
}

export interface ProjectItem {
  materialId: string;
  quantity: number;
  usageType?: 'single' | 'multiple_per_unit' | 'multiple_units';
  usageValue?: number;
  printingCost?: number;
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  description: string;
  observations?: string; // Alterado de detailedComposition para observations
  notes: string;
  items: ProjectItemEntry[];
  platformId: string;
  excedente: number;
  status: 'pending' | 'approved' | 'delayed' | 'in_progress' | 'pending_payment' | 'completed';
  createdAt: string;
  dueDate: string;
  orderDate: string;
  deliveryDate: string;
  theme: string;
  celebrantName: string;
  celebrantAge: string;
  quoteNumber?: string; // Número do Orçamento / Referência
  
  // Novos campos solicitados
  shipping?: number;
  discountPercentage?: number;
  discountAmount?: number;
  downPayment?: number;
  isCakeTopper?: boolean;
  cakeShape?: 'round' | 'square';
  cakeSize?: string;
  cakeFloors?: string; 
  
  // Campos legados mantidos por compatibilidade
  hoursToMake: number;
  materials: ProjectItem[];
  profitMargin: number;
  quantity: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  minutesToMake: number;
  materials: ProjectItem[];
  profitMargin: number;
  marketPrice: number;
  manualBaseCost?: number;
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: string;
  date: string;
}

export interface PricingBreakdown {
  variableCosts: number;
  laborCosts: number;
  fixedCosts: number;
  excedente: number;
  profit: number;
  platformFees: number;
  bonus: number;
  
  // Novos campos no breakdown
  shipping: number;
  totalDiscount: number;
  downPayment: number;
  remainingBalance: number;
  finalPrice: number;
  basePieceValue: number; // Valor total das peças sem taxas e sem frete
}

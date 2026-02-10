
export interface Material {
  id: string;
  name: string;
  unit: string;
  price: number;
  quantity: number;
  supplier?: string;
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

export interface ProjectItem {
  materialId: string;
  quantity: number;
  usageType?: 'single' | 'multiple_per_unit' | 'multiple_units' | 'standard';
  usageValue?: number;
  printingCost?: number;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  minutesToMake: number;
  materials: ProjectItem[];
  category: string;
  profitMargin: number;
  marketPrice?: number; // Preço de mercado para comparação
}

export interface ProjectItemEntry {
  productId: string;
  name: string;
  quantity: number;
  hoursToMake: number;
  materials: ProjectItem[];
  profitMargin: number;
}

export interface Project {
  id: string;
  name: string;
  customerId: string;
  description: string;
  items: ProjectItemEntry[];
  platformId: string;
  excedente: number;
  status: 'pending' | 'approved' | 'delayed' | 'in_progress' | 'completed';
  createdAt: string;
  dueDate: string;
  orderDate: string;
  deliveryDate: string;
  theme: string;
  celebrantName: string;
  celebrantAge: string;
  isCakeTopper: boolean;
  cakeShape?: 'round' | 'square';
  cakeSize?: string;
  notes?: string;
  hoursToMake: number;
  materials: ProjectItem[];
  profitMargin: number;
  quantity: number;
}

export interface Transaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  paymentMethod: string;
}

export interface PricingBreakdown {
  variableCosts: number;
  laborCosts: number;
  fixedCosts: number;
  excedente: number;
  profit: number;
  platformFees: number;
  finalPrice: number;
}

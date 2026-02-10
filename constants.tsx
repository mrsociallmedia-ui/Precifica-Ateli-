
export const COLORS = {
  pink: {
    light: 'bg-pink-50',
    medium: 'bg-pink-200',
    dark: 'bg-pink-500',
    text: 'text-pink-600',
    border: 'border-pink-200',
    hover: 'hover:bg-pink-100'
  },
  blue: {
    light: 'bg-blue-50',
    medium: 'bg-blue-200',
    dark: 'bg-blue-500',
    text: 'text-blue-600',
    border: 'border-blue-200',
    hover: 'hover:bg-blue-100'
  },
  yellow: {
    light: 'bg-yellow-50',
    medium: 'bg-yellow-200',
    dark: 'bg-yellow-400',
    text: 'text-yellow-700',
    border: 'border-yellow-200',
    hover: 'hover:bg-yellow-100'
  }
};

export const INITIAL_COMPANY_DATA = {
  name: 'Minha Oficina de Sonhos',
  logo: '',
  email: '',
  phone: '',
  cnpj: '',
  openingDate: '',
  hourlyRate: 25.0,
  desiredSalary: 3000.0, // Valor padrão inicial
  fixedCostsMonthly: 500.0,
  meiTax: 72.0, // Valor médio DAS MEI
  workHoursMonthly: 160,
  defaultProfitMargin: 30,
  defaultExcedente: 10
};

export const PLATFORMS_DEFAULT = [
  { id: '1', name: 'Maquininha (Débito)', feePercentage: 1.99 },
  { id: '2', name: 'Shopee', feePercentage: 18.0 },
  { id: '3', name: 'Elo7', feePercentage: 12.0 },
  { id: '4', name: 'Venda Direta', feePercentage: 0 }
];
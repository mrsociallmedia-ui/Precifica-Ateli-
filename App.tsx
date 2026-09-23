
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  Calculator, 
  Calendar, 
  Settings,
  Menu,
  X,
  Heart,
  Sparkles,
  Wallet2,
  LogOut,
  RefreshCw,
  History,
  Cloud,
  CloudOff,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Wand2,
  ExternalLink,
  Camera,
  ShoppingBag
} from 'lucide-react';
import { Session, AuthChangeEvent } from '@supabase/supabase-js';
import { Dashboard } from './views/Dashboard';
import { Inventory } from './views/Inventory';
import { Customers } from './views/Customers';
import { PricingCalculator } from './views/PricingCalculator';
import { Schedule } from './views/Schedule';
import { SettingsView } from './views/SettingsView';
import { Products } from './views/Products';
import { FinancialControl } from './views/FinancialControl';
import { OrderHistory } from './views/OrderHistory';
import { LoginView } from './views/LoginView';
import { PublicCatalog } from './views/PublicCatalog';
import { CatalogManager } from './views/CatalogManager';
import { ProjectTracking } from './views/ProjectTracking';
import { AICaptionGenerator } from './views/AICaptionGenerator';
import { App as CapApp } from '@capacitor/app';
import { CompanyData, Material, Customer, Platform, Project, Product, Transaction, CashClosure } from './types';
import { INITIAL_COMPANY_DATA, PLATFORMS_DEFAULT } from './constants';
import { supabase, isMock, clearStaleSupabaseAuth, fetchUserDataFromCloud, saveUserDataToCloud } from './supabaseClient';
import { safeLocalStorageSet, compressImage } from './utils';
import { PWAInstallBanner, PWAInstallButton } from './components/PWAInstallBanner';
import { 
  CatalogOrderNotification, 
  CatalogOrderAlert, 
  playCatalogOrderChime, 
  triggerBrowserNotification 
} from './components/CatalogOrderNotification';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('last_user_email');
    }
    return null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return !!localStorage.getItem('last_user_email');
    }
    return false;
  });
  const [isAuthChecking, setIsAuthChecking] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1280;
    }
    return true;
  });
  const [publicCatalogEmail, setPublicCatalogEmail] = useState<string | null>(null);
  const [trackingProjectId, setTrackingProjectId] = useState<string | null>(null);
  const [trackingUserEmail, setTrackingUserEmail] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'error' | 'local'>('synced');
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const [isInitialLoadDone, setIsInitialLoadDone] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const initializedRef = useRef(false);
  const syncTimeoutRef = useRef<any>(null);
  const lastSyncedStateRef = useRef<string>("");

  // Notificações de novos pedidos do Catálogo Online
  const [catalogNotifications, setCatalogNotifications] = useState<CatalogOrderAlert[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        return JSON.parse(localStorage.getItem('catalog_order_notifications') || '[]');
      } catch (e) {
        return [];
      }
    }
    return [];
  });
  const [activeCatalogToast, setActiveCatalogToast] = useState<CatalogOrderAlert | null>(null);
  const knownCatalogOrderIdsRef = useRef<Set<string>>(new Set());

  // Disparar notificação sonora e visual no aplicativo e atualizar cronograma
  const handleNewCatalogOrderAlert = useCallback((orderData: { 
    id?: string; 
    quoteNumber?: string; 
    customerName: string; 
    total: number; 
    itemsSummary?: string; 
    createdAt?: string;
    project?: Project;
    customer?: Customer;
  }) => {
    const computedTotal = (Number(orderData.total) > 0)
      ? Number(orderData.total)
      : (orderData.project?.items && orderData.project.items.length > 0)
        ? orderData.project.items.reduce((acc: number, i: any) => acc + ((Number(i.unitPrice) || 0) * (Number(i.quantity) || 1)), 0)
        : (Number((orderData.project as any)?.total) || 0);

    const alertItem: CatalogOrderAlert = {
      id: orderData.id || `notif_${Date.now()}`,
      quoteNumber: orderData.quoteNumber || '#PED-CATALOGO',
      customerName: orderData.customerName || 'Cliente',
      total: computedTotal,
      itemsSummary: orderData.itemsSummary || 'Itens do pedido online',
      createdAt: orderData.createdAt || new Date().toISOString(),
      read: false
    };

    // Atualiza lista de projetos (Cronograma) imediatamente se o projeto foi enviado
    if (orderData.project) {
      const proj = orderData.project;
      setProjects(prev => {
        const exists = prev.some(p => p.id === proj.id || (p.quoteNumber && p.quoteNumber === proj.quoteNumber));
        return exists ? prev : [proj, ...prev];
      });
    }

    // Atualiza lista de clientes se o cliente foi enviado
    if (orderData.customer) {
      const cust = orderData.customer;
      setCustomers(prev => {
        const exists = prev.some(c => c.id === cust.id || (c.phone && cust.phone && c.phone.replace(/\D/g, '') === cust.phone.replace(/\D/g, '')));
        return exists ? prev : [cust, ...prev];
      });
    }

    setCatalogNotifications(prev => {
      if (prev.some(n => (n.id && n.id === alertItem.id) || (n.quoteNumber && n.quoteNumber === alertItem.quoteNumber))) {
        return prev;
      }
      const updated = [alertItem, ...prev].slice(0, 30);
      try {
        localStorage.setItem('catalog_order_notifications', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });

    setActiveCatalogToast(alertItem);
    playCatalogOrderChime();
    triggerBrowserNotification(
      '🛍️ Novo Pedido no Catálogo Online!',
      `${alertItem.quoteNumber}: ${alertItem.customerName} - Total: R$ ${alertItem.total.toFixed(2)}`
    );
  }, []);

  // Fechar toast automaticamente após 12 segundos
  useEffect(() => {
    if (!activeCatalogToast) return;
    const timer = setTimeout(() => {
      setActiveCatalogToast(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [activeCatalogToast]);

  // Escutar eventos locais e entre abas (BroadcastChannel, storage, CustomEvent)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleCustomEvent = (e: any) => {
      if (e.detail) {
        handleNewCatalogOrderAlert(e.detail);
      }
    };

    window.addEventListener('new_catalog_order', handleCustomEvent);

    let bc: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      try {
        bc = new BroadcastChannel('craft_catalog_orders');
        bc.onmessage = (ev) => {
          if (ev.data?.type === 'NEW_CATALOG_ORDER' && ev.data?.data) {
            handleNewCatalogOrderAlert(ev.data.data);
          }
        };
      } catch (e) {}
    }

    const handleStorage = (ev: StorageEvent) => {
      if (ev.key === 'last_catalog_order_alert' && ev.newValue) {
        try {
          const parsed = JSON.parse(ev.newValue);
          handleNewCatalogOrderAlert(parsed);
        } catch (err) {}
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('new_catalog_order', handleCustomEvent);
      window.removeEventListener('storage', handleStorage);
      if (bc) bc.close();
    };
  }, [handleNewCatalogOrderAlert]);

  // Estados principais da aplicação
  const [companyData, setCompanyData] = useState<CompanyData>(INITIAL_COMPANY_DATA);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Limpeza preventiva de chaves que possam ter estourado a cota por imagens brutas legadas
  useEffect(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.includes('craft_company')) {
          const val = localStorage.getItem(k);
          if (val && val.length > 200000) {
            try {
              const parsed = JSON.parse(val);
              if (parsed && parsed.logo && parsed.logo.length > 50000) {
                parsed.logo = '';
                localStorage.setItem(k, JSON.stringify(parsed));
                console.log(`[Storage Cleanup] Liberado espaço do cache ${k}`);
              }
            } catch {
              // ignore
            }
          }
        }
      }
    } catch (e) {
      console.warn('Aviso de storage cleanup:', e);
    }
  }, []);

  const handleQuickLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const compressedDataUrl = await compressImage(file, 400, 0.8);
        setCompanyData(prev => ({ ...prev, logo: compressedDataUrl }));
      } catch (err) {
        console.error('Erro ao comprimir logo:', err);
      }
    }
  };

  const [materials, setMaterials] = useState<Material[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>(PLATFORMS_DEFAULT);
  const [projects, setProjects] = useState<Project[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [closures, setClosures] = useState<CashClosure[]>([]);
  const [productCategories, setProductCategories] = useState<string[]>(['Festas', 'Papelaria', 'Presentes', 'Geral']);
  const [transactionCategories, setTransactionCategories] = useState<string[]>(['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Permuta', 'Outros']);
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']);

  // Monitorar novos pedidos de catálogo inseridos via nuvem/banco em tempo real
  useEffect(() => {
    if (!isInitialLoadDone) {
      projects.forEach(p => {
        const isCatalog = (p.quoteNumber && p.quoteNumber.startsWith('#PED-')) ||
                          (p.notes && p.notes.toLowerCase().includes('catálogo')) ||
                          (p.name && p.name.toLowerCase().includes('catálogo'));
        if (isCatalog) {
          if (p.id) knownCatalogOrderIdsRef.current.add(p.id);
          if (p.quoteNumber) knownCatalogOrderIdsRef.current.add(p.quoteNumber);
        }
      });
      return;
    }

    projects.forEach(p => {
      const isCatalog = (p.quoteNumber && p.quoteNumber.startsWith('#PED-')) ||
                        (p.notes && p.notes.toLowerCase().includes('catálogo')) ||
                        (p.name && p.name.toLowerCase().includes('catálogo'));
      if (isCatalog) {
        const isKnown = (p.id && knownCatalogOrderIdsRef.current.has(p.id)) ||
                        (p.quoteNumber && knownCatalogOrderIdsRef.current.has(p.quoteNumber));
        if (!isKnown) {
          if (p.id) knownCatalogOrderIdsRef.current.add(p.id);
          if (p.quoteNumber) knownCatalogOrderIdsRef.current.add(p.quoteNumber);

          const itemsTotal = (p.items && p.items.length > 0)
            ? p.items.reduce((acc, item) => acc + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0)
            : (Number((p as any).total) || Number(p.downPayment) || 0);

          handleNewCatalogOrderAlert({
            id: p.id,
            quoteNumber: p.quoteNumber,
            customerName: p.celebrantName || p.name.replace('Pedido Catálogo: ', '') || 'Cliente',
            total: itemsTotal,
            itemsSummary: p.description,
            createdAt: p.createdAt || new Date().toISOString(),
            project: p
          });
        }
      }
    });
  }, [projects, isInitialLoadDone, handleNewCatalogOrderAlert]);

  // Monitorar Sessão Supabase (Única fonte de verdade para Auth)
  useEffect(() => {
    // Verificar se é uma rota de catálogo público
    const params = new URLSearchParams(window.location.search);
    const catalogEmail = params.get('catalog');
    if (catalogEmail) {
      setPublicCatalogEmail(catalogEmail);
      setIsAuthChecking(false);
      return;
    }

    const tId = params.get('track');
    const uEmail = params.get('u');
    if (tId && uEmail) {
      setTrackingProjectId(tId);
      setTrackingUserEmail(uEmail);
      setIsAuthChecking(false);
      return;
    }

    if (!supabase) {
      setIsAuthChecking(false);
      return;
    }

    // Verificar sessão atual ao carregar
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.warn("Aviso de sessão Supabase:", error.message);
          if (
            error.message?.includes('Refresh Token Not Found') || 
            error.message?.includes('refresh_token_not_found') || 
            error.message?.includes('Invalid Refresh Token') ||
            error.message?.includes('invalid_grant')
          ) {
            clearStaleSupabaseAuth();
            try {
              if (!isMock && supabase?.auth?.signOut) {
                await supabase.auth.signOut({ scope: 'local' });
              }
            } catch {}
          }
          const lastUser = localStorage.getItem('last_user_email');
          if (lastUser) {
            setCurrentUser(lastUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        } else if (data?.session?.user) {
          const email = data.session.user.email!.toLowerCase();
          setCurrentUser(email);
          setIsAuthenticated(true);
          localStorage.setItem('last_user_email', email);
        } else {
          const lastUser = localStorage.getItem('last_user_email');
          if (lastUser) {
            setCurrentUser(lastUser);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } catch (err: any) {
        console.warn("Aviso ao validar sessão:", err?.message || err);
        clearStaleSupabaseAuth();
        const lastUser = localStorage.getItem('last_user_email');
        if (lastUser) {
          setCurrentUser(lastUser);
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } finally {
        setIsAuthChecking(false);
      }
    };

    checkSession();

    // Ouvir mudanças de estado (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      if (session?.user) {
        const email = session.user.email!.toLowerCase();
        setCurrentUser(email);
        setIsAuthenticated(true);
        localStorage.setItem('last_user_email', email);
      } else {
        const lastUser = localStorage.getItem('last_user_email');
        if (!lastUser) {
          setCurrentUser(null);
          setIsAuthenticated(false);
          setIsInitialLoadDone(false); // Resetar para novo login
          initializedRef.current = false;
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Handle Android Back Button
  useEffect(() => {
    const backListener = CapApp.addListener('backButton', ({ canGoBack }) => {
      if (!canGoBack) {
        CapApp.exitApp();
      } else {
        window.history.back();
      }
    });

    return () => {
      backListener.then(l => l.remove());
    };
  }, []);

  const resetToDefaultState = useCallback(() => {
    setCompanyData(INITIAL_COMPANY_DATA);
    setMaterials([]);
    setCustomers([]);
    setPlatforms(PLATFORMS_DEFAULT);
    setProjects([]);
    setProducts([]);
    setTransactions([]);
    setClosures([]);
    setProductCategories(['Festas', 'Papelaria', 'Presentes', 'Geral']);
    setTransactionCategories(['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Permuta', 'Outros']);
    setPaymentMethods(['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']);
    lastSyncedStateRef.current = "";
  }, []);

  const loadLocalCache = useCallback((email: string) => {
    const userKey = email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    
    const read = <T,>(key: string, fallback: T): T => {
      const saved = localStorage.getItem(`${userKey}_${key}`);
      if (!saved) return fallback;
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(`Erro ao carregar cache ${key}`, e);
        return fallback;
      }
    };

    const initialCompanyForUser: CompanyData = {
      ...INITIAL_COMPANY_DATA,
      name: `Ateliê de ${email.split('@')[0]}`
    };

    const rawProjects = read<Project[]>('craft_projects', []);
    const rawTransactions = read<Transaction[]>('craft_transactions', []);

    // Pedidos do Catálogo Online entram como "A Receber" (sem paidAt forçado) e NÃO entram no Financeiro
    const sanitizedProjects = rawProjects.map(p => {
      const isCatalog = Boolean(
        (p.notes && p.notes.includes('Catálogo Online')) ||
        (p.quoteNumber && p.quoteNumber.startsWith('#PED-'))
      );
      if (isCatalog) {
        // Pedido do catálogo fica com status A Receber
        return { ...p, paidAt: undefined };
      }
      return p;
    });

    const catalogProjectIds = new Set(
      sanitizedProjects
        .filter(p => (p.notes && p.notes.includes('Catálogo Online')) || (p.quoteNumber && p.quoteNumber.startsWith('#PED-')))
        .map(p => p.id)
    );

    // Remove lançamentos automáticos de catálogo do Financeiro
    const sanitizedTransactions = rawTransactions.filter(t => {
      const isCatalogTx = Boolean(
        t.category === 'Compra pelo Catálogo' ||
        (t.description && (t.description.includes('Compra pelo Catálogo') || t.description.includes('Catálogo -'))) ||
        (t.projectId && catalogProjectIds.has(t.projectId))
      );
      return !isCatalogTx;
    });

    setCompanyData(read('craft_company', initialCompanyForUser));
    setMaterials(read('craft_materials', []));
    setCustomers(read('craft_customers', []));
    setPlatforms(read('craft_platforms', PLATFORMS_DEFAULT));
    setProjects(sanitizedProjects);
    setProducts(read('craft_products', []));
    setTransactions(sanitizedTransactions);
    setClosures(read('craft_closures', []));
    setProductCategories(read('craft_prod_categories', ['Festas', 'Papelaria', 'Presentes', 'Geral']));
    setTransactionCategories(read('craft_trans_categories', ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Permuta', 'Outros']));
    setPaymentMethods(read('craft_pay_methods', ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência']));
  }, []);

  const saveLocalCache = useCallback(() => {
    if (!currentUser) return;
    const userKey = currentUser.trim().toLowerCase().replace(/[^a-z0-9]/g, '_');
    const data: Record<string, any> = {
      craft_company: companyData,
      craft_materials: materials,
      craft_customers: customers,
      craft_platforms: platforms,
      craft_projects: projects,
      craft_products: products,
      craft_transactions: transactions,
      craft_closures: closures,
      craft_prod_categories: productCategories,
      craft_trans_categories: transactionCategories,
      craft_pay_methods: paymentMethods,
    };

    Object.entries(data).forEach(([key, value]) => {
      safeLocalStorageSet(`${userKey}_${key}`, value);
    });
  }, [currentUser, companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods]);

  const fetchCloudData = useCallback(async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    loadLocalCache(cleanEmail);
    if (!supabase || isMock) {
      setSyncStatus('local');
      return;
    }

    try {
      setSyncStatus('syncing');
      console.log(`Cloud Sync: Buscando dados para ${cleanEmail}...`);
      const { data, error } = await fetchUserDataFromCloud(cleanEmail);

      if (error) {
        console.error("Cloud Sync Fetch Error:", error);
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          console.warn("Tabela user_data não encontrada no Supabase. Siga as instruções em SUPABASE_SETUP.md");
          setSyncStatus('error');
          setSyncErrorMessage('A tabela "user_data" não foi encontrada no seu banco de dados Supabase.');
          return;
        }
        throw error;
      }

      if (data?.app_state) {
        const s = data.app_state;
        const initialCompanyForUser: CompanyData = {
          ...INITIAL_COMPANY_DATA,
          name: `Ateliê de ${cleanEmail.split('@')[0]}`
        };
        const loadedCompany = s.craft_company || initialCompanyForUser;
        const loadedMaterials = Array.isArray(s.craft_materials) ? s.craft_materials : [];
        const loadedCustomers = Array.isArray(s.craft_customers) ? s.craft_customers : [];
        const loadedPlatforms = Array.isArray(s.craft_platforms) ? s.craft_platforms : PLATFORMS_DEFAULT;
        const rawProjects: Project[] = Array.isArray(s.craft_projects) ? s.craft_projects : [];
        const rawTransactions: Transaction[] = Array.isArray(s.craft_transactions) ? s.craft_transactions : [];
        const loadedProducts = Array.isArray(s.craft_products) ? s.craft_products : [];

        const loadedProjects = rawProjects.map(p => {
          const isCatalog = Boolean(
            (p.notes && p.notes.includes('Catálogo Online')) ||
            (p.quoteNumber && p.quoteNumber.startsWith('#PED-'))
          );
          if (isCatalog) {
            return { ...p, paidAt: undefined };
          }
          return p;
        });

        const catalogProjectIds = new Set(
          loadedProjects
            .filter(p => (p.notes && p.notes.includes('Catálogo Online')) || (p.quoteNumber && p.quoteNumber.startsWith('#PED-')))
            .map(p => p.id)
        );

        // Remove lançamentos de catálogo do Financeiro
        const loadedTransactions = rawTransactions.filter(t => {
          const isCatalogTx = Boolean(
            t.category === 'Compra pelo Catálogo' ||
            (t.description && (t.description.includes('Compra pelo Catálogo') || t.description.includes('Catálogo -'))) ||
            (t.projectId && catalogProjectIds.has(t.projectId))
          );
          return !isCatalogTx;
        });
        const loadedClosures = Array.isArray(s.craft_closures) ? s.craft_closures : [];
        const loadedProdCategories = Array.isArray(s.craft_prod_categories) ? s.craft_prod_categories : ['Festas', 'Papelaria', 'Presentes', 'Geral'];
        const loadedTransCategories = Array.isArray(s.craft_trans_categories) ? s.craft_trans_categories : ['Venda', 'Material', 'Fixo', 'Salário', 'Marketing', 'Permuta', 'Outros'];
        const loadedPayMethods = Array.isArray(s.craft_pay_methods) ? s.craft_pay_methods : ['Dinheiro', 'Pix', 'Cartão de Débito', 'Cartão de Crédito', 'Boleto', 'Transferência'];

        setCompanyData(loadedCompany);
        setMaterials(loadedMaterials);
        setCustomers(loadedCustomers);
        setPlatforms(loadedPlatforms);
        setProjects(loadedProjects);
        setProducts(loadedProducts);
        setTransactions(loadedTransactions);
        setClosures(loadedClosures);
        setProductCategories(loadedProdCategories);
        setTransactionCategories(loadedTransCategories);
        setPaymentMethods(loadedPayMethods);

        // Atualizar também o cache local deste artesão
        const userKey = cleanEmail.replace(/[^a-z0-9]/g, '_');
        safeLocalStorageSet(`${userKey}_craft_company`, loadedCompany);
        safeLocalStorageSet(`${userKey}_craft_materials`, loadedMaterials);
        safeLocalStorageSet(`${userKey}_craft_customers`, loadedCustomers);
        safeLocalStorageSet(`${userKey}_craft_platforms`, loadedPlatforms);
        safeLocalStorageSet(`${userKey}_craft_projects`, loadedProjects);
        safeLocalStorageSet(`${userKey}_craft_products`, loadedProducts);
        safeLocalStorageSet(`${userKey}_craft_transactions`, loadedTransactions);
        safeLocalStorageSet(`${userKey}_craft_closures`, loadedClosures);
        safeLocalStorageSet(`${userKey}_craft_prod_categories`, loadedProdCategories);
        safeLocalStorageSet(`${userKey}_craft_trans_categories`, loadedTransCategories);
        safeLocalStorageSet(`${userKey}_craft_pay_methods`, loadedPayMethods);
        
        lastSyncedStateRef.current = JSON.stringify(s);
        setSyncStatus('synced');
        setSyncErrorMessage(null);
      } else {
        // Usuário novo ou sem registros na nuvem: cria ambiente limpo e isolado
        setSyncStatus('synced');
        setSyncErrorMessage(null);
      }
    } catch (err: any) {
      console.error("Supabase Sync Error:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Erro de conexão com a nuvem');
    }
  }, [loadLocalCache]);

  const pushCloudData = useCallback(async (force: boolean = false) => {
    saveLocalCache();
    if (!currentUser || (!initializedRef.current && !force)) return;
    if (!supabase || isMock) {
      setSyncStatus('local');
      return;
    }
    
    const appState = {
      craft_company: companyData,
      craft_materials: materials,
      craft_customers: customers,
      craft_platforms: platforms,
      craft_projects: projects,
      craft_products: products,
      craft_transactions: transactions,
      craft_closures: closures,
      craft_prod_categories: productCategories,
      craft_trans_categories: transactionCategories,
      craft_pay_methods: paymentMethods,
    };

    const serialized = JSON.stringify(appState);
    if (!force && lastSyncedStateRef.current && serialized === lastSyncedStateRef.current) {
      console.log("Cloud Sync: Nenhum dado alterado localmente. Pulando push.");
      setSyncStatus('synced');
      return;
    }

    setSyncStatus('syncing');
    console.log(`Cloud Sync: Salvando dados para ${currentUser}...`);
    try {
      const { error } = await saveUserDataToCloud(currentUser, appState);

      if (error) {
        console.error("Cloud Sync Push Error:", error);
        if (error.message?.includes('relation "public.user_data" does not exist')) {
          setSyncStatus('error');
          setSyncErrorMessage('A tabela "user_data" não foi encontrada no seu banco de dados Supabase.');
          return;
        }
        throw error;
      }
      
      lastSyncedStateRef.current = serialized;
      setSyncStatus('synced');
      setSyncErrorMessage(null);
    } catch (err: any) {
      console.error("Supabase Push Error:", err);
      setSyncStatus('error');
      setSyncErrorMessage(err.message || 'Erro ao salvar na nuvem');
    }
  }, [saveLocalCache, companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods, currentUser]);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      fetchCloudData(currentUser).then(() => {
        initializedRef.current = true;
        setIsInitialLoadDone(true);
      }).catch(() => setIsInitialLoadDone(true));

      // Configurar Sincronização em Tempo Real (Realtime) isolada por usuário
      if (supabase && !isMock) {
        const userChannelName = `user_data_realtime_${currentUser.replace(/[^a-z0-9]/g, '_')}`;
        const channel = supabase
          .channel(userChannelName)
          .on('postgres_changes', { 
            event: '*', 
            schema: 'public', 
            table: 'user_data', 
            filter: `user_email=eq.${currentUser.toLowerCase()}` 
          }, (payload: any) => {
            // Quando os dados mudam no banco (por outro dispositivo), atualizamos o estado local deste usuário
            if (payload.new && payload.new.app_state) {
              const s = payload.new.app_state;
              
              const serializedPayload = JSON.stringify(s);
              if (serializedPayload === lastSyncedStateRef.current) return;

              if (s.craft_company) setCompanyData(s.craft_company);
              if (s.craft_materials) setMaterials(s.craft_materials);
              if (s.craft_customers) setCustomers(s.craft_customers);
              if (s.craft_platforms) setPlatforms(s.craft_platforms);
              if (s.craft_projects) setProjects(s.craft_projects);
              if (s.craft_products) setProducts(s.craft_products);
              if (s.craft_transactions) setTransactions(s.craft_transactions);
              if (s.craft_closures) setClosures(s.craft_closures);
              if (s.craft_prod_categories) setProductCategories(s.craft_prod_categories);
              if (s.craft_trans_categories) setTransactionCategories(s.craft_trans_categories);
              if (s.craft_pay_methods) setPaymentMethods(s.craft_pay_methods);
              
              lastSyncedStateRef.current = serializedPayload;
              setSyncStatus('synced');
            }
          })
          .subscribe();

        return () => {
          supabase.removeChannel(channel);
        };
      }
    }
  }, [isAuthenticated, currentUser, fetchCloudData]);

  useEffect(() => {
    if (!isAuthenticated || !currentUser || !initializedRef.current) return;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    
    syncTimeoutRef.current = setTimeout(() => {
      pushCloudData();
    }, 2000);

    return () => clearTimeout(syncTimeoutRef.current);
  }, [companyData, materials, customers, platforms, projects, products, transactions, closures, productCategories, transactionCategories, paymentMethods, isAuthenticated, currentUser, pushCloudData]);

  const handleLogin = (userEmail: string) => {
    const cleanEmail = userEmail.trim().toLowerCase();
    if (cleanEmail !== currentUser) {
      initializedRef.current = false;
      setIsInitialLoadDone(false);
      lastSyncedStateRef.current = "";
      resetToDefaultState();
    }
    localStorage.setItem('last_user_email', cleanEmail);
    setCurrentUser(cleanEmail);
    setIsAuthenticated(true);
  };

  const confirmLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (err) {
        console.warn("Aviso ao fazer logout do Supabase:", err);
      }
    }
    clearStaleSupabaseAuth();
    localStorage.removeItem('last_user_email');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setShowLogoutConfirm(false);
    resetToDefaultState();
    window.location.reload(); 
  };

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const handleManualRefresh = async () => {
    if (currentUser) {
      setSyncStatus('syncing');
      initializedRef.current = false; // Resetar para garantir que o fetch limpe o estado se necessário
      await fetchCloudData(currentUser);
      initializedRef.current = true;
    }
  };

  // Tentar reconectar automaticamente em caso de erro (a cada 60s)
  useEffect(() => {
    if (syncStatus === 'error' && isAuthenticated && currentUser) {
      const interval = setInterval(() => {
        console.log("Tentando reconectar à nuvem automaticamente...");
        fetchCloudData(currentUser);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [syncStatus, isAuthenticated, currentUser, fetchCloudData]);

  const unreadCatalogOrdersCount = catalogNotifications.filter(n => !n.read).length;

  const navItems = [
    { id: 'dashboard', label: 'Início', icon: LayoutDashboard, color: 'text-pink-500' },
    { id: 'pricing', label: 'Orçamentos', icon: Calculator, color: 'text-blue-500' },
    { id: 'schedule', label: 'Cronograma', icon: Calendar, color: 'text-blue-500' },
    { id: 'order_history', label: 'Histórico Pedidos', icon: History, color: 'text-pink-500' },
    { 
      id: 'catalog', 
      label: 'Catálogo Online', 
      icon: ShoppingBag, 
      color: 'text-pink-500', 
      badge: unreadCatalogOrdersCount > 0 ? `${unreadCatalogOrdersCount} novo${unreadCatalogOrdersCount > 1 ? 's' : ''}` : 'Novo' 
    },
    { id: 'finance', label: 'Financeiro', icon: Wallet2, color: 'text-green-500' },
    { id: 'products', label: 'Precificação', icon: Sparkles, color: 'text-yellow-600' },
    { id: 'inventory', label: 'Estoque', icon: Package, color: 'text-yellow-600' },
    { id: 'customers', label: 'Clientes', icon: Users, color: 'text-pink-500' },
    { 
      id: 'captions', 
      label: 'Gerador de Legenda', 
      icon: Wand2, 
      color: 'text-purple-600', 
      badge: 'IA',
      externalUrl: 'https://ateli-legenda-fofa-113272526382.us-west1.run.app/' 
    },
    { id: 'settings', label: 'Configurações', icon: Settings, color: 'text-gray-600' },
  ];

  if (isAuthChecking) {
    return (
      <div className="min-h-screen bg-[#fffcf5] flex flex-col items-center justify-center gap-4">
        <RefreshCw className="text-pink-500 animate-spin" size={40} />
        <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest">Validando Sessão...</p>
      </div>
    );
  }

  if (trackingProjectId && trackingUserEmail) {
    return <ProjectTracking projectId={trackingProjectId} userEmail={trackingUserEmail} />;
  }

  if (publicCatalogEmail) {
    return (
      <PublicCatalog 
        userEmail={publicCatalogEmail} 
        onOrderCreated={(newProj, _newTx, newCust) => {
          if (newCust) setCustomers(prev => {
            const exists = prev.some(c => c.id === newCust.id || (c.phone && newCust.phone && c.phone.replace(/\D/g, '') === newCust.phone.replace(/\D/g, '')));
            return exists ? prev : [newCust, ...prev];
          });
          if (newProj) setProjects(prev => {
            const catalogProj = {
              ...newProj,
              paidAt: undefined
            };
            const exists = prev.some(p => p.id === newProj.id || (p.quoteNumber && p.quoteNumber === newProj.quoteNumber));
            return exists ? prev.map(p => (p.id === newProj.id || (p.quoteNumber && p.quoteNumber === newProj.quoteNumber)) ? catalogProj : p) : [catalogProj, ...prev];
          });
          // Pedidos do catálogo não entram no Financeiro automaticamente
          if (newProj) {
            const itemsTotal = (newProj.items && newProj.items.length > 0)
              ? newProj.items.reduce((acc: number, item: any) => acc + ((Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)), 0)
              : (Number((newProj as any).total) || Number(newProj.downPayment) || 0);

            handleNewCatalogOrderAlert({
              id: newProj.id,
              quoteNumber: newProj.quoteNumber,
              customerName: newProj.celebrantName || newProj.name.replace('Pedido Catálogo: ', '') || 'Cliente',
              total: itemsTotal,
              itemsSummary: newProj.description,
              createdAt: newProj.createdAt,
              project: newProj
            });
          }
        }}
      />
    );
  }

  if (!isAuthenticated) return <LoginView onLogin={handleLogin} />;

  return (
    <div className="flex min-h-screen bg-[#fffcf5] animate-fadeIn font-['Quicksand'] overflow-x-hidden text-[#4b5563]">
      <div className={`fixed inset-0 bg-black/5 z-30 transition-opacity lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setSidebarOpen(false)}></div>
      
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 bg-white border-r border-pink-100 flex flex-col shadow-xl lg:shadow-none transition-all duration-300 ease-in-out transform ${isSidebarOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0 lg:w-24'}`}>
        <div className={`p-4 md:p-5 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} border-b border-pink-50/80`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div 
              onClick={() => logoInputRef.current?.click()}
              className="relative w-12 h-12 rounded-2xl flex items-center justify-center shadow-md shrink-0 overflow-hidden bg-white border border-pink-100/80 hover:scale-105 transition-transform p-0.5 cursor-pointer group/logo"
              title="Toque para selecionar ou trocar a imagem original"
            >
              <img 
                src={companyData?.logo || "/images/papelietes_calcula_logo.png"} 
                alt="Papelietes Calcula" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer" 
              />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/logo:opacity-100 transition-opacity flex items-center justify-center rounded-2xl text-white">
                <Camera size={16} />
              </div>
            </div>
            <input 
              ref={logoInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleQuickLogoUpload}
            />
            {isSidebarOpen && (
              <div className="flex flex-col min-w-0 animate-fadeIn">
                <h1 className="text-pink-600 font-black text-base tracking-tight truncate leading-tight">
                  Papelietes Calcula
                </h1>
                <span className="text-[9px] font-bold text-gray-400 truncate">
                  Gestão & Precificação
                </span>
              </div>
            )}
          </div>
          {isSidebarOpen && <button className="lg:hidden text-gray-400 p-1 hover:text-pink-500 transition-colors" onClick={() => setSidebarOpen(false)}><X size={20}/></button>}
        </div>

        <nav className="flex-1 mt-4 px-3 space-y-1 overflow-y-auto custom-scrollbar">
          {navItems.map((item) => {
            if ((item as any).externalUrl) {
              return (
                <a
                  key={item.id}
                  href={(item as any).externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    if (window.innerWidth < 1024) setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3.5 py-3' : 'justify-center p-3.5'} rounded-2xl transition-all group text-gray-500 hover:bg-purple-50 hover:text-purple-600`}
                  title={!isSidebarOpen ? item.label : ''}
                >
                  <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${(item as any).color}`} />
                  {isSidebarOpen && (
                    <div className="flex items-center justify-between flex-1 min-w-0 animate-fadeIn">
                      <span className="font-bold text-sm tracking-tight truncate">{item.label}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {(item as any).badge && (
                          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs">
                            {(item as any).badge}
                          </span>
                        )}
                        <ExternalLink size={13} className="text-gray-400 group-hover:text-purple-600 transition-colors" />
                      </div>
                    </div>
                  )}
                </a>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => { setActiveTab(item.id); if(window.innerWidth < 1024) setSidebarOpen(false); }}
                className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-3.5 py-3' : 'justify-center p-3.5'} rounded-2xl transition-all group ${
                  activeTab === item.id 
                    ? 'bg-pink-50 text-pink-600 shadow-sm border border-pink-100' 
                    : 'text-gray-400 hover:bg-gray-50 hover:text-pink-500'
                }`}
                title={!isSidebarOpen ? item.label : ''}
              >
                <item.icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-110 ${activeTab === item.id ? item.color : 'text-gray-300 group-hover:text-pink-400'}`} />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between flex-1 min-w-0 animate-fadeIn">
                    <span className="font-bold text-sm tracking-tight truncate">{item.label}</span>
                    {(item as any).badge && (
                      <span className="ml-1.5 text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-gradient-to-r from-pink-500 to-purple-600 text-white shadow-xs shrink-0">
                        {(item as any).badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-pink-50 space-y-3">
          {isSidebarOpen ? (
            <PWAInstallButton variant="menuItem" />
          ) : (
            <div className="flex justify-center">
              <PWAInstallButton className="!p-2.5 !rounded-2xl" />
            </div>
          )}
          <button onClick={handleLogout} className={`w-full flex items-center ${isSidebarOpen ? 'gap-4 p-4' : 'justify-center p-4'} rounded-2xl text-red-400 hover:bg-red-50 transition-all group`} title={!isSidebarOpen ? 'Sair' : ''}>
            <LogOut size={20} className="group-hover:scale-110 transition-transform" />
            {isSidebarOpen && <span className="font-black text-sm animate-fadeIn">Sair</span>}
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="h-16 bg-white border-b border-pink-50 flex items-center justify-between px-4 sm:px-6 z-10 shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-pink-50 rounded-xl text-gray-400 transition-colors" aria-label="Menu">
              {isSidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <img 
                src={companyData?.logo || "/images/papelietes_calcula_logo.png"} 
                alt="Papelietes Calcula" 
                className="w-7 h-7 object-contain" 
                referrerPolicy="no-referrer" 
              />
              <span className="font-black text-pink-600 text-sm tracking-tight truncate max-w-[140px] sm:max-w-none">
                Papelietes Calcula
              </span>
            </div>
            <button 
              onClick={() => {
                if (syncStatus === 'error' && syncErrorMessage) {
                  const isRLS = syncErrorMessage.includes('Permission denied') || syncErrorMessage.includes('403') || syncErrorMessage.includes('row-level security');
                  const isNotFound = syncErrorMessage.includes('user_data" não foi encontrada') || syncErrorMessage.includes('relation "public.user_data" does not exist') || syncErrorMessage.includes('404');
                  const isConnection = syncErrorMessage.includes('Failed to fetch') || syncErrorMessage.includes('network');
                  
                  let helpMsg = `Problema na Sincronização:\n\nDetalhe: ${syncErrorMessage}\n\nO que fazer?\n`;
                  if (isNotFound) {
                    helpMsg += "1. A tabela 'user_data' não foi encontrada no seu banco de dados Supabase.\n2. Crie a tabela 'user_data' com a coluna 'user_email' (TEXT, chave primária) e 'app_state' (JSONB).";
                  } else if (isRLS) {
                    helpMsg += "1. Erro de permissão (RLS). Você habilitou RLS na tabela, mas as políticas de acesso impedem as operações.\n2. Verifique as políticas de segurança da sua tabela 'user_data'.";
                  } else if (isConnection) {
                    helpMsg += "1. Verifique sua conexão com a internet.\n2. Verifique se o seu projeto Supabase não está pausado ou desativado.";
                  } else {
                    helpMsg += "1. Verifique as credenciais e URL do Supabase no arquivo de configuração do ambiente.\n2. Veja os detalhes do erro no console (F12) para depuração técnica.";
                  }
                  alert(helpMsg);
                } else if (syncStatus === 'local') {
                  alert("Sincronização Ativa\n\nSeus dados estão sendo guardados de forma automática e segura.");
                }
                handleManualRefresh();
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${
              syncStatus === 'synced' || syncStatus === 'local' ? 'bg-green-50 border-green-100 text-green-500 hover:bg-green-100' :
              syncStatus === 'syncing' ? 'bg-blue-50 border-blue-100 text-blue-500 animate-pulse' :
              'bg-red-50 border-red-100 text-red-500 hover:bg-red-200 shadow-sm'
            }`} title={syncStatus === 'error' ? `Erro: ${syncErrorMessage}. Clique para ver detalhes.` : 'Sincronização automática ativa.'}>
              {syncStatus === 'synced' || syncStatus === 'local' ? <CheckCircle2 size={12} /> : 
               syncStatus === 'syncing' ? <RefreshCw size={12} className="animate-spin" /> : 
               <AlertCircle size={12} />}
              <span className="hidden sm:inline">
                {syncStatus === 'synced' || syncStatus === 'local' ? 'Sincronizado' : 
                 syncStatus === 'syncing' ? 'Sincronizando...' : 
                 'Erro na Nuvem — Tentar'}
              </span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3">
            <CatalogOrderNotification 
              notifications={catalogNotifications}
              activeToast={activeCatalogToast}
              onDismissToast={() => setActiveCatalogToast(null)}
              onDismissNotification={(notifId) => {
                setCatalogNotifications(prev => {
                  const updated = prev.filter(n => n.id !== notifId);
                  try {
                    localStorage.setItem('catalog_order_notifications', JSON.stringify(updated));
                  } catch (e) {}
                  return updated;
                });
              }}
              onMarkAllRead={() => {
                setCatalogNotifications(() => {
                  try {
                    localStorage.setItem('catalog_order_notifications', JSON.stringify([]));
                  } catch (e) {}
                  return [];
                });
              }}
              onSelectOrder={(orderAlert, targetTab) => {
                setActiveTab(targetTab);
                setCatalogNotifications(prev => {
                  const updated = prev.filter(n => n.id !== orderAlert.id && n.quoteNumber !== orderAlert.quoteNumber);
                  try {
                    localStorage.setItem('catalog_order_notifications', JSON.stringify(updated));
                  } catch (e) {}
                  return updated;
                });
              }}
            />
            <PWAInstallButton />
            <div className="hidden sm:flex flex-col items-end border-l border-gray-100 pl-4">
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Logado como</p>
              <p className="text-xs font-black text-pink-600 truncate max-w-[150px] leading-none">{currentUser}</p>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 xl:p-12 pb-24 lg:pb-12">
          <div className="max-w-[1800px] mx-auto">
             {(() => {
                const props = { projects, customers, materials, companyData, platforms, transactions, products };
                switch (activeTab) {
                  case 'dashboard': return <Dashboard {...props} setProjects={setProjects} setTransactions={setTransactions} setCompanyData={setCompanyData} onNavigate={(tab) => setActiveTab(tab)} />;
                  case 'inventory': return <Inventory materials={materials} setMaterials={setMaterials} />;
                  case 'products': return <Products products={products} setProducts={setProducts} materials={materials} companyData={companyData} platforms={platforms} productCategories={productCategories} setProductCategories={setProductCategories} currentUser={currentUser || ''} />;
                  case 'customers': return <Customers {...props} setCustomers={setCustomers} />;
                  case 'pricing': return <PricingCalculator {...props} setCustomers={setCustomers} products={products} setProjects={setProjects} setTransactions={setTransactions} paymentMethods={paymentMethods} projectToEdit={projectToEdit} onClearEditProject={() => setProjectToEdit(null)} />;
                  case 'schedule': return <Schedule {...props} currentUser={currentUser || ''} setProjects={setProjects} transactions={transactions} setTransactions={setTransactions} onEditProject={(p) => { setProjectToEdit(p); setActiveTab('pricing'); }} />;
                  case 'order_history': return <OrderHistory {...props} transactions={transactions} />;
                  case 'catalog': return <CatalogManager currentUser={currentUser || ''} companyData={companyData} products={products} projects={projects} transactions={transactions} customers={customers} materials={materials} platforms={platforms} onNavigate={(tab) => setActiveTab(tab)} onEditProject={(p) => { setProjectToEdit(p); setActiveTab('pricing'); }} />;
                  case 'finance': return <FinancialControl {...props} setTransactions={setTransactions} setCustomers={setCustomers} closures={closures} setClosures={setClosures} categories={transactionCategories} setCategories={setTransactionCategories} paymentMethods={paymentMethods} setPaymentMethods={setPaymentMethods} setProjects={setProjects} />;
                  case 'captions': return <AICaptionGenerator companyData={companyData} products={products} projects={projects} currentUser={currentUser || ''} />;
                  case 'settings': return <SettingsView companyData={companyData} setCompanyData={setCompanyData} platforms={platforms} setPlatforms={setPlatforms} currentUser={currentUser || ''} />;
                  default: return <Dashboard {...props} setTransactions={setTransactions} setCompanyData={setCompanyData} onNavigate={(tab) => setActiveTab(tab)} />;
                }
             })()}
          </div>
        </div>
      </main>

      {isAuthenticated && !isInitialLoadDone && (
        <div className="fixed inset-0 bg-white z-[9999] flex flex-col items-center justify-center gap-6">
           <RefreshCw className="text-pink-500 animate-spin" size={56} />
           <div className="text-center">
             <p className="text-gray-800 font-black uppercase text-xs tracking-[0.3em] mb-2">Preparando seu Ateliê</p>
             <p className="text-gray-400 font-bold text-[10px] animate-pulse">Organizando gavetas e materiais...</p>
           </div>
        </div>
      )}

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] border border-gray-150 p-8 max-w-sm w-full shadow-2xl space-y-6">
            <div className="text-center space-y-3">
              <div className="mx-auto w-12 h-12 bg-red-50 border border-red-100 rounded-full flex items-center justify-center text-red-500 mb-2">
                <AlertCircle size={24} />
              </div>
              <h3 className="text-lg font-black text-gray-800 tracking-tight">Deseja sair do ateliê?</h3>
              <p className="text-xs text-gray-500 font-semibold leading-relaxed">
                Você sairá da sua sessão atual. Seus dados locais permanecem seguros neste dispositivo.
              </p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-600 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm transition-all"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner de Instalação Mobile PWA */}
      <PWAInstallBanner logoUrl={companyData?.logo} />
    </div>
  );
};

export default App;

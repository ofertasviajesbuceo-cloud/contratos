import React, { useEffect, useMemo, useRef, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  AlertCircle,
  Building2,
  Cloud,
  CloudOff,
  FileText,
  Globe,
  Layers,
  LogIn,
  LogOut,
  Menu,
  Plus,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { auth, googleProvider } from './firebase';
import {
  deleteAccessUserRemote,
  deleteClientRemote,
  deleteContractRemote,
  deleteTemplateRemote,
  ensureUserWorkspaceSeeded,
  saveAgencyProfileRemote,
  subscribeAccessUsers,
  subscribeAgencyProfile,
  subscribeClients,
  subscribeContracts,
  subscribeTemplates,
  upsertAccessUserRemote,
  upsertClientRemote,
  upsertContractRemote,
  upsertTemplateRemote,
} from './services/firestoreStore';
import {
  DEFAULT_AGENCY_PROFILE,
  SEED_ACCESS_USERS,
  SEED_CLIENTS,
  SEED_CONTRACTS,
  SEED_TEMPLATES,
} from './data/seedData';
import type {
  AccessRole,
  AccessUser,
  ActiveSession,
  AgencyProfile,
  Client,
  SaveSyncState,
  TravelContract,
  TripTemplate,
} from './types/contract';
import { getRolePermissions, verifyPassword } from './utils/authCrypto';
import {
  buildCanonicalUrl,
  createContractFromTemplate,
  formatFirestoreErrorForUser,
  formatSpanishLongDate,
  generateNextContractNumber,
  normalizeAgencyProfile,
  normalizeClient,
  normalizeContract,
  normalizeTemplate,
  normalizeUsername,
  type TravelerRole,
} from './utils/contractLogic';
import { ContractsListView } from './components/ContractsListView';
import { ContractEditorView } from './components/ContractEditorView';
import { TemplatesView } from './components/TemplatesView';
import { ClientsView } from './components/ClientsView';
import { UsersView } from './components/UsersView';
import { LoginScreen } from './components/LoginScreen';
import { NewContractModal } from './components/NewContractModal';
import { AgencySettingsModal } from './components/AgencySettingsModal';
import { DomainPublishModal } from './components/DomainPublishModal';
import { DiverTriangleLogo } from './components/AgencyBrandMarks';
import { ErrorBoundary } from './components/ErrorBoundary';

type NavTab = 'contracts' | 'templates' | 'clients' | 'users';

const ROLE_LABELS: Record<AccessRole, string> = {
  admin: 'Administrador total',
  editor: 'Gestor de viajes',
  viewer: 'Solo lectura',
};

const LS_KEYS = {
  agency: 'mdh_agency_v1',
  clients: 'mdh_clients_v1',
  templates: 'mdh_templates_v1',
  contracts: 'mdh_contracts_v1',
  accessUsers: 'mdh_access_users_v1',
};

const SESSION_KEY = 'mdh_session_v1';

function readLocalStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeLocalStorage<T>(key: string, value: T): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors in restricted contexts
  }
}

function readSessionStorage(): ActiveSession | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveSession;
    if (!parsed || !parsed.username || !parsed.role) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSessionStorage(session: ActiveSession | null): void {
  try {
    if (!session) {
      window.sessionStorage.removeItem(SESSION_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  } catch {
    // Ignore restricted storage contexts
  }
}

function mergeWithPrimaryAdmin(list: AccessUser[]): AccessUser[] {
  const primarySeed = SEED_ACCESS_USERS[0];
  const hasPrimary = list.some((u) => u.id === primarySeed.id || u.isPrimary);
  if (hasPrimary) {
    return list.map((u) =>
      u.id === primarySeed.id || u.isPrimary
        ? { ...u, isPrimary: true, role: 'admin', active: true }
        : u
    );
  }
  return [primarySeed, ...list];
}

function WorkspaceApp() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [session, setSession] = useState<ActiveSession | null>(() => readSessionStorage());

  const [activeTab, setActiveTab] = useState<NavTab>('contracts');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [agency, setAgency] = useState<AgencyProfile>(() => {
    const stored = readLocalStorage(LS_KEYS.agency, DEFAULT_AGENCY_PROFILE);
    return normalizeAgencyProfile({
      ...DEFAULT_AGENCY_PROFILE,
      ...stored,
      publicDomain: stored.publicDomain ?? DEFAULT_AGENCY_PROFILE.publicDomain,
    });
  });
  const [clients, setClients] = useState<Client[]>(() => {
    const raw = readLocalStorage(LS_KEYS.clients, SEED_CLIENTS);
    return Array.isArray(raw) ? raw.map((c) => normalizeClient(c)) : SEED_CLIENTS;
  });
  const [templates, setTemplates] = useState<TripTemplate[]>(() => {
    const raw = readLocalStorage(LS_KEYS.templates, SEED_TEMPLATES);
    return Array.isArray(raw) ? raw.map((t) => normalizeTemplate(t)) : SEED_TEMPLATES;
  });
  const [contracts, setContracts] = useState<TravelContract[]>(() => {
    const raw = readLocalStorage(LS_KEYS.contracts, SEED_CONTRACTS);
    return Array.isArray(raw) ? raw.map((c) => normalizeContract(c)) : SEED_CONTRACTS;
  });
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>(() =>
    mergeWithPrimaryAdmin(readLocalStorage(LS_KEYS.accessUsers, SEED_ACCESS_USERS))
  );

  const [activeContractId, setActiveContractId] = useState<string | null>(null);
  const [editorInitialMode, setEditorInitialMode] = useState<'split' | 'form' | 'preview'>('split');

  const [newModalOpen, setNewModalOpen] = useState(false);
  const [newModalTemplateId, setNewModalTemplateId] = useState<string | undefined>(undefined);
  const [newModalClientId, setNewModalClientId] = useState<string | undefined>(undefined);
  const [agencyModalOpen, setAgencyModalOpen] = useState(false);
  const [domainModalOpen, setDomainModalOpen] = useState(false);

  const [saveState, setSaveState] = useState<SaveSyncState>('idle');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const autoSaveTimerRef = useRef<number | null>(null);

  // Firebase Auth listener
  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => {
      setAuthReady(true);
    }, 2500);

    const unsub = onAuthStateChanged(
      auth,
      async (currentUser) => {
        window.clearTimeout(fallbackTimer);
        setUser(currentUser);
        setAuthReady(true);
        if (currentUser) {
          setSession((prev) => {
            if (prev && prev.authSource === 'local-user') {
              return prev;
            }
            const nextGoogleSession: ActiveSession = {
              userId: currentUser.uid,
              username: currentUser.email?.split('@')[0] || 'google',
              displayName: currentUser.displayName || currentUser.email || 'Administrador',
              email: currentUser.email || '',
              role: 'admin',
              authSource: 'google',
            };
            writeSessionStorage(nextGoogleSession);
            return nextGoogleSession;
          });
          try {
            await ensureUserWorkspaceSeeded(currentUser.uid);
          } catch (err) {
            console.error(err);
          }
        }
      },
      (error) => {
        window.clearTimeout(fallbackTimer);
        console.error(error);
        setAuthReady(true);
      }
    );
    return () => {
      window.clearTimeout(fallbackTimer);
      unsub();
    };
  }, []);

  // Firestore real-time subscriptions when authenticated
  useEffect(() => {
    if (!authReady || !user) return;
    const uid = user.uid;

    const unsubAgency = subscribeAgencyProfile(uid, setAgency);
    const unsubClients = subscribeClients(uid, setClients);
    const unsubTemplates = subscribeTemplates(uid, setTemplates);
    const unsubContracts = subscribeContracts(uid, setContracts);
    const unsubAccessUsers = subscribeAccessUsers(uid, (remoteUsers) => {
      setAccessUsers(mergeWithPrimaryAdmin(remoteUsers));
    });

    return () => {
      unsubAgency();
      unsubClients();
      unsubTemplates();
      unsubContracts();
      unsubAccessUsers();
    };
  }, [authReady, user]);

  // Persist local mode changes cleanly
  useEffect(() => {
    if (authReady && !user) {
      writeLocalStorage(LS_KEYS.agency, agency);
    }
  }, [agency, authReady, user]);

  useEffect(() => {
    if (authReady && !user) {
      writeLocalStorage(LS_KEYS.clients, clients);
    }
  }, [clients, authReady, user]);

  useEffect(() => {
    if (authReady && !user) {
      writeLocalStorage(LS_KEYS.templates, templates);
    }
  }, [templates, authReady, user]);

  useEffect(() => {
    if (authReady && !user) {
      writeLocalStorage(LS_KEYS.contracts, contracts);
    }
  }, [contracts, authReady, user]);

  useEffect(() => {
    if (authReady && !user) {
      writeLocalStorage(LS_KEYS.accessUsers, accessUsers);
    }
  }, [accessUsers, authReady, user]);

  const permissions = useMemo(
    () => getRolePermissions(session?.role ?? 'viewer'),
    [session?.role]
  );

  useEffect(() => {
    if (activeTab === 'users' && !permissions.canManageUsers) {
      setActiveTab('contracts');
    }
  }, [activeTab, permissions.canManageUsers]);

  // Sync canonical and og:url metadata with configured publication domain
  useEffect(() => {
    const envPublicUrl =
      (import.meta as unknown as { env?: Record<string, string | undefined> }).env
        ?.VITE_PUBLIC_APP_URL || '';
    const fallbackOrigin =
      envPublicUrl.trim() ||
      (typeof window !== 'undefined' ? window.location.origin : '');
    const canonical = buildCanonicalUrl(agency.publicDomain, fallbackOrigin);
    if (!canonical) return;

    const canonicalLink = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonicalLink) {
      canonicalLink.href = canonical;
    }
    const ogUrlMeta = document.querySelector<HTMLMetaElement>('meta[property="og:url"]');
    if (ogUrlMeta) {
      ogUrlMeta.content = canonical;
    }
  }, [agency.publicDomain]);

  const activeContract = useMemo(
    () => contracts.find((c) => c.id === activeContractId) || null,
    [contracts, activeContractId]
  );

  const suggestedNextContractNumber = useMemo(
    () => generateNextContractNumber(contracts),
    [contracts]
  );

  const handlePasswordLogin = async (
    rawUsername: string,
    password: string
  ): Promise<string | null> => {
    const normalized = normalizeUsername(rawUsername);
    const candidate = accessUsers.find(
      (item) => normalizeUsername(item.username) === normalized
    );
    if (!candidate) {
      return 'Usuario o contraseña incorrectos.';
    }
    if (!candidate.active) {
      return 'Esta cuenta de usuario está desactivada. Contacta con el administrador principal.';
    }
    const valid = await verifyPassword(password, candidate.passwordHash);
    if (!valid) {
      return 'Usuario o contraseña incorrectos.';
    }

    const nextSession: ActiveSession = {
      userId: candidate.id,
      username: candidate.username,
      displayName: candidate.displayName,
      email: candidate.email,
      role: candidate.role,
      authSource: 'local-user',
    };
    writeSessionStorage(nextSession);
    setSession(nextSession);
    setActiveTab('contracts');
    setActiveContractId(null);
    return null;
  };

  const handleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code =
        typeof err === 'object' && err !== null && 'code' in err
          ? String((err as { code?: unknown }).code)
          : '';
      if (code === 'auth/unauthorized-domain') {
        const currentHost =
          typeof window !== 'undefined' ? window.location.hostname : 'este dominio';
        setAuthError(
          `El dominio "${currentHost}" aún no está autorizado en Firebase Auth. Ábrelo en "Dominio y publicación" y añádelo a Authorized domains.`
        );
      } else {
        setAuthError(
          err instanceof Error ? err.message : 'No se pudo completar el inicio de sesión.'
        );
      }
    }
  };

  const handleSignOut = async () => {
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    writeSessionStorage(null);
    setSession(null);
    if (user) {
      await signOut(auth);
    }
    setAgency(normalizeAgencyProfile(readLocalStorage(LS_KEYS.agency, DEFAULT_AGENCY_PROFILE)));
    const storedClients = readLocalStorage(LS_KEYS.clients, SEED_CLIENTS);
    setClients(Array.isArray(storedClients) ? storedClients.map((c) => normalizeClient(c)) : SEED_CLIENTS);
    const storedTemplates = readLocalStorage(LS_KEYS.templates, SEED_TEMPLATES);
    setTemplates(Array.isArray(storedTemplates) ? storedTemplates.map((t) => normalizeTemplate(t)) : SEED_TEMPLATES);
    const storedContracts = readLocalStorage(LS_KEYS.contracts, SEED_CONTRACTS);
    setContracts(Array.isArray(storedContracts) ? storedContracts.map((c) => normalizeContract(c)) : SEED_CONTRACTS);
    setAccessUsers(
      mergeWithPrimaryAdmin(readLocalStorage(LS_KEYS.accessUsers, SEED_ACCESS_USERS))
    );
    setActiveContractId(null);
    setSaveState('idle');
    setRemoteError(null);
    setActionError(null);
  };

  const formatTimeNow = () =>
    new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const handleContractEdit = (updated: TravelContract) => {
    if (!permissions.canEditContracts) return;
    setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSaveState('saving');
    setRemoteError(null);

    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = window.setTimeout(async () => {
      if (user) {
        try {
          await upsertContractRemote(user.uid, updated, false);
          setSaveState('saved');
          setLastSavedAt(formatTimeNow());
          setRemoteError(null);
        } catch (err) {
          console.error(err);
          setSaveState('error');
          setRemoteError(formatFirestoreErrorForUser(err));
        }
      } else {
        setSaveState('local');
        setLastSavedAt(formatTimeNow());
      }
    }, 550);
  };

  const handleOpenContract = (
    contractId: string,
    mode: 'split' | 'form' | 'preview' = 'split'
  ) => {
    setActiveTab('contracts');
    setEditorInitialMode(mode);
    setActiveContractId(contractId);
    setSaveState(user ? 'saved' : 'local');
    setRemoteError(null);
  };

  const handleCreateContract = async (params: {
    templateId: string;
    client: Client;
    isNewClient: boolean;
    contractNumber: string;
    travelerRole: TravelerRole;
  }) => {
    if (!permissions.canEditContracts) {
      throw new Error('Tu usuario no tiene permisos para crear contratos.');
    }
    const template = templates.find((t) => t.id === params.templateId);
    if (!template) {
      throw new Error('Selecciona una plantilla de viaje válida.');
    }

    setActionError(null);
    setRemoteError(null);

    const ownerId = user?.uid || 'local-demo';
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const clientWithOwner = {
      ...normalizeClient(params.client),
      id: params.client.id || `cli-${uniqueSuffix}`,
      ownerId,
    };

    if (params.isNewClient) {
      if (user) {
        const alreadyExists = clients.some((c) => c.id === clientWithOwner.id);
        if (!alreadyExists) {
          try {
            await upsertClientRemote(user.uid, clientWithOwner, true);
          } catch (err) {
            console.error(err);
            throw new Error(formatFirestoreErrorForUser(err));
          }
        }
      }
      setClients((prev) =>
        prev.some((c) => c.id === clientWithOwner.id) ? prev : [clientWithOwner, ...prev]
      );
    }

    const created = createContractFromTemplate({
      id: `ctr-${uniqueSuffix}`,
      ownerId,
      template,
      client: clientWithOwner,
      agency,
      contractNumber: params.contractNumber,
      contractDateText: formatSpanishLongDate(),
      travelerRole: params.travelerRole,
    });

    if (user) {
      setSaveState('saving');
      try {
        await upsertContractRemote(user.uid, created, true);
        setContracts((prev) => [created, ...prev]);
        setNewModalOpen(false);
        setNewModalTemplateId(undefined);
        setNewModalClientId(undefined);
        setActiveTab('contracts');
        setEditorInitialMode('split');
        setActiveContractId(created.id);
        setSaveState('saved');
        setLastSavedAt(formatTimeNow());
        setRemoteError(null);
      } catch (err) {
        console.error(err);
        setSaveState('error');
        const readable = formatFirestoreErrorForUser(err);
        setRemoteError(readable);
        throw new Error(readable);
      }
    } else {
      setContracts((prev) => [created, ...prev]);
      setNewModalOpen(false);
      setNewModalTemplateId(undefined);
      setNewModalClientId(undefined);
      setActiveTab('contracts');
      setEditorInitialMode('split');
      setActiveContractId(created.id);
      setSaveState('local');
      setLastSavedAt(formatTimeNow());
    }
  };

  const handleDuplicateContract = async (source: TravelContract) => {
    if (!permissions.canEditContracts) return;
    setActionError(null);
    const ownerId = user?.uid || 'local-demo';
    const nextNumber = generateNextContractNumber(contracts);
    const copy: TravelContract = {
      ...normalizeContract(source),
      id: `ctr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ownerId,
      contractNumber: nextNumber,
      contractDateText: formatSpanishLongDate(),
      status: 'draft',
    };
    if (user) {
      try {
        await upsertContractRemote(user.uid, copy, true);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setContracts((prev) => [copy, ...prev]);
    handleOpenContract(copy.id, 'split');
  };

  const handleDeleteContract = async (contractId: string) => {
    if (!permissions.canDeleteRecords) return;
    setActionError(null);
    if (user) {
      try {
        await deleteContractRemote(contractId);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setContracts((prev) => prev.filter((c) => c.id !== contractId));
    if (activeContractId === contractId) {
      setActiveContractId(null);
    }
  };

  const handleSaveTemplate = async (template: TripTemplate, isNew: boolean) => {
    if (!permissions.canEditTemplates) return;
    setActionError(null);
    const ownerId = user?.uid || 'local-demo';
    const withOwner = { ...normalizeTemplate(template), ownerId };
    if (user) {
      try {
        await upsertTemplateRemote(user.uid, withOwner, isNew);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setTemplates((prev) => {
      if (isNew) return [withOwner, ...prev];
      return prev.map((t) => (t.id === withOwner.id ? withOwner : t));
    });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!permissions.canDeleteRecords) return;
    setActionError(null);
    if (user) {
      try {
        await deleteTemplateRemote(templateId);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setTemplates((prev) => prev.filter((t) => t.id !== templateId));
  };

  const handleSaveClient = async (client: Client, isNew: boolean) => {
    if (!permissions.canEditClients) return;
    setActionError(null);
    const ownerId = user?.uid || 'local-demo';
    const withOwner = { ...normalizeClient(client), ownerId };
    if (user) {
      try {
        await upsertClientRemote(user.uid, withOwner, isNew);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setClients((prev) => {
      if (isNew) return [withOwner, ...prev];
      return prev.map((c) => (c.id === withOwner.id ? withOwner : c));
    });
  };

  const handleDeleteClient = async (clientId: string) => {
    if (!permissions.canDeleteRecords) return;
    setActionError(null);
    if (user) {
      try {
        await deleteClientRemote(clientId);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setClients((prev) => prev.filter((c) => c.id !== clientId));
  };

  const handleSaveAgency = async (updated: AgencyProfile) => {
    if (!permissions.canManageAgency) return;
    setActionError(null);
    const ownerId = user?.uid || 'local-demo';
    const withOwner = { ...normalizeAgencyProfile(updated), ownerId };
    if (user) {
      try {
        await saveAgencyProfileRemote(user.uid, withOwner);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setAgency(withOwner);
  };

  const handleSaveDomain = async (normalizedDomain: string) => {
    if (!permissions.canManageDomain) return;
    setActionError(null);
    const ownerId = user?.uid || 'local-demo';
    const withOwner: AgencyProfile = {
      ...normalizeAgencyProfile(agency),
      ownerId,
      publicDomain: normalizedDomain,
    };
    if (user) {
      try {
        await saveAgencyProfileRemote(user.uid, withOwner);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setAgency(withOwner);
  };

  const handleSaveAccessUser = async (accessUser: AccessUser, isNew: boolean) => {
    if (!permissions.canManageUsers) return;
    setActionError(null);
    const ownerId = user?.uid || 'local-demo';
    const withOwner: AccessUser = {
      ...accessUser,
      ownerId,
      role: accessUser.isPrimary ? 'admin' : accessUser.role,
      active: accessUser.isPrimary ? true : accessUser.active,
    };
    if (user) {
      try {
        await upsertAccessUserRemote(user.uid, withOwner, isNew);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setAccessUsers((prev) => {
      const next = isNew
        ? [...prev, withOwner]
        : prev.map((u) => (u.id === withOwner.id ? withOwner : u));
      return mergeWithPrimaryAdmin(next);
    });
    if (session && session.authSource === 'local-user' && session.userId === withOwner.id) {
      const updatedSession: ActiveSession = {
        ...session,
        username: withOwner.username,
        displayName: withOwner.displayName,
        email: withOwner.email,
        role: withOwner.role,
      };
      setSession(updatedSession);
      writeSessionStorage(updatedSession);
    }
  };

  const handleDeleteAccessUser = async (accessUserId: string) => {
    if (!permissions.canManageUsers) return;
    const target = accessUsers.find((u) => u.id === accessUserId);
    if (!target || target.isPrimary || session?.userId === accessUserId) return;
    setActionError(null);
    if (user) {
      try {
        await deleteAccessUserRemote(accessUserId);
      } catch (err) {
        console.error(err);
        setActionError(formatFirestoreErrorForUser(err));
        return;
      }
    }
    setAccessUsers((prev) => prev.filter((u) => u.id !== accessUserId));
  };

  const openNewContractFromTemplate = (templateId: string) => {
    if (!permissions.canEditContracts) return;
    setNewModalTemplateId(templateId);
    setNewModalClientId(undefined);
    setNewModalOpen(true);
  };

  const openNewContractForClient = (clientId: string) => {
    if (!permissions.canEditContracts) return;
    setNewModalClientId(clientId);
    setNewModalTemplateId(undefined);
    setNewModalOpen(true);
  };

  if (!authReady && !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="text-sm font-medium text-slate-500">Cargando acceso seguro...</div>
      </div>
    );
  }

  if (!session) {
    return (
      <LoginScreen
        agencyName={agency.commercialName}
        onPasswordLogin={handlePasswordLogin}
        onGoogleLogin={handleSignIn}
        googleError={authError}
      />
    );
  }

  const currentBreadcrumb = activeContract
    ? `Contratos / ${activeContract.contractNumber}`
    : activeTab === 'contracts'
      ? 'Contratos'
      : activeTab === 'templates'
        ? 'Plantillas de viajes'
        : activeTab === 'clients'
          ? 'Clientes'
          : 'Usuarios de acceso';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Sidebar Desktop + Mobile Drawer */}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div>
          <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <DiverTriangleLogo className="w-8 h-7 shrink-0" />
              <span className="text-sm font-bold tracking-tight text-slate-900 truncate">
                {agency.commercialName}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Cerrar menú lateral"
              className="lg:hidden p-1 text-slate-500 hover:text-slate-800"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <nav className="p-3 space-y-1" aria-label="Navegación principal">
            <button
              type="button"
              onClick={() => {
                setActiveTab('contracts');
                setActiveContractId(null);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'contracts'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <FileText className="w-4 h-4" aria-hidden="true" />
                Contratos
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {contracts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('templates');
                setActiveContractId(null);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'templates'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Layers className="w-4 h-4" aria-hidden="true" />
                Plantillas de viaje
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {templates.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('clients');
                setActiveContractId(null);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                activeTab === 'clients'
                  ? 'bg-blue-50 text-blue-800'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              <span className="inline-flex items-center gap-2.5">
                <Users className="w-4 h-4" aria-hidden="true" />
                Clientes
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                {clients.length}
              </span>
            </button>

            {permissions.canManageUsers && (
              <button
                type="button"
                onClick={() => {
                  setActiveTab('users');
                  setActiveContractId(null);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap ${
                  activeTab === 'users'
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="inline-flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4" aria-hidden="true" />
                  Usuarios de acceso
                </span>
                <span className="text-xs font-mono tabular-nums text-slate-500">
                  {accessUsers.length}
                </span>
              </button>
            )}

            {(permissions.canManageAgency || permissions.canManageDomain) && (
              <div className="pt-3 mt-3 border-t border-slate-200 space-y-1">
                {permissions.canManageAgency && (
                  <button
                    type="button"
                    onClick={() => {
                      setAgencyModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Building2 className="w-4 h-4" aria-hidden="true" />
                    Datos de agencia
                  </button>
                )}

                {permissions.canManageDomain && (
                  <button
                    type="button"
                    onClick={() => {
                      setDomainModalOpen(true);
                      setMobileMenuOpen(false);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <span className="inline-flex items-center gap-2.5 truncate">
                      <Globe className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span className="truncate">Dominio y publicación</span>
                    </span>
                    {agency.publicDomain ? (
                      <span
                        className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"
                        title={`Dominio activo: ${agency.publicDomain}`}
                        aria-label="Dominio configurado"
                      />
                    ) : null}
                  </button>
                )}
              </div>
            )}
          </nav>
        </div>

        {/* Active Access Session + Cloud / Firebase Account Section */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/70 space-y-3">
          <div className="flex items-start gap-2.5">
            {user ? (
              <Cloud className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" aria-hidden="true" />
            ) : (
              <CloudOff className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" aria-hidden="true" />
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">
                {session.displayName}
              </p>
              <p className="text-[11px] font-mono text-slate-500 truncate">
                @{session.username} · {ROLE_LABELS[session.role]}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                {user ? `Firebase activo (${user.email})` : 'Almacenamiento local activo'}
              </p>
            </div>
          </div>

          {!user && permissions.canManageUsers && (
            <>
              {authError && <p className="text-xs text-red-600">{authError}</p>}
              <button
                type="button"
                onClick={handleSignIn}
                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5" aria-hidden="true" />
                Conectar con Google
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract */}
        <header className="no-print h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Abrir menú lateral"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="flex items-center gap-2 text-sm min-w-0 truncate">
              <span className="text-slate-500 hidden sm:inline">Gestión de viajes</span>
              <span className="text-slate-300 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="font-semibold text-slate-900 truncate">{currentBreadcrumb}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {permissions.canEditContracts ? (
              <button
                type="button"
                onClick={() => {
                  setNewModalTemplateId(undefined);
                  setNewModalClientId(undefined);
                  setNewModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                Nuevo contrato
              </button>
            ) : (
              <span className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-md">
                Solo lectura
              </span>
            )}
          </div>
        </header>

        {/* Viewport */}
        <main className="flex-1 p-4 sm:p-6 max-w-[1440px] w-full mx-auto print:p-0 print:max-w-none space-y-4">
          {actionError && (
            <div
              role="alert"
              className="no-print flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-800 rounded-xl px-4 py-3 text-sm"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{actionError}</span>
              </div>
              <button
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Cerrar aviso de error"
                className="p-1 text-red-500 hover:text-red-800 rounded"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}

          {activeContract ? (
            <ContractEditorView
              contract={activeContract}
              agency={agency}
              clients={clients}
              templates={templates}
              initialViewMode={editorInitialMode}
              readOnly={!permissions.canEditContracts}
              saveState={saveState}
              lastSavedAt={lastSavedAt}
              remoteError={remoteError}
              onChange={handleContractEdit}
              onBack={() => setActiveContractId(null)}
            />
          ) : activeTab === 'contracts' ? (
            <ContractsListView
              contracts={contracts}
              permissions={permissions}
              onOpenContract={handleOpenContract}
              onDuplicateContract={handleDuplicateContract}
              onDeleteContract={handleDeleteContract}
              onNewContract={() => setNewModalOpen(true)}
            />
          ) : activeTab === 'templates' ? (
            <TemplatesView
              templates={templates}
              permissions={permissions}
              onSaveTemplate={handleSaveTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onCreateContractFromTemplate={openNewContractFromTemplate}
            />
          ) : activeTab === 'clients' ? (
            <ClientsView
              clients={clients}
              permissions={permissions}
              onSaveClient={handleSaveClient}
              onDeleteClient={handleDeleteClient}
              onCreateContractForClient={openNewContractForClient}
            />
          ) : (
            <UsersView
              users={accessUsers}
              currentUsername={session.username}
              onSaveUser={handleSaveAccessUser}
              onDeleteUser={handleDeleteAccessUser}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <NewContractModal
        open={newModalOpen}
        templates={templates}
        clients={clients}
        suggestedContractNumber={suggestedNextContractNumber}
        initialTemplateId={newModalTemplateId}
        initialClientId={newModalClientId}
        onClose={() => setNewModalOpen(false)}
        onConfirm={handleCreateContract}
      />

      <AgencySettingsModal
        open={agencyModalOpen}
        agency={agency}
        onClose={() => setAgencyModalOpen(false)}
        onSave={handleSaveAgency}
      />

      <DomainPublishModal
        open={domainModalOpen}
        currentDomain={agency.publicDomain ?? ''}
        onClose={() => setDomainModalOpen(false)}
        onSaveDomain={handleSaveDomain}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
    </ErrorBoundary>
  );
}

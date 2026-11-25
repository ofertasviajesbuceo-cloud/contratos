import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  AccessUser,
  AgencyProfile,
  Client,
  TravelContract,
  TripTemplate,
} from '../types/contract';
import {
  normalizeAgencyProfile,
  normalizeClient,
  normalizeContract,
  normalizeTemplate,
  sanitizeAccessUserPayload,
  sanitizeAgencyProfilePayload,
  sanitizeClientPayload,
  sanitizeContractPayload,
  sanitizeTemplatePayload,
} from '../utils/contractLogic';
import {
  DEFAULT_AGENCY_PROFILE,
  SEED_ACCESS_USERS,
  SEED_CLIENTS,
  SEED_CONTRACTS,
  SEED_TEMPLATES,
} from '../data/seedData';

export async function ensureUserWorkspaceSeeded(uid: string): Promise<void> {
  const agencyRef = doc(db, 'agencyProfiles', uid);
  try {
    const agencySnap = await getDoc(agencyRef);
    if (!agencySnap.exists()) {
      const payload = sanitizeAgencyProfilePayload(DEFAULT_AGENCY_PROFILE, uid);
      await setDoc(agencyRef, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `agencyProfiles/${uid}`);
  }

  // Check if user already has templates or contracts; if empty, seed starter templates & sample contract
  try {
    const tplQuery = query(collection(db, 'templates'), where('ownerId', '==', uid));
    const tplSnap = await getDocs(tplQuery);
    if (tplSnap.empty) {
      const batch = writeBatch(db);
      for (const tpl of SEED_TEMPLATES) {
        const docId = `${tpl.id}-${uid.slice(0, 6)}`;
        const ref = doc(db, 'templates', docId);
        batch.set(ref, {
          ...sanitizeTemplatePayload(tpl, uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const cli of SEED_CLIENTS) {
        const docId = `${cli.id}-${uid.slice(0, 6)}`;
        const ref = doc(db, 'clients', docId);
        batch.set(ref, {
          ...sanitizeClientPayload(cli, uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      for (const ctr of SEED_CONTRACTS) {
        const docId = `${ctr.id}-${uid.slice(0, 6)}`;
        const ref = doc(db, 'contracts', docId);
        batch.set(ref, {
          ...sanitizeContractPayload(ctr, uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'workspace_seed');
  }

  // Ensure primary access user exists in Firestore even for workspaces seeded earlier
  try {
    const usersQuery = query(collection(db, 'accessUsers'), where('ownerId', '==', uid));
    const usersSnap = await getDocs(usersQuery);
    if (usersSnap.empty) {
      const batch = writeBatch(db);
      for (const accessUser of SEED_ACCESS_USERS) {
        const docId = `${accessUser.id}-${uid.slice(0, 6)}`;
        const ref = doc(db, 'accessUsers', docId);
        batch.set(ref, {
          ...sanitizeAccessUserPayload(accessUser, uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'accessUsers_seed');
  }
}

export function subscribeAgencyProfile(
  uid: string,
  onData: (profile: AgencyProfile) => void
): Unsubscribe {
  const path = `agencyProfiles/${uid}`;
  return onSnapshot(
    doc(db, 'agencyProfiles', uid),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as Partial<AgencyProfile>;
        onData(
          normalizeAgencyProfile({
            ...DEFAULT_AGENCY_PROFILE,
            ...data,
            id: snapshot.id,
            publicDomain: data.publicDomain ?? DEFAULT_AGENCY_PROFILE.publicDomain,
          })
        );
      } else {
        onData(normalizeAgencyProfile({ ...DEFAULT_AGENCY_PROFILE, ownerId: uid }));
      }
    },
    (error) => handleFirestoreError(error, OperationType.GET, path)
  );
}

export function subscribeClients(
  uid: string,
  onData: (clients: Client[]) => void
): Unsubscribe {
  const path = 'clients';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        normalizeClient({ ...(d.data() as Partial<Client>), id: d.id })
      );
      items.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeTemplates(
  uid: string,
  onData: (templates: TripTemplate[]) => void
): Unsubscribe {
  const path = 'templates';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        normalizeTemplate({ ...(d.data() as Partial<TripTemplate>), id: d.id })
      );
      items.sort((a, b) => a.name.localeCompare(b.name, 'es'));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export function subscribeContracts(
  uid: string,
  onData: (contracts: TravelContract[]) => void
): Unsubscribe {
  const path = 'contracts';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) =>
        normalizeContract({ ...(d.data() as Partial<TravelContract>), id: d.id })
      );
      items.sort((a, b) => b.contractNumber.localeCompare(a.contractNumber, 'es'));
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function saveAgencyProfileRemote(uid: string, profile: AgencyProfile): Promise<void> {
  const path = `agencyProfiles/${uid}`;
  const ref = doc(db, 'agencyProfiles', uid);
  try {
    const payload = sanitizeAgencyProfilePayload(profile, uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const { ownerId: _ignored, ...updatable } = payload;
      void _ignored;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertClientRemote(uid: string, client: Client, isNew: boolean): Promise<void> {
  const path = `clients/${client.id}`;
  const ref = doc(db, 'clients', client.id);
  const payload = sanitizeClientPayload(client, uid);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { ownerId: _ignored, ...updatable } = payload;
      void _ignored;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteClientRemote(clientId: string): Promise<void> {
  const path = `clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertTemplateRemote(
  uid: string,
  template: TripTemplate,
  isNew: boolean
): Promise<void> {
  const path = `templates/${template.id}`;
  const ref = doc(db, 'templates', template.id);
  const payload = sanitizeTemplatePayload(template, uid);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { ownerId: _ignored, ...updatable } = payload;
      void _ignored;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteTemplateRemote(templateId: string): Promise<void> {
  const path = `templates/${templateId}`;
  try {
    await deleteDoc(doc(db, 'templates', templateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function upsertContractRemote(
  uid: string,
  contract: TravelContract,
  isNew: boolean
): Promise<void> {
  const path = `contracts/${contract.id}`;
  const ref = doc(db, 'contracts', contract.id);
  const payload = sanitizeContractPayload(contract, uid);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { ownerId: _ignored, ...updatable } = payload;
      void _ignored;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteContractRemote(contractId: string): Promise<void> {
  const path = `contracts/${contractId}`;
  try {
    await deleteDoc(doc(db, 'contracts', contractId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeAccessUsers(
  uid: string,
  onData: (users: AccessUser[]) => void
): Unsubscribe {
  const path = 'accessUsers';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => ({ ...(d.data() as AccessUser), id: d.id }));
      items.sort((a, b) => {
        if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
        return a.username.localeCompare(b.username, 'es');
      });
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}

export async function upsertAccessUserRemote(
  uid: string,
  accessUser: AccessUser,
  isNew: boolean
): Promise<void> {
  const path = `accessUsers/${accessUser.id}`;
  const ref = doc(db, 'accessUsers', accessUser.id);
  const payload = sanitizeAccessUserPayload(accessUser, uid);
  try {
    if (isNew) {
      await setDoc(ref, {
        ...payload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const { ownerId: _ignoredOwner, isPrimary: _ignoredPrimary, ...updatable } = payload;
      void _ignoredOwner;
      void _ignoredPrimary;
      await updateDoc(ref, {
        ...updatable,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
  }
}

export async function deleteAccessUserRemote(accessUserId: string): Promise<void> {
  const path = `accessUsers/${accessUserId}`;
  try {
    await deleteDoc(doc(db, 'accessUsers', accessUserId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function createOrUpdateSignatureRequestRemote(params: {
  uid: string;
  requestId: string;
  accessToken: string;
  contract: TravelContract;
  agency: AgencyProfile;
  isExistingRequest?: boolean;
}): Promise<void> {
  const path = `signatureRequests/${params.requestId}`;
  const ref = doc(db, 'signatureRequests', params.requestId);
  const contractPayload = sanitizeContractPayload(params.contract, params.uid);
  const agencyData = {
    commercialName: params.agency.commercialName,
    legalHolderName: params.agency.legalHolderName,
    cif: params.agency.cif,
    licenseNote: params.agency.licenseNote,
    addressLine1: params.agency.addressLine1,
    addressLine2: params.agency.addressLine2,
    phone: params.agency.phone,
    email: params.agency.email,
    iban: params.agency.iban,
    bic: params.agency.bic,
    bankBeneficiary: params.agency.bankBeneficiary,
    footerText: params.agency.footerText,
    jurisdictionCity: params.agency.jurisdictionCity,
  };

  try {
    const snap = params.isExistingRequest === false ? null : await getDoc(ref);
    if (snap && snap.exists()) {
      const existingData = snap.data() as Record<string, unknown>;
      const existingSigUrl = String(existingData?.clientSignatureDataUrl ?? '');
      const alreadySigned = existingData?.status === 'signed' && existingSigUrl.length > 0;
      const finalSigUrl = contractPayload.clientSignatureDataUrl || existingSigUrl;
      const finalSignerName =
        contractPayload.clientSignerName || String(existingData?.clientSignerName ?? '');
      const finalSignedAt =
        contractPayload.clientSignedAt || String(existingData?.clientSignedAt ?? '');
      const finalAgencyCopySentAt =
        contractPayload.agencyCopySentAt || String(existingData?.agencyCopySentAt ?? '');
      const finalAgencyCopyEmail =
        contractPayload.agencyCopyEmail || String(existingData?.agencyCopyEmail ?? '');
      const finalStatus = alreadySigned || finalSigUrl ? 'signed' : 'pending';

      await updateDoc(ref, {
        contractNumber: contractPayload.contractNumber,
        status: finalStatus,
        contractData: contractPayload,
        agencyData,
        clientSignatureDataUrl: finalSigUrl,
        clientSignerName: finalSignerName,
        clientSignedAt: finalSignedAt,
        agencyCopySentAt: finalAgencyCopySentAt,
        agencyCopyEmail: finalAgencyCopyEmail,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        ownerId: params.uid,
        contractId: params.contract.id,
        contractNumber: contractPayload.contractNumber,
        accessToken: params.accessToken,
        status: 'pending',
        contractData: contractPayload,
        agencyData,
        clientSignatureDataUrl: '',
        clientSignerName: '',
        clientSignedAt: '',
        agencyCopySentAt: '',
        agencyCopyEmail: '',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export interface RemoteSignatureRequestPayload {
  id: string;
  ownerId?: string;
  contractId?: string;
  contractNumber?: string;
  accessToken?: string;
  status?: 'pending' | 'signed';
  contractData?: Record<string, unknown>;
  agencyData?: Record<string, unknown>;
  clientSignatureDataUrl?: string;
  clientSignerName?: string;
  clientSignedAt?: string;
  agencyCopySentAt?: string;
  agencyCopyEmail?: string;
}

export async function getSignatureRequestRemote(
  requestId: string
): Promise<RemoteSignatureRequestPayload | null> {
  const path = `signatureRequests/${requestId}`;
  try {
    const snap = await getDoc(doc(db, 'signatureRequests', requestId));
    if (!snap.exists()) return null;
    const data = snap.data() as Omit<RemoteSignatureRequestPayload, 'id'>;
    return {
      ...data,
      id: snap.id,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function submitClientSignatureRemote(params: {
  requestId: string;
  signatureDataUrl: string;
  signerName: string;
  signedAt: string;
}): Promise<void> {
  const path = `signatureRequests/${params.requestId}`;
  try {
    await updateDoc(doc(db, 'signatureRequests', params.requestId), {
      status: 'signed',
      clientSignatureDataUrl: params.signatureDataUrl.slice(0, 60000),
      clientSignerName: params.signerName.trim().slice(0, 150),
      clientSignedAt: params.signedAt.trim().slice(0, 80),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function markSignatureRequestEmailSentRemote(params: {
  requestId: string;
  agencyCopySentAt: string;
  agencyCopyEmail: string;
}): Promise<void> {
  const path = `signatureRequests/${params.requestId}`;
  try {
    await updateDoc(doc(db, 'signatureRequests', params.requestId), {
      agencyCopySentAt: params.agencyCopySentAt.trim().slice(0, 80),
      agencyCopyEmail: params.agencyCopyEmail.trim().slice(0, 120),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export function subscribeSignatureRequests(
  uid: string,
  onData: (
    items: Array<{
      id: string;
      contractId: string;
      status: 'pending' | 'signed';
      clientSignatureDataUrl: string;
      clientSignerName: string;
      clientSignedAt: string;
      agencyCopySentAt: string;
      agencyCopyEmail: string;
    }>
  ) => void
): Unsubscribe {
  const path = 'signatureRequests';
  const q = query(collection(db, path), where('ownerId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = snapshot.docs.map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          id: d.id,
          contractId: String(data.contractId ?? ''),
          status: (data.status === 'signed' ? 'signed' : 'pending') as 'pending' | 'signed',
          clientSignatureDataUrl: String(data.clientSignatureDataUrl ?? ''),
          clientSignerName: String(data.clientSignerName ?? ''),
          clientSignedAt: String(data.clientSignedAt ?? ''),
          agencyCopySentAt: String(data.agencyCopySentAt ?? ''),
          agencyCopyEmail: String(data.agencyCopyEmail ?? ''),
        };
      });
      onData(items);
    },
    (error) => handleFirestoreError(error, OperationType.LIST, path)
  );
}


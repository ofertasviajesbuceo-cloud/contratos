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
        const data = snapshot.data() as AgencyProfile;
        onData({
          ...DEFAULT_AGENCY_PROFILE,
          ...data,
          id: snapshot.id,
          publicDomain: data.publicDomain ?? DEFAULT_AGENCY_PROFILE.publicDomain,
        });
      } else {
        onData({ ...DEFAULT_AGENCY_PROFILE, ownerId: uid });
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
      const items = snapshot.docs.map((d) => ({ ...(d.data() as Client), id: d.id }));
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
      const items = snapshot.docs.map((d) => ({ ...(d.data() as TripTemplate), id: d.id }));
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
      const items = snapshot.docs.map((d) => ({ ...(d.data() as TravelContract), id: d.id }));
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

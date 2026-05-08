import { db, auth } from './firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  doc, 
  query, 
  where,
  orderBy, 
  serverTimestamp
} from 'firebase/firestore';
import { Observation } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const STORAGE_KEY = 'ecolog_observations';
const PENDING_SYNC_KEY = 'ecolog_pending_sync';

export type SyncStatus = 'online' | 'offline' | 'syncing';
let onStatusChange: ((status: SyncStatus) => void) | null = null;
let currentStatus: SyncStatus = navigator.onLine ? 'online' : 'offline';

export const setSyncStatusListener = (callback: (status: SyncStatus) => void) => {
  onStatusChange = callback;
  callback(currentStatus);
};

const updateStatus = (status: SyncStatus) => {
  currentStatus = status;
  onStatusChange?.(status);
};

// Detect if Firebase is truly ready for operations (has config, user, and network)
const isCloudEnabled = () => {
  try {
    return !!db && !!auth && !!auth.currentUser && navigator.onLine;
  } catch {
    return false;
  }
};

export const saveObservation = async (data: Omit<Observation, 'id' | 'timestamp' | 'userId'>) => {
  const userId = auth?.currentUser?.uid || 'anonymous';
  const localTimestamp = new Date().toISOString();
  
  // Use server timestamp if online, but keep local for fallback
  const firebasePayload = {
    ...data,
    userId,
    timestamp: serverTimestamp(),
  };

  const localPayload: Omit<Observation, 'id'> = {
    ...data,
    userId,
    timestamp: localTimestamp,
  };

  if (isCloudEnabled() && userId !== 'anonymous') {
    updateStatus('syncing');
    const path = 'observations';
    try {
      const docRef = await addDoc(collection(db, path), firebasePayload);
      updateStatus('online');
      
      const savedObs: Observation = { id: docRef.id, ...localPayload };
      
      // Save a copy locally too for instant feedback/offline access
      const observations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      observations.unshift(savedObs);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(observations.slice(0, 100))); // Keep last 100
      
      return savedObs;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, path);
    }
  }

  // Save to LocalStorage and queue for sync
  const observations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const pendingSync = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  
  const id = `local_${Math.random().toString(36).substr(2, 9)}`;
  const newObs: Observation = {
    ...localPayload,
    id,
  };
  
  observations.unshift(newObs);
  pendingSync.push(newObs);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(observations.slice(0, 200)));
  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pendingSync));
  
  updateStatus('offline');
  return newObs;
};

export const syncPendingObservations = async () => {
  if (!isCloudEnabled()) {
    updateStatus(navigator.onLine ? 'online' : 'offline');
    return;
  }
  
  const pendingSync: Observation[] = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
  if (pendingSync.length === 0) {
    updateStatus('online');
    return;
  }

  updateStatus('syncing');
  console.log(`Syncing ${pendingSync.length} pending observations...`);
  
  const remaining: Observation[] = [];
  const path = 'observations';
  
  for (const obs of pendingSync) {
    try {
      const { id, timestamp, ...data } = obs;
      await addDoc(collection(db, path), {
        ...data,
        userId: auth.currentUser?.uid,
        timestamp: serverTimestamp(),
      });
    } catch (error) {
      console.error('Failed to sync observation:', obs.id, error);
      remaining.push(obs);
    }
  }

  localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(remaining));
  
  if (remaining.length === 0) {
    updateStatus('online');
    console.log('Sync complete!');
  } else {
    updateStatus('offline');
  }
};

// Listen for network changes
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncPendingObservations);
  // Initial sync attempt
  setTimeout(syncPendingObservations, 5000);
}

export const fetchObservations = async (): Promise<Observation[]> => {
  let cloudObservations: Observation[] = [];
  
  if (isCloudEnabled()) {
    const path = 'observations';
    try {
      const q = query(
        collection(db, path), 
        where('userId', '==', auth?.currentUser?.uid),
        orderBy('timestamp', 'desc')
      );
      const snapshot = await getDocs(q);
      cloudObservations = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Observation[];
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  }

  // Get local observations
  const localObservations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  
  // If cloud is enabled, we should ideally consolidate. 
  // For now, let's just make sure pending sync items are included if they aren't in the cloud yet.
  if (cloudObservations.length > 0) {
    const pendingSyncIds = new Set(JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]').map((o: any) => o.id));
    const pendingItems = localObservations.filter((o: any) => pendingSyncIds.has(o.id));
    
    // Merge and sort
    const merged = [...cloudObservations, ...pendingItems];
    return merged.sort((a: any, b: any) => {
      const getTime = (ts: any) => {
        if (!ts) return 0;
        if (ts.toDate) return ts.toDate().getTime();
        const d = new Date(ts).getTime();
        return isNaN(d) ? 0 : d;
      };
      return getTime(b.timestamp) - getTime(a.timestamp);
    });
  }

  return localObservations.sort((a: any, b: any) => {
    const getTime = (ts: any) => {
      if (!ts) return 0;
      const d = new Date(ts).getTime();
      return isNaN(d) ? 0 : d;
    };
    return getTime(b.timestamp) - getTime(a.timestamp);
  });
};

export const deleteObservation = async (id: string) => {
  if (isCloudEnabled()) {
    const path = `observations/${id}`;
    try {
      await deleteDoc(doc(db, 'observations', id));
      return;
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  }

  // Fallback
  const observations = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  const filtered = observations.filter((o: any) => o.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

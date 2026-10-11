import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { RoadHazard, UserProfile } from '../types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// The predefined master admin email as identified from system session
export const MASTER_ADMIN_EMAIL = 'azqmodel@gmail.com';

// Operation Types for Error Handling
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
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
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase status: client appears offline.');
    }
    return false;
  }
}

// Check admin status
export async function checkIsAdmin(user: User | null): Promise<boolean> {
  if (!user || !user.email) return false;
  if (user.email.toLowerCase() === MASTER_ADMIN_EMAIL.toLowerCase()) {
    // Automatically bootstrap master admin record in admins collection if needed
    try {
      const adminRef = doc(db, 'admins', user.uid);
      await setDoc(
        adminRef,
        {
          email: user.email,
          role: 'superadmin',
          createdAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch {
      // Ignored if permissions haven't propagated
    }
    return true;
  }

  try {
    const adminRef = doc(db, 'admins', user.uid);
    const snap = await getDoc(adminRef);
    return snap.exists();
  } catch {
    return false;
  }
}

// Auth Actions
export async function registerWithEmail(email: string, pass: string): Promise<User> {
  const cred = await createUserWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function loginWithGoogle(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const cred = await signInWithPopup(auth, provider);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

// Listen to Auth State
export function subscribeToAuth(callback: (userProfile: UserProfile | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      callback(null);
      return;
    }

    const isAdmin = await checkIsAdmin(firebaseUser);
    callback({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Felhasználó',
      isAdmin,
      photoURL: firebaseUser.photoURL,
    });
  });
}

// Clean sanitization for hazard payload to match schema rules
function sanitizeHazardPayload(hazard: RoadHazard, user: UserProfile | null) {
  const uid = user ? user.uid : 'local-guest';
  const uEmail = user ? user.email || '' : '';
  const nowIso = new Date().toISOString();

  return {
    id: String(hazard.id).slice(0, 128),
    timestamp: Number(hazard.timestamp) || Date.now(),
    latitude: Number(hazard.latitude),
    longitude: Number(hazard.longitude),
    heading: Number(hazard.heading) || 0,
    speed: Number(hazard.speed) || 0,
    accuracy: Number(hazard.accuracy) || 5,
    roadNumber: String(hazard.roadNumber || '').slice(0, 64),
    roadName: String(hazard.roadName || 'Ismeretlen út').slice(0, 128),
    city: String(hazard.city || '').slice(0, 128),
    postcode: String(hazard.postcode || '').slice(0, 32),
    laneCount: Number(hazard.laneCount) || 1,
    lateralPosition: hazard.lateralPosition || 'center',
    laneNumber: Number(hazard.laneNumber) || 1,
    hazardType: hazard.hazardType || 'other',
    severity: hazard.severity || 'medium',
    // Adatvédelmi szabály: a megjegyzést online feltöltéskor NEM töltjük fel!
    // A megjegyzés kizárólag offline / a saját fiókban, helyi tárolóban jelenik meg.
    notes: '',
    resolved: Boolean(hazard.resolved),
    status: hazard.status || 'active',
    verifiedByAdmin: Boolean(hazard.verifiedByAdmin),
    isPublic: hazard.isPublic ?? true,
    userId: hazard.userId || uid,
    userEmail: hazard.userEmail || uEmail,
    createdAt: hazard.createdAt || nowIso,
    updatedAt: nowIso,
  };
}

// Subscribe to Cloud Hazards
export function subscribeToCloudHazards(
  onData: (hazards: RoadHazard[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const colRef = collection(db, 'roadHazards');
  // Query all public road hazards (or user specific in security rules)
  const q = query(colRef, where('isPublic', '==', true));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: RoadHazard[] = [];
      snapshot.forEach((docSnap) => {
        const d = docSnap.data();
        list.push({
          id: docSnap.id,
          timestamp: d.timestamp,
          latitude: d.latitude,
          longitude: d.longitude,
          heading: d.heading,
          speed: d.speed,
          accuracy: d.accuracy,
          roadNumber: d.roadNumber,
          roadName: d.roadName,
          city: d.city,
          postcode: d.postcode,
          laneCount: d.laneCount,
          lateralPosition: d.lateralPosition,
          laneNumber: d.laneNumber,
          hazardType: d.hazardType,
          severity: d.severity,
          notes: d.notes,
          resolved: d.resolved,
          status: d.status,
          verifiedByAdmin: d.verifiedByAdmin,
          isOnline: true,
          isPublic: d.isPublic,
          userId: d.userId,
          userEmail: d.userEmail,
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        });
      });
      onData(list);
    },
    (err) => {
      if (onError) onError(err);
      handleFirestoreError(err, OperationType.LIST, 'roadHazards');
    }
  );
}

// Save hazard to Cloud
export async function saveHazardToCloud(
  hazard: RoadHazard,
  user: UserProfile
): Promise<RoadHazard> {
  const path = `roadHazards/${hazard.id}`;
  const payload = sanitizeHazardPayload(
    {
      ...hazard,
      userId: user.uid,
      userEmail: user.email || '',
      isPublic: true,
      verifiedByAdmin: user.isAdmin ? (hazard.verifiedByAdmin ?? true) : false,
    },
    user
  );

  try {
    const docRef = doc(db, 'roadHazards', hazard.id);
    await setDoc(docRef, payload);
    return {
      ...hazard,
      ...payload,
      isOnline: true,
    };
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
}

// Update hazard in Cloud
export async function updateHazardInCloud(
  hazardId: string,
  updates: Partial<RoadHazard>
): Promise<void> {
  const path = `roadHazards/${hazardId}`;
  try {
    const docRef = doc(db, 'roadHazards', hazardId);
    const sanitizedUpdates = { ...updates };
    // Megjegyzés nem frissülhet/kerülhet a felhőbe
    delete sanitizedUpdates.notes;
    await updateDoc(docRef, {
      ...sanitizedUpdates,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Delete hazard from Cloud
export async function deleteHazardFromCloud(hazardId: string): Promise<void> {
  const path = `roadHazards/${hazardId}`;
  try {
    const docRef = doc(db, 'roadHazards', hazardId);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
}

// Admin Action: Verify hazard
export async function verifyHazardInCloud(
  hazardId: string,
  verified: boolean
): Promise<void> {
  const path = `roadHazards/${hazardId}`;
  try {
    const docRef = doc(db, 'roadHazards', hazardId);
    await updateDoc(docRef, {
      verifiedByAdmin: verified,
      status: verified ? 'verified' : 'active',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

// Resolve hazard
export async function resolveHazardInCloud(
  hazardId: string,
  resolved: boolean
): Promise<void> {
  const path = `roadHazards/${hazardId}`;
  try {
    const docRef = doc(db, 'roadHazards', hazardId);
    await updateDoc(docRef, {
      resolved,
      status: resolved ? 'resolved' : 'active',
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    handleFirestoreError(err, OperationType.UPDATE, path);
  }
}

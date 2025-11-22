
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { RegulationEntry } from '../types';
import { INITIAL_REGULATIONS } from '../constants';

let db: any = null;
let isInitialized = false;

const initDB = () => {
  if (isInitialized) return db;
  
  // Priority 1: Env Var (Deployment), Priority 2: LocalStorage (User Settings)
  let configStr = process.env.firebase_config;
  if (!configStr) {
      configStr = localStorage.getItem('firebase_settings') || undefined;
  }
  
  if (configStr) {
    try {
      // Handle potential extra quotes if env var is passed as string literal
      const cleanConfig = configStr.replace(/^['"]|['"]$/g, '');
      const config = JSON.parse(cleanConfig);
      const app = initializeApp(config);
      db = getFirestore(app);
      isInitialized = true;
      console.log("🔥 Firebase Firestore Initialized");
    } catch (e) {
      console.error("Failed to initialize Firebase from config", e);
      // If local storage config is bad, maybe clear it?
      // localStorage.removeItem('firebase_settings'); 
    }
  } else {
    console.log("No Firebase config found. Using local storage/memory.");
  }
  return db;
};

export const getAllRegulations = async (): Promise<RegulationEntry[]> => {
  const database = initDB();
  
  if (!database) {
    // Fallback: Check LocalStorage or return Constants
    const localData = localStorage.getItem('local_regulations');
    if (localData) {
        return JSON.parse(localData);
    }
    return [...INITIAL_REGULATIONS];
  }

  try {
    const regsCol = collection(database, 'regulations');
    const snapshot = await getDocs(regsCol);
    
    if (snapshot.empty) {
         console.log("Database empty, returning initial set.");
         return [...INITIAL_REGULATIONS];
    }
    
    const regs = snapshot.docs.map(doc => doc.data() as RegulationEntry);
    // Sort by date desc
    return regs.sort((a, b) => b.date.localeCompare(a.date));
  } catch (e) {
    console.error("Error fetching from DB, falling back to local", e);
    return [...INITIAL_REGULATIONS];
  }
};

export const saveRegulation = async (entry: RegulationEntry) => {
  const database = initDB();
  
  // Always save to local storage as backup/cache
  updateLocalStorage(entry);

  if (!database) return;
  
  try {
    await setDoc(doc(database, 'regulations', entry.id), entry);
    console.log(`Entry ${entry.id} saved to Cloud Firestore`);
  } catch (e) {
    console.error("Error saving to DB", e);
  }
};

export const updateRegulationInDb = async (entry: RegulationEntry) => {
    const database = initDB();
    
    // Update local storage
    updateLocalStorage(entry);

    if (!database) return;
    
    try {
        // setDoc with merge: true acts as update or create
        const ref = doc(database, 'regulations', entry.id);
        await setDoc(ref, entry, { merge: true });
        console.log(`Entry ${entry.id} updated in Cloud Firestore`);
    } catch (e) {
        console.error("Error updating DB", e);
    }
}

// Helper to keep local storage in sync for non-cloud users or offline fallback
const updateLocalStorage = (entry: RegulationEntry) => {
    try {
        const currentStr = localStorage.getItem('local_regulations');
        let current: RegulationEntry[] = currentStr ? JSON.parse(currentStr) : [...INITIAL_REGULATIONS];
        
        const index = current.findIndex(e => e.id === entry.id);
        if (index >= 0) {
            current[index] = entry;
        } else {
            current = [entry, ...current];
        }
        
        localStorage.setItem('local_regulations', JSON.stringify(current));
    } catch (e) {
        console.error("Local storage sync failed", e);
    }
}

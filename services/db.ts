
import { openDB } from 'idb';
import { Sheet, Project } from '../types';

const DB_NAME = 'ai_smartsheets_db';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_SHEETS = 'sheets';

const SHEETS_KEY = 'ai_smartsheets_data'; // Legacy or standalone
const PROJECTS_KEY = 'ai_smartsheets_projects'; // Legacy key for migration
const PROJECT_DATA_PREFIX = 'ai_smartsheets_p_';

// Initialize Database
const dbPromise = openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
      db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
    }
    if (!db.objectStoreNames.contains(STORE_SHEETS)) {
      db.createObjectStore(STORE_SHEETS);
    }
  },
});

// --- Projects ---

export const loadProjects = async (): Promise<Project[]> => {
    try {
        const db = await dbPromise;
        let projects = await db.getAll(STORE_PROJECTS);

        // Migration Check: If DB is empty, try to load from LocalStorage
        if (projects.length === 0) {
            const lsProjects = localStorage.getItem(PROJECTS_KEY);
            if (lsProjects) {
                try {
                    projects = JSON.parse(lsProjects);
                    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
                    for (const p of projects) {
                        await tx.store.put(p);
                    }
                    await tx.done;
                    console.log("Migrated projects from LocalStorage to IndexedDB");
                    localStorage.removeItem(PROJECTS_KEY); // Clear legacy data
                } catch (e) {
                    console.error("Migration failed", e);
                }
            }
        }
        return projects;
    } catch (e) {
        console.error("Load Projects Error", e);
        return [];
    }
};

export const saveProject = async (project: Project) => {
    try {
        const db = await dbPromise;
        await db.put(STORE_PROJECTS, project);
    } catch (e) {
        console.error("Save Project Error", e);
    }
};

export const deleteProject = async (id: string) => {
    try {
        const db = await dbPromise;
        const tx = db.transaction([STORE_PROJECTS, STORE_SHEETS], 'readwrite');
        await tx.objectStore(STORE_PROJECTS).delete(id);
        await tx.objectStore(STORE_SHEETS).delete(PROJECT_DATA_PREFIX + id);
        await tx.done;
    } catch (e) {
        console.error("Delete Project Error", e);
    }
};

export const toggleProjectStar = async (id: string) => {
    try {
        const db = await dbPromise;
        const project = await db.get(STORE_PROJECTS, id);
        if (project) {
            project.isStarred = !project.isStarred;
            await db.put(STORE_PROJECTS, project);
        }
    } catch (e) {
        console.error("Toggle Star Error", e);
    }
};

// --- Sheets ---

export const loadSheets = async (projectId?: string): Promise<Sheet[]> => {
    const key = projectId ? (PROJECT_DATA_PREFIX + projectId) : SHEETS_KEY;
    try {
        const db = await dbPromise;
        let data = await db.get(STORE_SHEETS, key);
        
        // Migration Check
        if (!data) {
             const lsData = localStorage.getItem(key);
             if (lsData) {
                 try {
                     data = JSON.parse(lsData);
                     if (data) {
                         await db.put(STORE_SHEETS, data, key);
                         console.log(`Migrated sheets for ${key} from LocalStorage`);
                         localStorage.removeItem(key); // Clear legacy data to free space
                     }
                 } catch (e) {
                     console.error("Sheet migration failed", e);
                 }
             }
        }

        if (!data) return [];
        
        return data.map((sheet: any) => ({
            ...sheet,
            selectedRowIds: new Set(sheet.selectedRowIds || [])
        })) as Sheet[];
    } catch (e) {
        console.error("Load Sheets Error", e);
        return [];
    }
};

export const saveSheets = async (sheets: Sheet[]) => {
    try {
        const serialized = sheets.map(s => ({
            ...s,
            selectedRowIds: Array.from(s.selectedRowIds || [])
        }));
        
        const db = await dbPromise;
        await db.put(STORE_SHEETS, serialized, SHEETS_KEY);
    } catch (e) {
        console.error("Save Sheets Error", e);
    }
};

export const syncProjectSheets = async (projectId: string, sheets: Sheet[]) => {
    try {
        const serialized = sheets.map(s => ({
            ...s,
            selectedRowIds: Array.from(s.selectedRowIds || [])
        }));
        
        const db = await dbPromise;
        const tx = db.transaction([STORE_SHEETS, STORE_PROJECTS], 'readwrite');
        
        await tx.objectStore(STORE_SHEETS).put(serialized, PROJECT_DATA_PREFIX + projectId);
        
        // Update project timestamp
        const project = await tx.objectStore(STORE_PROJECTS).get(projectId);
        if (project) {
            project.updatedAt = Date.now();
            await tx.objectStore(STORE_PROJECTS).put(project);
        }
        
        await tx.done;
    } catch (e) {
        console.error("Sync Sheets Error", e);
    }
};

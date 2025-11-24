
import { Sheet, Project } from '../types';

const PROJECTS_KEY = 'ai_smartsheets_projects';
const LEGACY_KEY = 'ai_smartsheets_data';

// --- Project Management ---

export const loadProjects = async (): Promise<Project[]> => {
    try {
        const data = localStorage.getItem(PROJECTS_KEY);
        let projects: Project[] = data ? JSON.parse(data) : [];

        // Migration: If we have legacy data but no projects, create a default project
        const legacyData = localStorage.getItem(LEGACY_KEY);
        if (legacyData && projects.length === 0) {
            const defaultProject: Project = {
                id: 'default-project',
                name: '未命名文件',
                updatedAt: Date.now(),
                createdAt: Date.now(),
                owner: 'Me',
                description: 'Migrated from previous version'
            };
            projects.push(defaultProject);
            localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
            
            // Move data to new key format
            localStorage.setItem(`project_${defaultProject.id}_sheets`, legacyData);
            // Optional: localStorage.removeItem(LEGACY_KEY); 
        }
        
        // Ensure createdAt exists for all loaded projects (migration)
        return projects.map(p => ({
            ...p,
            createdAt: p.createdAt || p.updatedAt || Date.now()
        })).sort((a, b) => b.updatedAt - a.updatedAt);

    } catch (e) {
        console.error("Load Projects Error", e);
        return [];
    }
};

export const saveProject = async (project: Project) => {
    const projects = await loadProjects();
    const index = projects.findIndex(p => p.id === project.id);
    
    // Ensure createdAt is set
    const projectToSave: Project = {
        ...project,
        createdAt: project.createdAt || Date.now()
    };

    if (index >= 0) {
        projects[index] = { ...projectToSave, updatedAt: Date.now() };
    } else {
        projects.unshift({ ...projectToSave, updatedAt: Date.now() });
    }
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
};

export const toggleProjectStar = async (id: string) => {
    const projects = await loadProjects();
    const index = projects.findIndex(p => p.id === id);
    if (index >= 0) {
        projects[index].isStarred = !projects[index].isStarred;
        localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
};

export const deleteProject = async (projectId: string) => {
    const projects = await loadProjects();
    const newProjects = projects.filter(p => p.id !== projectId);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(newProjects));
    localStorage.removeItem(`project_${projectId}_sheets`);
};

// --- Sheet Management (Scoped by Project) ---

export const loadProjectSheets = async (projectId: string): Promise<Sheet[]> => {
    try {
        const key = `project_${projectId}_sheets`;
        const data = localStorage.getItem(key);
        if (!data) return [];
        
        const parsed = JSON.parse(data);
        return parsed.map((sheet: any) => ({
            ...sheet,
            selectedRowIds: new Set(sheet.selectedRowIds || [])
        })) as Sheet[];
    } catch (e) {
        console.error("Load Sheets Error", e);
        return [];
    }
};

export const syncProjectSheets = async (projectId: string, sheets: Sheet[]) => {
    try {
        const key = `project_${projectId}_sheets`;
        const serialized = JSON.stringify(sheets.map(s => ({
            ...s,
            selectedRowIds: Array.from(s.selectedRowIds)
        })));
        localStorage.setItem(key, serialized);
        
        // Update project timestamp
        const projects = await loadProjects();
        const project = projects.find(p => p.id === projectId);
        if (project) {
            saveProject(project);
        }
    } catch (e) {
        console.error("Sync Sheets Error", e);
    }
};

import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Worksheet from '../components/worksheet/Worksheet';
import { loadProjects, loadSheets, syncProjectSheets } from '../services/db';
import { Project, Sheet } from '../types';
import { message, Spin } from 'antd';

const ProjectEditor: React.FC = () => {
    const { projectId } = useParams<{ projectId: string }>();
    const navigate = useNavigate();
    const [project, setProject] = useState<Project | null>(null);
    const [sheets, setSheets] = useState<Sheet[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!projectId) return;
        const fetchData = async () => {
             const projects = await loadProjects();
             const p = projects.find(px => px.id === projectId);
             
             if (p) {
                 setProject(p);
                 const loadedSheets = await loadSheets(projectId);
                 setSheets(loadedSheets);
             } else {
                 message.error('项目不存在');
                 navigate('/');
             }
             setLoading(false);
        };
        fetchData();
    }, [projectId, navigate]);

    if (loading || !project) return <div className="h-screen flex items-center justify-center bg-slate-50"><Spin size="large" /></div>;

    return (
        <Worksheet 
            title={project.name}
            initialSheets={sheets}
            onSave={(newSheets) => syncProjectSheets(project.id, newSheets)}
        />
    );
};
export default ProjectEditor;

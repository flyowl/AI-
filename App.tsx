
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';
import Home from './pages/Home';
import Team from './pages/Team';
import Market from './pages/Market';
import ProjectEditor from './pages/ProjectEditor';
import Login from './pages/Login';
import Settings from './pages/Settings';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { FileText, Users, Star, Grid } from 'lucide-react';

const App: React.FC = () => {
  return (
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#2563eb',
          borderRadius: 6,
          fontFamily: "'Inter', sans-serif",
        },
      }}
    >
        <HashRouter>
            <Routes>
                {/* Auth Routes */}
                <Route path="/login" element={<Login />} />

                {/* Editor Routes (Fullscreen) */}
                <Route path="/project/:projectId" element={<ProjectEditor />} />
                
                {/* Dashboard Routes (Layout) */}
                <Route path="/" element={<DashboardLayout />}>
                    <Route index element={<Home />} />
                    <Route path="files" element={<Home />} />
                    <Route path="shared" element={<Home />} />
                    <Route path="starred" element={<Home />} />
                    <Route path="space" element={<Home />} />
                    
                    <Route path="team" element={<Team />} />
                    <Route path="projects" element={<Home />} />
                    <Route path="market" element={<Market />} />
                    <Route path="settings" element={<Settings />} />
                </Route>
            </Routes>
        </HashRouter>
    </ConfigProvider>
  );
};

export default App;

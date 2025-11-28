
import React, { useEffect, useState } from 'react';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import Worksheet from './components/worksheet/Worksheet';
import { Sheet } from './types';
import { saveSheets, loadSheets } from './services/db';

const App: React.FC = () => {
  const [sheets, setSheets] = useState<Sheet[] | null>(null);

  useEffect(() => {
    const init = async () => {
      const loaded = await loadSheets();
      setSheets(loaded);
    };
    init();
  }, []);

  const handleSave = (newSheets: Sheet[]) => {
      saveSheets(newSheets);
  };

  if (sheets === null) {
      return (
          <div className="h-screen w-full flex items-center justify-center bg-slate-50">
              <Spin size="large" />
          </div>
      )
  }

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
        <Worksheet 
            title="多维表格"
            initialSheets={sheets}
            onSave={handleSave}
        />
    </ConfigProvider>
  );
};

export default App;

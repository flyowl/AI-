

import React, { useState, useEffect } from 'react';
import { Modal, Tabs, Switch } from 'antd';
import { Sheet, AppPermissions, RoleDef } from '../types';
import { Shield, Eye, EyeOff, Table2, Pencil, Lock } from 'lucide-react';

interface PermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  sheets: Sheet[];
  permissions: AppPermissions;
  onSave: (perms: AppPermissions) => void;
  roles: RoleDef[];
}

const PermissionModal: React.FC<PermissionModalProps> = ({ isOpen, onClose, sheets, permissions, onSave, roles }) => {
  const [localPerms, setLocalPerms] = useState<AppPermissions>(permissions);
  
  // Filter out Admin as they usually have all permissions implicit
  const configurableRoles = roles.filter(r => r.id !== 'Admin');

  useEffect(() => {
    if (isOpen) {
        // Ensure localPerms has keys for all roles
        const initializedPerms = { ...permissions };
        roles.forEach(role => {
            if (!initializedPerms[role.id]) {
                initializedPerms[role.id] = { sheetVisibility: {}, columnVisibility: {}, columnReadonly: {} };
            }
        });
        setLocalPerms(JSON.parse(JSON.stringify(initializedPerms)));
    }
  }, [isOpen, permissions, roles]);

  const handleSave = () => {
      onSave(localPerms);
      onClose();
  };

  const toggleSheet = (roleId: string, sheetId: string, visible: boolean) => {
      setLocalPerms(prev => ({
          ...prev,
          [roleId]: {
              ...prev[roleId],
              sheetVisibility: { ...prev[roleId].sheetVisibility, [sheetId]: visible }
          }
      }));
  };

  const toggleColumn = (roleId: string, colId: string, visible: boolean) => {
      setLocalPerms(prev => ({
          ...prev,
          [roleId]: {
              ...prev[roleId],
              columnVisibility: { ...prev[roleId].columnVisibility, [colId]: visible }
          }
      }));
  };

  const toggleColumnReadonly = (roleId: string, colId: string, readonly: boolean) => {
      setLocalPerms(prev => ({
          ...prev,
          [roleId]: {
              ...prev[roleId],
              columnReadonly: { ...prev[roleId].columnReadonly, [colId]: readonly }
          }
      }));
  };

  const renderRoleConfig = (role: RoleDef) => {
      const validSheets = sheets.filter(s => s.type === 'sheet');
      
      // Default permissiveness checks
      const canEditDataGlobally = role.capabilities.canEditData;

      return (
          <div className="h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              <div className="text-xs text-slate-500 mb-3 bg-blue-50 p-2 rounded border border-blue-100 flex gap-2 items-start">
                  <Shield size={14} className="mt-0.5 text-blue-500 shrink-0"/>
                  <div>
                      配置 <span className="font-semibold">{role.name}</span> 的可见性与字段级权限。
                      {!canEditDataGlobally && <div className="mt-1 text-orange-600">注意：此角色全局“编辑数据”能力已关闭，所有字段默认为只读。</div>}
                  </div>
              </div>

              {validSheets.length === 0 ? (
                  <div className="text-center text-slate-400 py-8">暂无数据表</div>
              ) : (
                  <div className="space-y-3">
                      {validSheets.map(sheet => {
                          const rolePerms = localPerms[role.id] || { sheetVisibility: {}, columnVisibility: {}, columnReadonly: {} };
                          const isSheetVisible = rolePerms.sheetVisibility[sheet.id] !== false;
                          
                          return (
                              <div key={sheet.id} className="border border-slate-200 rounded-lg overflow-hidden">
                                  <div className="flex items-center justify-between p-3 bg-slate-50 border-b border-slate-100">
                                      <div className="flex items-center gap-2 font-medium text-slate-700">
                                          <Table2 size={16} className="text-slate-400"/>
                                          {sheet.name}
                                      </div>
                                      <Switch 
                                          size="small" 
                                          checked={isSheetVisible}
                                          onChange={(checked) => toggleSheet(role.id, sheet.id, checked)}
                                          checkedChildren={<Eye size={12}/>}
                                          unCheckedChildren={<EyeOff size={12}/>}
                                      />
                                  </div>
                                  
                                  {isSheetVisible && (
                                      <div className="bg-white">
                                          <div className="grid grid-cols-12 gap-4 px-3 py-2 bg-slate-50/50 text-[10px] text-slate-400 font-medium uppercase tracking-wider border-b border-slate-50">
                                              <div className="col-span-6">列名</div>
                                              <div className="col-span-3 text-center">可见性</div>
                                              <div className="col-span-3 text-center">{canEditDataGlobally ? '允许编辑' : ''}</div>
                                          </div>
                                          {sheet.columns.map(col => {
                                              const isColVisible = rolePerms.columnVisibility[col.id] !== false;
                                              const isColReadonly = rolePerms.columnReadonly?.[col.id] === true;
                                              
                                              return (
                                                  <div key={col.id} className="grid grid-cols-12 gap-4 px-3 py-2 items-center border-b border-slate-50 last:border-0 hover:bg-slate-50/50">
                                                      <div className="col-span-6 text-sm text-slate-600 truncate" title={col.label}>
                                                          {col.label}
                                                      </div>
                                                      <div className="col-span-3 flex justify-center">
                                                          <Switch 
                                                              size="small"
                                                              checked={isColVisible}
                                                              onChange={(checked) => toggleColumn(role.id, col.id, checked)}
                                                          />
                                                      </div>
                                                      <div className="col-span-3 flex justify-center">
                                                          {canEditDataGlobally && (
                                                              <Switch 
                                                                  size="small"
                                                                  checked={!isColReadonly}
                                                                  disabled={!isColVisible}
                                                                  onChange={(checked) => toggleColumnReadonly(role.id, col.id, !checked)}
                                                                  checkedChildren={<Pencil size={10}/>}
                                                                  unCheckedChildren={<Lock size={10}/>}
                                                                  className={isColReadonly ? 'bg-slate-300' : 'bg-green-500'}
                                                              />
                                                          )}
                                                      </div>
                                                  </div>
                                              )
                                          })}
                                      </div>
                                  )}
                                  {!isSheetVisible && (
                                      <div className="p-3 bg-slate-50 text-xs text-slate-400 text-center italic">
                                          该表对此角色不可见
                                      </div>
                                  )}
                              </div>
                          )
                      })}
                  </div>
              )}
          </div>
      )
  };

  return (
    <Modal
        title="字段与表格权限配置"
        open={isOpen}
        onOk={handleSave}
        onCancel={onClose}
        width={650}
        okText="保存配置"
        cancelText="取消"
        centered
    >
        <Tabs 
            defaultActiveKey={configurableRoles[0]?.id || 'Editor'}
            items={configurableRoles.map(role => ({
                key: role.id,
                label: role.name,
                children: renderRoleConfig(role)
            }))}
        />
    </Modal>
  );
};

export default PermissionModal;
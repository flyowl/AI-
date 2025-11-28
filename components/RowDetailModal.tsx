

import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Rate, InputNumber, Switch } from 'antd';
import { Column, RowData, Sheet } from '../types';
import dayjs from 'dayjs';

interface RowDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rowId: string, updates: Record<string, any>) => void;
  columns: Column[];
  rowData: RowData | null;
  allSheets: Sheet[];
}

const RowDetailModal: React.FC<RowDetailModalProps> = ({ isOpen, onClose, onSave, columns, rowData, allSheets }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen && rowData) {
      const formValues: Record<string, any> = {};
      columns.forEach(col => {
        const val = rowData[col.id];
        if (col.type === 'date' && val) {
          formValues[col.id] = dayjs(val);
        } else if ((col.type === 'multiSelect' || col.type === 'relation') && val !== undefined && val !== null) {
            // Ensure array for multiple mode select
            formValues[col.id] = Array.isArray(val) ? val : [val];
        } else {
          formValues[col.id] = val;
        }
      });
      form.setFieldsValue(formValues);
    } else {
      form.resetFields();
    }
  }, [isOpen, rowData, columns, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
      if (!rowData) return;

      const updates: Record<string, any> = {};
      columns.forEach(col => {
        let val = values[col.id];
        if (col.type === 'date' && val) {
          val = val.format('YYYY-MM-DD');
        }
        updates[col.id] = val;
      });
      
      onSave(rowData.id, updates);
      onClose();
    });
  };

  const renderFormItem = (col: Column) => {
    switch (col.type) {
      case 'text':
      case 'url':
      case 'email':
      case 'phone':
      case 'location':
      case 'person': 
        return <Input />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} />;
      
      case 'select':
      case 'multiSelect':
        return (
          <Select
            mode={col.type === 'multiSelect' ? 'multiple' : undefined}
            className="w-full"
            placeholder="请选择"
            options={col.options?.map(opt => ({
                value: opt.label,
                label: (
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${opt.color || 'bg-slate-100 text-slate-700'}`}>
                        {opt.label}
                    </span>
                )
            }))}
            tagRender={col.type === 'multiSelect' ? (props) => {
                 const opt = col.options?.find(o => o.label === props.value);
                 const { closable, onClose, value } = props;
                 const colorClass = opt?.color || 'bg-slate-100 text-slate-700';
                 return (
                     <span className={`mr-1 px-1.5 py-0.5 rounded text-[10px] font-medium border border-transparent inline-flex items-center gap-1 my-0.5 ${colorClass}`}>
                         {value}
                         {closable && <span onClick={onClose} className="cursor-pointer opacity-60 hover:opacity-100 ml-1">×</span>}
                     </span>
                 )
            } : undefined}
          />
        );
        
      case 'relation':
          // Relation Logic: Find target sheet and render multi-select of its rows
          const targetSheetId = col.relationConfig?.targetSheetId;
          const targetSheet = allSheets.find(s => s.id === targetSheetId);
          
          if (!targetSheet) {
              return <span className="text-xs text-red-400">关联表失效或已被删除</span>;
          }

          const displayCol = targetSheet.columns.find(c => c.type === 'text') || targetSheet.columns[0];
          const options = targetSheet.rows.map(r => ({
              label: String(r[displayCol.id] || '未命名'),
              value: r.id
          }));

          return (
              <Select
                  mode="multiple"
                  placeholder="选择关联数据..."
                  options={options}
                  showSearch
                  optionFilterProp="label"
                  style={{ width: '100%' }}
              />
          );

      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      case 'checkbox':
        return <Checkbox>已选中</Checkbox>;
      case 'switch':
        return <Switch checkedChildren="开启" unCheckedChildren="关闭" />;
      case 'rating':
        return <Rate />;
      case 'image':
        return <Input placeholder="输入图片 URL" />;
      default:
        return <Input />;
    }
  };

  return (
    <Modal
      title="行详情"
      open={isOpen}
      onOk={handleOk}
      onCancel={onClose}
      width={600}
      centered
    >
      <Form form={form} layout="vertical" className="py-4 max-h-[60vh] overflow-y-auto pr-2">
        {columns.map(col => (
          <React.Fragment key={col.id}>
              <Form.Item 
                name={col.id} 
                label={col.label} 
                valuePropName={(col.type === 'checkbox' || col.type === 'switch') ? 'checked' : 'value'}
              >
                {renderFormItem(col)}
              </Form.Item>
          </React.Fragment>
        ))}
      </Form>
    </Modal>
  );
};

export default RowDetailModal;
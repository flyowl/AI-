
import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Checkbox, Rate, InputNumber } from 'antd';
import { Column, RowData } from '../types';
import dayjs from 'dayjs';

interface RowDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (rowId: string, updates: Record<string, any>) => void;
  columns: Column[];
  rowData: RowData | null;
}

const RowDetailModal: React.FC<RowDetailModalProps> = ({ isOpen, onClose, onSave, columns, rowData }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (isOpen && rowData) {
      const formValues: Record<string, any> = {};
      columns.forEach(col => {
        const val = rowData[col.id];
        if (col.type === 'date' && val) {
          formValues[col.id] = dayjs(val);
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
      case 'person': // Treat person as text for simple editing for now
        return <Input />;
      case 'number':
        return <InputNumber style={{ width: '100%' }} />;
      case 'select':
        return (
          <Select>
            {col.options?.map(opt => (
              <Select.Option key={opt.id} value={opt.label}>
                <div className="flex items-center gap-2">
                   <div className={`w-3 h-3 rounded-full ${opt.color.split(' ')[0]}`}></div>
                   {opt.label}
                </div>
              </Select.Option>
            ))}
          </Select>
        );
      case 'date':
        return <DatePicker style={{ width: '100%' }} />;
      case 'checkbox':
        return <Checkbox>已选中</Checkbox>;
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
          <Form.Item 
            key={col.id} 
            name={col.id} 
            label={col.label} 
            valuePropName={col.type === 'checkbox' ? 'checked' : 'value'}
          >
            {renderFormItem(col)}
          </Form.Item>
        ))}
      </Form>
    </Modal>
  );
};

export default RowDetailModal;

import React, { useEffect, useState } from 'react';
import { ColumnType, SelectOption, Column } from '../types';
import { Modal, Form, Input, Select, Button } from 'antd';
import { 
    Type, Hash, List, Calendar, CheckSquare, 
    Link as LinkIcon, Star, Trash2, Plus,
    Image as ImageIcon, FileText, User, Phone, Mail, MapPin
} from 'lucide-react';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, type: ColumnType, options?: SelectOption[]) => void;
  initialData?: Column | null;
}

const COLUMN_GROUPS = [
    {
        title: '基础',
        items: [
            { type: 'text' as ColumnType, label: '文本', icon: <Type size={16} /> },
            { type: 'select' as ColumnType, label: '选项', icon: <List size={16} /> },
            { type: 'number' as ColumnType, label: '数字', icon: <Hash size={16} /> },
            { type: 'date' as ColumnType, label: '日期', icon: <Calendar size={16} /> },
            { type: 'checkbox' as ColumnType, label: '复选框', icon: <CheckSquare size={16} /> },
        ]
    },
    {
        title: '媒体与文件',
        items: [
            { type: 'image' as ColumnType, label: '图片', icon: <ImageIcon size={16} /> },
            { type: 'file' as ColumnType, label: '文件', icon: <FileText size={16} /> },
        ]
    },
    {
        title: '人员与信息',
        items: [
            { type: 'person' as ColumnType, label: '人员', icon: <User size={16} /> },
            { type: 'phone' as ColumnType, label: '电话', icon: <Phone size={16} /> },
            { type: 'email' as ColumnType, label: '邮箱', icon: <Mail size={16} /> },
            { type: 'url' as ColumnType, label: '链接', icon: <LinkIcon size={16} /> },
            { type: 'location' as ColumnType, label: '地理位置', icon: <MapPin size={16} /> },
        ]
    },
    {
        title: '其它',
        items: [
            { type: 'rating' as ColumnType, label: '评分', icon: <Star size={16} /> },
        ]
    }
];

const COLORS = [
  { bg: 'bg-slate-100', text: 'text-slate-700', label: '灰色' },
  { bg: 'bg-red-100', text: 'text-red-700', label: '红色' },
  { bg: 'bg-orange-100', text: 'text-orange-700', label: '橙色' },
  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '黄色' },
  { bg: 'bg-green-100', text: 'text-green-700', label: '绿色' },
  { bg: 'bg-blue-100', text: 'text-blue-700', label: '蓝色' },
  { bg: 'bg-purple-100', text: 'text-purple-700', label: '紫色' },
  { bg: 'bg-pink-100', text: 'text-pink-700', label: '粉色' },
];

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onSave, initialData }) => {
  const [form] = Form.useForm();
  const [type, setType] = useState<ColumnType>('text');
  
  // Local state for managing select options before save
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState(COLORS[0]);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.setFieldsValue({
            label: initialData.label,
            type: initialData.type
        });
        setType(initialData.type);
        setOptions(initialData.options || []);
      } else {
        form.resetFields();
        setType('text');
        setOptions([]);
        setNewOptionLabel('');
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
        onSave(values.label, type, type === 'select' ? options : undefined);
        onClose();
    });
  };

  const addOption = () => {
    if (!newOptionLabel.trim()) return;
    const newOption: SelectOption = {
      id: crypto.randomUUID(),
      label: newOptionLabel,
      color: `${newOptionColor.bg} ${newOptionColor.text}`,
    };
    setOptions([...options, newOption]);
    setNewOptionLabel('');
  };

  const removeOption = (id: string) => {
    setOptions(options.filter(o => o.id !== id));
  };

  return (
    <Modal
        open={isOpen}
        title={initialData ? '编辑列' : '添加新列'}
        onCancel={onClose}
        onOk={handleOk}
        width={600}
        okText={initialData ? '保存' : '创建'}
        cancelText="取消"
        centered
    >
      <Form form={form} layout="vertical" className="pt-4">
        <Form.Item 
            name="label" 
            label="列名" 
            rules={[{ required: true, message: '请输入列名' }]}
        >
            <Input placeholder="例如：状态，截止日期" />
        </Form.Item>

        <div className="mb-6">
            <div className="text-sm text-slate-700 mb-2">列类型</div>
            <div className="border border-slate-200 rounded-lg p-3 max-h-[320px] overflow-y-auto bg-slate-50/50">
                {COLUMN_GROUPS.map((group, gIdx) => (
                    <div key={gIdx} className="mb-3 last:mb-0">
                        <div className="text-xs font-semibold text-slate-400 uppercase mb-2 px-1">{group.title}</div>
                        <div className="grid grid-cols-3 gap-2">
                            {group.items.map(t => (
                                <div 
                                    key={t.type}
                                    onClick={() => setType(t.type)}
                                    className={`cursor-pointer border rounded-lg p-2 flex items-center gap-2 transition-all hover:shadow-sm ${type === t.type ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm ring-1 ring-blue-200' : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'}`}
                                >
                                    <div className={`p-1.5 rounded-md ${type === t.type ? 'bg-blue-100' : 'bg-slate-100'}`}>
                                        {t.icon}
                                    </div>
                                    <span className="text-xs font-medium">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Select Options Editor */}
        {type === 'select' && (
             <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">下拉选项配置</h4>
                
                <div className="space-y-2 mb-3 max-h-[150px] overflow-y-auto pr-1">
                    {options.map(opt => (
                         <div key={opt.id} className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                            <div className={`w-4 h-4 rounded-full shadow-sm ${opt.color.split(' ')[0]}`}></div>
                            <span className="flex-1 text-sm">{opt.label}</span>
                            <Button 
                                type="text" 
                                danger 
                                size="small" 
                                icon={<Trash2 size={14} />} 
                                onClick={() => removeOption(opt.id)}
                            />
                         </div>
                    ))}
                    {options.length === 0 && <div className="text-xs text-slate-400 text-center py-4 bg-slate-50 rounded border border-dashed border-slate-200">暂无选项，请在下方添加</div>}
                </div>

                <div className="flex gap-2 items-start pt-2 border-t border-slate-100">
                    <DropdownMenuColorPicker 
                        selected={newOptionColor} 
                        onChange={setNewOptionColor} 
                    />
                    <Input 
                        placeholder="输入选项名称并回车" 
                        value={newOptionLabel} 
                        onChange={(e) => setNewOptionLabel(e.target.value)}
                        onPressEnter={(e) => { e.preventDefault(); addOption(); }}
                        className="flex-1"
                        suffix={
                            <Button type="text" size="small" icon={<Plus size={14} />} onClick={addOption} />
                        }
                    />
                </div>
             </div>
        )}
      </Form>
    </Modal>
  );
};

// Helper component for color selection
const DropdownMenuColorPicker: React.FC<{ selected: any, onChange: (c: any) => void }> = ({ selected, onChange }) => {
    return (
        <Select
            value={selected.label}
            style={{ width: 90 }}
            dropdownMatchSelectWidth={false}
            variant="outlined"
            optionLabelProp="label"
            labelRender={() => (
                 <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selected.bg.replace('100', '400')}`} />
                    <span className="text-xs text-slate-600">{selected.label}</span>
                 </div>
            )}
            onChange={(_, option: any) => onChange(option.data)}
        >
            {COLORS.map((c, i) => (
                <Select.Option key={i} value={c.label} label={c.label} data={c}>
                     <div className="flex items-center gap-2 py-0.5">
                        <div className={`w-4 h-4 rounded-full ${c.bg}`} />
                        <span className="text-xs text-slate-600">{c.label}</span>
                     </div>
                </Select.Option>
            ))}
        </Select>
    )
}

export default AddColumnModal;
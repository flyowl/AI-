
import React, { useEffect, useState } from 'react';
import { ColumnType, SelectOption, Column, Sheet, RelationConfig } from '../types';
import { Modal, Form, Input, Select, Button, Radio, Switch, InputNumber, DatePicker } from 'antd';
import { 
    Type, Hash, List, Calendar, CheckSquare, 
    Link as LinkIcon, Star, Trash2, Plus,
    Image as ImageIcon, FileText, User, Phone, Mail, MapPin,
    ArrowLeftRight, Tags, ToggleLeft
} from 'lucide-react';
import dayjs from 'dayjs';

interface AddColumnModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string, type: ColumnType, options?: SelectOption[], relationConfig?: RelationConfig, defaultValue?: any) => void;
  initialData?: Column | null;
  allSheets: Sheet[]; // Needed to select target for relation
  currentSheetId: string;
}

const COLUMN_GROUPS = [
    {
        title: '基础',
        items: [
            { type: 'text' as ColumnType, label: '文本', icon: <Type size={16} /> },
            { type: 'select' as ColumnType, label: '单选', icon: <List size={16} /> },
            { type: 'multiSelect' as ColumnType, label: '多选', icon: <Tags size={16} /> },
            { type: 'number' as ColumnType, label: '数字', icon: <Hash size={16} /> },
            { type: 'date' as ColumnType, label: '日期', icon: <Calendar size={16} /> },
            { type: 'checkbox' as ColumnType, label: '复选框', icon: <CheckSquare size={16} /> },
            { type: 'switch' as ColumnType, label: '开关', icon: <ToggleLeft size={16} /> },
        ]
    },
    {
        title: '高级',
        items: [
            { type: 'relation' as ColumnType, label: '关联 (多表)', icon: <ArrowLeftRight size={16} /> },
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

const AddColumnModal: React.FC<AddColumnModalProps> = ({ isOpen, onClose, onSave, initialData, allSheets, currentSheetId }) => {
  const [form] = Form.useForm();
  const [type, setType] = useState<ColumnType>('text');
  
  // Local state for managing select options before save
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionColor, setNewOptionColor] = useState(COLORS[0]);

  // Relation State
  const [bidirectional, setBidirectional] = useState(true);

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        let defVal = initialData.defaultValue;
        if (initialData.type === 'date' && defVal) {
             defVal = dayjs(defVal);
        }

        form.setFieldsValue({
            label: initialData.label,
            type: initialData.type,
            targetSheetId: initialData.relationConfig?.targetSheetId,
            defaultValue: defVal
        });
        setType(initialData.type);
        setOptions(initialData.options || []);
        setBidirectional(initialData.relationConfig?.bidirectional ?? true);
      } else {
        form.resetFields();
        setType('text');
        setOptions([]);
        setNewOptionLabel('');
        setBidirectional(true);
      }
    }
  }, [isOpen, initialData, form]);

  const handleOk = () => {
    form.validateFields().then(values => {
        let relationConfig: RelationConfig | undefined = undefined;
        if (type === 'relation' && values.targetSheetId) {
            relationConfig = {
                targetSheetId: values.targetSheetId,
                bidirectional: bidirectional
            };
        }
        
        let processedDefaultValue = values.defaultValue;
        if (type === 'date' && processedDefaultValue) {
            processedDefaultValue = processedDefaultValue.format('YYYY-MM-DD');
        }

        onSave(values.label, type, (type === 'select' || type === 'multiSelect') ? options : undefined, relationConfig, processedDefaultValue);
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

  const validTargetSheets = allSheets.filter(s => s.type === 'sheet' && s.id !== currentSheetId);

  const renderDefaultValueInput = () => {
    switch(type) {
        case 'text':
        case 'url':
        case 'email':
        case 'phone':
        case 'location':
            return <Input placeholder="请输入默认值" />;
        case 'number':
        case 'rating':
             return <InputNumber style={{ width: '100%' }} placeholder="请输入默认数值" />;
        case 'checkbox':
        case 'switch':
             return <Switch checkedChildren="开启" unCheckedChildren="关闭" />;
        case 'date':
             return <DatePicker style={{ width: '100%' }} />;
        case 'select':
             return (
                 <Select 
                    placeholder="选择默认选项" 
                    allowClear
                    options={options.map(o => ({
                        label: (
                             <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${o.color.split(' ')[0]}`} />
                                {o.label}
                             </div>
                        ),
                        value: o.label
                    }))}
                 />
             );
         case 'multiSelect':
              return (
                 <Select 
                    mode="multiple" 
                    placeholder="选择默认选项" 
                    allowClear
                    options={options.map(o => ({
                        label: (
                             <div className="flex items-center gap-2">
                                <div className={`w-3 h-3 rounded-full ${o.color.split(' ')[0]}`} />
                                {o.label}
                             </div>
                        ),
                        value: o.label
                    }))}
                 />
             );
        default:
             return <Input placeholder="该类型暂不支持默认值" disabled />;
    }
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

        {/* Relation Config */}
        {type === 'relation' && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm space-y-3">
                 <div className="flex items-center gap-2 text-indigo-600 mb-2">
                    <ArrowLeftRight size={16} />
                    <span className="text-sm font-semibold">关联配置</span>
                 </div>
                 
                 <Form.Item
                    name="targetSheetId"
                    label="关联到哪个表?"
                    rules={[{ required: true, message: '请选择目标表' }]}
                    className="mb-3"
                 >
                     <Select 
                        placeholder="选择目标工作表..."
                        options={validTargetSheets.map(sheet => ({
                            label: <span className="flex items-center gap-2">{sheet.name}</span>,
                            value: sheet.id
                        }))}
                     />
                 </Form.Item>
                 
                 {validTargetSheets.length === 0 && (
                     <div className="text-xs text-red-400 mb-3">没有其他可用的工作表。请先创建另一个表。</div>
                 )}

                 <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-medium text-slate-600">关联模式:</span>
                        <Radio.Group 
                            value={bidirectional} 
                            onChange={e => setBidirectional(e.target.value)} 
                            optionType="button" 
                            buttonStyle="solid" 
                            size="small"
                        >
                            <Radio.Button value={true}>双向关联</Radio.Button>
                            <Radio.Button value={false}>单向关联</Radio.Button>
                        </Radio.Group>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                        {bidirectional 
                            ? "双向关联（推荐）：会在目标表中自动创建对应的关联列，数据在两边表同步显示。" 
                            : "单向关联：仅在当前表中创建关联列，目标表不会感知此关联，适合简单的引用场景。"}
                    </p>
                 </div>
            </div>
        )}

        {/* Select Options Editor - Shared for Select and MultiSelect */}
        {(type === 'select' || type === 'multiSelect') && (
             <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                    {type === 'select' ? '单选' : '多选'}选项配置
                </h4>
                
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

        {/* Default Value Config */}
        {(type !== 'relation' && type !== 'image' && type !== 'file' && type !== 'person') && (
            <div className="bg-white p-4 rounded-lg border border-slate-200 mb-4 shadow-sm">
                 <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">默认值配置</h4>
                 <Form.Item 
                    name="defaultValue" 
                    noStyle 
                    valuePropName={(type === 'checkbox' || type === 'switch') ? 'checked' : 'value'}
                 >
                     {renderDefaultValueInput()}
                 </Form.Item>
                 <div className="text-[10px] text-slate-400 mt-2">新创建的行将自动填充此值。</div>
            </div>
        )}

      </Form>
    </Modal>
  );
};

// Helper component for color selection
const DropdownMenuColorPicker: React.FC<{ selected: any, onChange: (c: any) => void }> = ({ selected, onChange }) => {
    const options = COLORS.map((c, i) => ({
        label: (
             <div className="flex items-center gap-2 py-0.5">
                <div className={`w-4 h-4 rounded-full ${c.bg}`} />
                <span className="text-xs text-slate-600">{c.label}</span>
             </div>
        ),
        value: c.label,
        data: c
    }));

    return (
        <Select
            value={selected.label}
            style={{ width: 90 }}
            dropdownMatchSelectWidth={false}
            variant="outlined"
            optionLabelProp="value"
            labelRender={() => (
                 <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${selected.bg.replace('100', '400')}`} />
                    <span className="text-xs text-slate-600">{selected.label}</span>
                 </div>
            )}
            options={options}
            onChange={(_, option: any) => onChange(option.data)}
        />
    )
}

export default AddColumnModal;
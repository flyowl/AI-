
import React, { useState } from 'react';
import { TeamMember } from '../types';
import { Search, UserPlus, Filter, MoreHorizontal, Shield, Mail } from 'lucide-react';
import { Button, Input, Tag, Avatar, Table, Modal, Form, Select, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';

const MOCK_MEMBERS: TeamMember[] = [
    { id: '1', name: 'Alex Johnson', role: 'Admin', email: 'alex@company.com', avatar: 'A', status: 'Active', joinedAt: '2023-01-15' },
    { id: '2', name: 'Sarah Smith', role: 'Editor', email: 'sarah@company.com', avatar: 'S', status: 'Active', joinedAt: '2023-03-22' },
    { id: '3', name: 'Mike Brown', role: 'Viewer', email: 'mike@company.com', avatar: 'M', status: 'Pending', joinedAt: '2023-11-05' },
    { id: '4', name: 'Emily Davis', role: 'Editor', email: 'emily@company.com', avatar: 'E', status: 'Active', joinedAt: '2023-06-10' },
    { id: '5', name: 'David Wilson', role: 'Viewer', email: 'david@company.com', avatar: 'D', status: 'Active', joinedAt: '2023-09-30' },
];

const Team: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>(MOCK_MEMBERS);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [form] = Form.useForm();

  const handleInvite = () => {
      form.validateFields().then(values => {
          const emails = values.emails as string[];
          const role = values.role;
          
          // Mock sending invitation and adding to list
          const newMembers: TeamMember[] = emails.map((email, idx) => ({
              id: `new-${Date.now()}-${idx}`,
              name: email.split('@')[0],
              email: email,
              role: role,
              avatar: email[0].toUpperCase(),
              status: 'Pending',
              joinedAt: new Date().toISOString().split('T')[0]
          }));

          setMembers([...members, ...newMembers]);
          message.success(`已发送邀请给 ${emails.length} 位成员`);
          setIsInviteModalOpen(false);
          form.resetFields();
      });
  };

  const columns: ColumnsType<TeamMember> = [
    {
        title: '成员',
        dataIndex: 'name',
        key: 'name',
        render: (text, record) => (
            <div className="flex items-center gap-3">
                <Avatar className={`bg-gradient-to-br ${record.id === '1' ? 'from-blue-500 to-indigo-500' : 'from-slate-400 to-slate-500'}`}>{record.avatar}</Avatar>
                <div>
                    <div className="font-medium text-slate-800">{text}</div>
                    <div className="text-xs text-slate-400">{record.email}</div>
                </div>
            </div>
        )
    },
    {
        title: '角色',
        dataIndex: 'role',
        key: 'role',
        render: (role) => (
            <div className="flex items-center gap-1.5">
                <Shield size={14} className={role === 'Admin' ? 'text-indigo-500' : 'text-slate-400'} />
                <span className={role === 'Admin' ? 'text-indigo-700 font-medium' : 'text-slate-600'}>{role}</span>
            </div>
        )
    },
    {
        title: '状态',
        dataIndex: 'status',
        key: 'status',
        render: (status) => (
            <Tag color={status === 'Active' ? 'success' : 'warning'} className="rounded-full px-2 border-0">
                {status === 'Active' ? '活跃' : '邀请中'}
            </Tag>
        )
    },
    {
        title: '加入时间',
        dataIndex: 'joinedAt',
        key: 'joinedAt',
        render: (date) => <span className="text-slate-500">{date}</span>
    },
    {
        title: '操作',
        key: 'action',
        render: () => (
            <Button type="text" icon={<MoreHorizontal size={16} />} className="text-slate-400" />
        )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto animate-in fade-in duration-500">
        <div className="flex items-center justify-between mb-8">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 mb-2">团队成员</h1>
                <p className="text-slate-500 text-sm">管理您的团队成员、权限和角色配置。</p>
            </div>
            <Button 
                type="primary" 
                icon={<UserPlus size={16} />} 
                size="large" 
                className="bg-indigo-600 hover:bg-indigo-700 shadow-sm border-0"
                onClick={() => setIsInviteModalOpen(true)}
            >
                邀请成员
            </Button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between gap-4 bg-slate-50/50">
                <div className="relative flex-1 max-w-md">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <Input placeholder="搜索成员姓名或邮箱..." className="pl-10 rounded-lg" />
                </div>
                <div className="flex gap-2">
                    <Button icon={<Filter size={16} />}>筛选</Button>
                    <Button icon={<Mail size={16} />}>群发邮件</Button>
                </div>
            </div>
            <Table 
                columns={columns} 
                dataSource={members} 
                rowKey="id" 
                pagination={false} 
                className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:text-slate-500"
            />
            <div className="p-4 border-t border-slate-200 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                <span>共 {members.length} 位成员</span>
                <span>团队 ID: 8839201</span>
            </div>
        </div>

        {/* Invite Member Modal */}
        <Modal
            title="邀请团队成员"
            open={isInviteModalOpen}
            onOk={handleInvite}
            onCancel={() => setIsInviteModalOpen(false)}
            okText="发送邀请"
            cancelText="取消"
            width={520}
            centered
            destroyOnClose={true}
        >
             <Form form={form} layout="vertical" className="pt-4">
                <Form.Item 
                    name="emails" 
                    label="邮箱地址" 
                    rules={[{ required: true, message: '请输入至少一个邮箱地址' }]}
                    tooltip="输入邮箱后按回车键添加多个"
                >
                    <Select
                        mode="tags"
                        style={{ width: '100%' }}
                        placeholder="例如: colleague@company.com"
                        tokenSeparators={[',', ' ']}
                        open={false}
                    />
                </Form.Item>
                
                <Form.Item 
                    name="role" 
                    label="分配角色" 
                    initialValue="Editor"
                >
                    <Select>
                        <Select.Option value="Admin">
                             <div className="flex flex-col py-1">
                                 <span className="font-medium">管理员 (Admin)</span>
                                 <span className="text-xs text-slate-400">拥有团队所有权限，可以管理成员和计费。</span>
                             </div>
                        </Select.Option>
                        <Select.Option value="Editor">
                             <div className="flex flex-col py-1">
                                 <span className="font-medium">编辑者 (Editor)</span>
                                 <span className="text-xs text-slate-400">可以创建、编辑和删除文件。</span>
                             </div>
                        </Select.Option>
                        <Select.Option value="Viewer">
                             <div className="flex flex-col py-1">
                                 <span className="font-medium">查看者 (Viewer)</span>
                                 <span className="text-xs text-slate-400">仅可以查看和评论文件，无法编辑。</span>
                             </div>
                        </Select.Option>
                    </Select>
                </Form.Item>
             </Form>
        </Modal>
    </div>
  );
};

export default Team;

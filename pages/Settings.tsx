
import React from 'react';
import { Tabs, Form, Input, Button, Switch, Avatar, Upload, message } from 'antd';
import { User, Bell, Shield, CreditCard, Upload as UploadIcon } from 'lucide-react';

const Settings: React.FC = () => {
    return (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500 py-6">
            <h1 className="text-2xl font-bold text-slate-800 mb-6">账户设置</h1>
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[500px]">
                <Tabs 
                    tabPosition="left" 
                    className="h-full py-4"
                    items={[
                        {
                            key: 'profile',
                            label: <span className="flex items-center gap-2"><User size={16}/> 个人资料</span>,
                            children: <ProfileSettings />
                        },
                        {
                            key: 'notifications',
                            label: <span className="flex items-center gap-2"><Bell size={16}/> 通知</span>,
                            children: <NotificationSettings />
                        },
                        {
                            key: 'security',
                            label: <span className="flex items-center gap-2"><Shield size={16}/> 安全</span>,
                            children: <div className="p-8 text-slate-500">安全设置功能开发中...</div>
                        },
                        {
                            key: 'billing',
                            label: <span className="flex items-center gap-2"><CreditCard size={16}/> 订阅与计费</span>,
                            children: <div className="p-8 text-slate-500">计费管理功能开发中...</div>
                        }
                    ]}
                />
            </div>
        </div>
    );
};

const ProfileSettings = () => (
    <div className="px-8 py-4 max-w-lg">
        <h3 className="text-lg font-medium text-slate-800 mb-6">基本信息</h3>
        <div className="flex items-center gap-6 mb-8">
            <Avatar size={80} className="bg-indigo-600 text-2xl">V</Avatar>
            <Upload>
                <Button icon={<UploadIcon size={16}/>}>更换头像</Button>
            </Upload>
        </div>
        <Form layout="vertical" initialValues={{ nickname: 'Vincent', email: 'vincent@example.com', bio: 'Product Designer' }}>
            <Form.Item label="昵称" name="nickname">
                <Input />
            </Form.Item>
            <Form.Item label="邮箱" name="email">
                <Input disabled />
            </Form.Item>
            <Form.Item label="简介" name="bio">
                <Input.TextArea rows={4} />
            </Form.Item>
            <Form.Item>
                <Button type="primary" onClick={() => message.success('保存成功')}>保存更改</Button>
            </Form.Item>
        </Form>
    </div>
);

const NotificationSettings = () => (
    <div className="px-8 py-4 max-w-2xl">
        <h3 className="text-lg font-medium text-slate-800 mb-6">通知偏好</h3>
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-slate-700">邮件通知</div>
                    <div className="text-xs text-slate-500">当有重要更新或活动时发送邮件</div>
                </div>
                <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-slate-700">桌面推送</div>
                    <div className="text-xs text-slate-500">接收浏览器实时通知</div>
                </div>
                <Switch />
            </div>
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-slate-700">团队动态</div>
                    <div className="text-xs text-slate-500">当团队成员更新文档时通知我</div>
                </div>
                <Switch defaultChecked />
            </div>
        </div>
    </div>
);

export default Settings;

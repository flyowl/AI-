
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Checkbox, Form, message } from 'antd';
import { Lock, Mail } from 'lucide-react';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const onFinish = (values: any) => {
    // Mock login
    console.log('Success:', values);
    message.success('登录成功');
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-violet-600 rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                C
            </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900">
          登录到 Calicat
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          下一代智能多维表格系统
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-slate-200">
          <Form
            name="login"
            initialValues={{ remember: true }}
            onFinish={onFinish}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              rules={[{ required: true, message: '请输入邮箱地址!' }]}
            >
              <Input prefix={<Mail className="text-slate-400" size={18} />} placeholder="邮箱地址" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[{ required: true, message: '请输入密码!' }]}
            >
              <Input.Password prefix={<Lock className="text-slate-400" size={18} />} placeholder="密码" />
            </Form.Item>

            <div className="flex items-center justify-between mb-6">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                    <Checkbox>记住我</Checkbox>
                </Form.Item>
                <a className="text-sm font-medium text-indigo-600 hover:text-indigo-500" href="#">
                    忘记密码?
                </a>
            </div>

            <Form.Item>
              <Button type="primary" htmlType="submit" block className="bg-indigo-600 hover:bg-indigo-700 h-10 font-medium">
                登录
              </Button>
            </Form.Item>
          </Form>
          
          <div className="mt-6">
              <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-slate-500">
                          或者
                      </span>
                  </div>
              </div>
              <div className="mt-6 grid grid-cols-2 gap-3">
                  <Button block>Google</Button>
                  <Button block>GitHub</Button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

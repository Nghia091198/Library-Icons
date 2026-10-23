import { Alert, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAdmin } from '@/client/admin/adminService';
import { ApiError } from '@/client/common/apiClient';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { ERROR_CODE, type ErrorCode } from '@/shared/constants/errorCodes';
import type { LoginRequest } from '@/shared/types/api';

const SIGN_IN_ERROR_MESSAGE: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODE.invalidCredentials]: 'Email hoặc mật khẩu không đúng.',
  [ERROR_CODE.tooManyRequests]: 'Đăng nhập sai quá nhiều lần. Thử lại sau 15 phút.',
  [ERROR_CODE.validationFailed]: 'Email không hợp lệ.',
};

const FALLBACK_SIGN_IN_ERROR = 'Không đăng nhập được. Kiểm tra server và thử lại.';

function describeSignInError(error: unknown): string {
  if (!(error instanceof ApiError)) return FALLBACK_SIGN_IN_ERROR;
  return SIGN_IN_ERROR_MESSAGE[error.code] ?? `${FALLBACK_SIGN_IN_ERROR} (HTTP ${error.status} · ${error.code})`;
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleFinish(values: LoginRequest) {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await signInAdmin(values);
      navigate(CLIENT_ROUTE.adminIcons, { replace: true });
    } catch (error) {
      setErrorMessage(describeSignInError(error));
      setIsSubmitting(false);
    }
  }

  return (
    <Flex align="center" justify="center" style={{ minHeight: '100vh', padding: 24, background: '#f5f5f5' }}>
      <Card style={{ width: '100%', maxWidth: 400 }}>
        <Typography.Title level={4} style={{ marginTop: 0 }}>
          Đăng nhập admin
        </Typography.Title>
        <Form layout="vertical" requiredMark={false} onFinish={(values: LoginRequest) => void handleFinish(values)}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input autoComplete="email" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password autoComplete="current-password" />
          </Form.Item>
          {errorMessage && <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" block loading={isSubmitting}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}

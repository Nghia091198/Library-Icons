import { Alert, Button, Card, Flex, Form, Input, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInAdmin } from '@/client/admin/adminService';
import { ApiError } from '@/client/common/apiClient';
import { BRAND_LOGO_URL } from '@/client/common/brand';
import { CLIENT_ROUTE } from '@/client/common/clientRoutes';
import { DARK_COLOR } from '@/client/common/darkTheme';
import { DarkThemeProvider } from '@/client/common/DarkThemeProvider';
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
  return (
    <DarkThemeProvider>
      <AdminLoginForm />
    </DarkThemeProvider>
  );
}

function AdminLoginForm() {
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
    <Flex
      align="center"
      justify="center"
      style={{
        minHeight: '100vh',
        padding: 24,
        background: `radial-gradient(ellipse at 50% 0%, ${DARK_COLOR.primary}33, transparent 60%), ${DARK_COLOR.background}`,
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400, background: DARK_COLOR.surface, border: `1px solid ${DARK_COLOR.border}` }}>
        <Flex vertical align="center" gap={8} style={{ marginBottom: 24 }}>
          <img src={BRAND_LOGO_URL} width={44} height={44} alt="" />
          <Typography.Title level={1} style={{ margin: 0, fontSize: 22 }}>
            Lib Icons Admin
          </Typography.Title>
          <Typography.Text type="secondary">Đăng nhập để quản lý thư viện icon</Typography.Text>
        </Flex>
        <Form layout="vertical" requiredMark={false} onFinish={(values: LoginRequest) => void handleFinish(values)}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
            <Input autoComplete="email" size="large" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password autoComplete="current-password" size="large" />
          </Form.Item>
          {errorMessage && <Alert type="error" showIcon message={errorMessage} style={{ marginBottom: 16 }} />}
          <Button type="primary" htmlType="submit" block size="large" loading={isSubmitting}>
            Đăng nhập
          </Button>
        </Form>
      </Card>
    </Flex>
  );
}

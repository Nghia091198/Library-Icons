import { useCallback, useEffect, useState } from 'react';
import { fetchAdminMe, signOutAdmin } from '@/client/admin/adminService';
import { ApiError } from '@/client/common/apiClient';
import { ERROR_CODE } from '@/shared/constants/errorCodes';

export const ADMIN_SESSION_STATUS = {
  loading: 'loading',
  signedOut: 'signedOut',
  failed: 'failed',
  ready: 'ready',
} as const;

export type AdminSessionState =
  | { status: typeof ADMIN_SESSION_STATUS.loading }
  | { status: typeof ADMIN_SESSION_STATUS.signedOut }
  | { status: typeof ADMIN_SESSION_STATUS.failed; message: string }
  | { status: typeof ADMIN_SESSION_STATUS.ready; email: string };

async function resolveAdminSession(): Promise<AdminSessionState> {
  try {
    const me = await fetchAdminMe();
    return { status: ADMIN_SESSION_STATUS.ready, email: me.email };
  } catch (error) {
    if (error instanceof ApiError && error.code === ERROR_CODE.unauthorized) {
      return { status: ADMIN_SESSION_STATUS.signedOut };
    }
    const message = error instanceof Error ? error.message : 'Không xác minh được phiên đăng nhập';
    return { status: ADMIN_SESSION_STATUS.failed, message };
  }
}

export function useAdminSession() {
  const [session, setSession] = useState<AdminSessionState>({ status: ADMIN_SESSION_STATUS.loading });

  useEffect(() => {
    let isActive = true;
    void resolveAdminSession().then((nextSession) => {
      if (isActive) setSession(nextSession);
    });
    return () => {
      isActive = false;
    };
  }, []);

  const signOut = useCallback(async () => {
    await signOutAdmin();
    setSession({ status: ADMIN_SESSION_STATUS.signedOut });
  }, []);

  return { session, signOut };
}

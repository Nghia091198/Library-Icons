import { api } from '@/client/common/apiClient';
import { API_ROUTE } from '@/shared/constants/apiRoutes';
import type { AdminMeResponse, LoginRequest } from '@/shared/types/api';

export function signInAdmin(credentials: LoginRequest): Promise<AdminMeResponse> {
  return api.post<AdminMeResponse>(API_ROUTE.authLogin, credentials);
}

export async function signOutAdmin(): Promise<void> {
  await api.post<null>(API_ROUTE.authLogout);
}

export function fetchAdminMe(): Promise<AdminMeResponse> {
  return api.get<AdminMeResponse>(API_ROUTE.adminMe);
}

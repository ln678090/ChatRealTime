import axios from 'axios';
import {useAuthStore} from './store/auth.store';

import { getConnectHubApiUrl } from './services/api/api';
import axiosClientchatbe from './services/api/axiosClientchatbe';

export async function bootstrapAuth(): Promise<void> {
    const domain=getConnectHubApiUrl();
    try {
        // Dùng axios thuần, bỏ qua mọi Interceptor để không bị nuốt Promise
        const resp = await axios.post(`${domain}/api/auth/refresh`, {}, {
            withCredentials: true
        });

        const accessToken = resp?.data?.data?.accessToken ?? resp?.data?.accessToken ?? null;

        if (accessToken) {
            useAuthStore.getState().setAccessToken(accessToken);

            // Fetch thông tin user sau khi có token
            const userResp = await axiosClientchatbe.get('/users/me');
            const user = userResp?.data?.data ?? userResp?.data ?? null;
            useAuthStore.getState().setUser(user);
        }
    } catch (_) {
        // Rơi vào đây nếu bị 401 (chưa đăng nhập) hoặc Token hết hạn
        useAuthStore.getState().setAccessToken(null);
    } finally {
        // Đảm bảo lệnh này luôn được gọi để bỏ "Đang khởi động..."
        useAuthStore.getState().setAuthReady(true);
    }
}

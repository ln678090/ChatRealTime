// src/components/AuthInitializer.tsx
import {useEffect, useRef, useState} from 'react';
import {useAuthStore} from '../store/auth.store';
import axiosClient from '../services/api/axiosClient';

export function AuthInitializer({children}: { children: React.ReactNode }) {
    const setAccessToken = useAuthStore((s) => s.setAccessToken);
    const setUser = useAuthStore((s) => s.setUser);      // xem phần 2 bên dưới
    const logout = useAuthStore((s) => s.logout);
    const [ready, setReady] = useState(false);
    const attempted = useRef(false);

    useEffect(() => {
        if (attempted.current) return;
        attempted.current = true;

        (async () => {
            try {
                // Cookie HttpOnly refresh-token tự động gửi kèm nhờ withCredentials: true
                const res = await axiosClient.post('/auth/refresh');
                const data = res?.data?.data ?? res?.data;
                const accessToken = data?.accessToken ?? null;
                const user = data?.user ?? null;

                if (accessToken) {
                    setAccessToken(accessToken);
                    if (user) setUser(user);
                    console.log('[Auth] Session restored ');
                } else {
                    logout();
                }
            } catch {
                console.log('[Auth] No valid session');
                logout();
            } finally {
                setReady(true);
            }
        })();
    }, []);

    if (!ready) {
        return (
            <div className="h-screen w-screen flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
                    <p className="text-gray-500 text-sm">Đang khởi tạo...</p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

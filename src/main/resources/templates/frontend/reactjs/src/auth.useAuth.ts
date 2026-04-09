import {useAuthStore} from "./store/auth.store.ts";
import {useMemo} from "react";

interface JwtPayload {
    sub: string; // userId
    roles: string[];
    exp: number;
}


export const useAuth = () => {
    const {accessToken, logout} = useAuthStore();

    return useMemo(() => {
        if (!accessToken) return {isAuthenticated: false, user: null, isAdmin: false};

        try {
            // Decode JWT Payload (phần thứ 2 của chuỗi token a.b.c)
            const base64Url = accessToken.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                window.atob(base64)
                    .split('')
                    .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );

            const payload: JwtPayload = JSON.parse(jsonPayload);

            // Kiểm tra hết hạn
            if (Date.now() >= payload.exp * 1000) {
                logout();
                return {isAuthenticated: false, user: null, isAdmin: false};
            }

            const isAdmin = payload.roles?.includes('ROLE_ADMIN') || false;

            return {
                isAuthenticated: true,
                user: {id: payload.sub, roles: payload.roles},
                isAdmin,
            };
        } catch (error) {
            console.error('Invalid token format');
            return {isAuthenticated: false, user: null, isAdmin: false};
        }
    }, [accessToken, logout]);

}
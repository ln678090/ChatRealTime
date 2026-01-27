import axiosClient from "./services/api/axiosClient.ts";
import {useAuthStore} from "./store/auth.store.ts";


export const bootstrapAuth = async () => {
    try {
        const res = await axiosClient.post("/auth/refresh-token");
        const token =
            res?.data?.data?.accessToken ?? res?.data?.accessToken ?? null;

        if (token) useAuthStore.getState().setAccessToken(token);
    } catch {
        // không có refresh cookie hoặc hết hạn => thôi
        useAuthStore.getState().clear();

    }
}
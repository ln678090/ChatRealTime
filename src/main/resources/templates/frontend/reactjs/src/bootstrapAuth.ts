import axiosClient from "./services/api/axiosClient.ts";
import {useAuthStore} from "./store/auth.store.ts";

let booting = false;

export const bootstrapAuth = async () => {
    if (booting) return;
    booting = true;

    const {setAccessToken, setAuthReady} = useAuthStore.getState();
    try {
        const res = await axiosClient.post("/auth/refresh-token");
        const token =
            res?.data?.data?.accessToken ?? res?.data?.accessToken ?? null;

        if (token) useAuthStore.getState().setAccessToken(token);
    } catch {
        // không có refresh cookie hoặc hết hạn => thôi
        useAuthStore.getState().clear();
        setAccessToken(null);
    } finally {
        booting = false;
        setAuthReady(true);
    }
}

//  chạy lúc app mount
bootstrapAuth();

//  chạy lại khi quay lại tab
document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") bootstrapAuth();
});
window.addEventListener("focus", () => bootstrapAuth());
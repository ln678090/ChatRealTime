import {create} from "zustand";
import {persist} from "zustand/middleware";
import axiosClient from "../services/api/axiosClient.ts";

// 1. Định nghĩa kiểu dữ liệu User
type User = {
    id: string;
    username: string;
    email: string;
    fullName: string;
    avatar?: string;
    role?: string;
};

type AuthState = {
    accessToken: string | null;
    user: User | null; // [NEW] Thêm field user
    authReady: boolean;

    setAccessToken: (token: string | null) => void;
    setUser: (user: User | null) => void; // [NEW] Hàm set user
    setAuthReady: (v: boolean) => void;

    logout: () => void; // [NEW] Hàm logout tiện lợi
};

interface AuthState {
    user: User | null;
    setUser: (user: User | null) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist( // Dùng persist để lưu vào localStorage tự động (F5 không mất)
        (set) => ({
            accessToken: null,
            user: null,
            authReady: false,

            setAccessToken: (token) => set({accessToken: token}),
            setUser: (user) => set({user: user}),
            setAuthReady: (v) => set({authReady: v}),

            logout: async () => {
                set({accessToken: null, user: null, authReady: false});
                localStorage.removeItem("auth-storage"); // Xóa persist store
                const res = await axiosClient.post("/auth/logout");
                set({user: null});
                window.location.href = "/login"; // Redirect cứng về login
            },
        }),
        {
            name: "auth-storage", // Tên key trong localStorage
            partialize: (state) => ({accessToken: state.accessToken, user: state.user}), // Chỉ lưu token & user
        }
    )
);

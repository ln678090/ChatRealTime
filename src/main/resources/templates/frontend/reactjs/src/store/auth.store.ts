// src/store/auth.store.ts
import {create} from 'zustand';

type User = {
    id: string;
    username: string;
    email: string;
    fullName: string;
    avatar?: string;
    role?: string;
    address?: string;
};

type AuthState = {
    accessToken: string | null;
    user: User | null;
    authReady: boolean;
    setAccessToken: (token: string | null) => void;
    setUser: (user: User | null) => void;
    setAuthReady: (v: boolean) => void;
    logout: () => void;
};

export const useAuthStore = create<AuthState>((set) => ({
    accessToken: null,
    user: null,
    authReady: false,

    setAccessToken: (token) => set({accessToken: token}),
    setUser: (user) => set({user}),
    setAuthReady: (v) => set({authReady: v}),

    logout: async () => {
        set({accessToken: null, user: null});
        // Gọi logout API để clear cookie refresh token ở server
        try {
            await fetch('/api/auth/logout', {method: 'POST', credentials: 'include'});
        } catch (_) {
        }
        // window.location.href = '/auth';
    },
}));

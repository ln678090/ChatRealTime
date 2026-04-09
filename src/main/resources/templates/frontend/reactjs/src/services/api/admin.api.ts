import {axiosClient} from "./axiosClient.ts";

export interface PageResponse<T> {
    content: T[];
    totalPages: number;
    totalElements: number;
    size: number;
    number: number;
}

export interface User {
    id: string;
    email: string;
    fullName: string;
    enabled: boolean;
    roles: string[];
    avatar?: string;
}

export interface BlacklistWord {
    id: string;
    keyword: string;
    severity: number;
    isActive: boolean;
    isDeleted: boolean;
}


interface ApiResp<T> {
    code: string;
    message: string;
    data: T;
}

export const adminApi = {
    // ==== USERS ====
    getUsers: async (params: { query?: string; status?: string; page: number; size: number }) => {
        const res = await axiosClient.get<ApiResp<PageResponse<User>>>('/admin/users', {params});
        // Trả về thẳng cục PageResponse (nằm trong res.data.data)
        return res.data.data;
    },
    toggleUserLock: async (id: string, locked: boolean) => {
        const res = await axiosClient.patch<ApiResp<any>>(`/admin/users/${id}/lock`, {locked});
        return res.data;
    },
    updateUserRoles: async (id: string, roles: string[]) => {
        const res = await axiosClient.patch<ApiResp<any>>(`/admin/users/${id}/roles`, {roles});
        return res.data;
    },


    getBlacklist: async (params: { query?: string; page: number; size: number, status?: string }) => {
        const res = await axiosClient.get<ApiResp<PageResponse<BlacklistWord>>>('/admin/blacklist', {params});
        return res.data.data;
    },
    createBlacklistWord: async (data: Partial<BlacklistWord>) => {
        const res = await axiosClient.post<ApiResp<BlacklistWord>>('/admin/blacklist', data);
        return res.data.data;
    },
    updateBlacklistWord: async (id: string, data: Partial<BlacklistWord>) => {
        const res = await axiosClient.put<ApiResp<BlacklistWord>>(`/admin/blacklist/${id}`, data);
        return res.data.data;
    },
    toggleActiveBlacklistWord: async (id: string, isActive: boolean) => {
        const res = await axiosClient.patch<ApiResp<any>>(`/admin/blacklist/${id}/toggle-active`, {isActive});
        return res.data;
    },
    softDeleteBlacklistWord: async (id: string) => {
        const res = await axiosClient.patch<ApiResp<any>>(`/admin/blacklist/${id}/soft-delete`);
        return res.data;
    }
}

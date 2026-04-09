import axiosClientchatbe from "./api/axiosClientchatbe";

export interface UserProfile {
    id: string;
    username: string;
    fullName: string;
    email: string;
    avatar: string;
    address?: string;
    role?: string;
}

export interface UpdateProfileReq {
    fullName: string;
    address: string;
}

export const userService = {
    // Get current user
    async getCurrentUser(): Promise<UserProfile> {
        const res = await axiosClientchatbe.get('/users/me');
        return res.data.data;
    },

    // Update profile (chỉ fullName và address)
    async updateProfile(data: UpdateProfileReq): Promise<UserProfile> {
        const res = await axiosClientchatbe.put('/users/me', data);
        return res.data.data;
    },

    // Upload avatar (để sau làm)
    async uploadAvatar(file: File): Promise<string> {
        const formData = new FormData();
        formData.append('file', file);

        const res = await axiosClientchatbe.post('/users/me/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });

        return res.data.data;
    },
};

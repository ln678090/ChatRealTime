import axiosClient from "./api/axiosClient.ts";

export interface ConversationDTO {
    conversationId: number;
    chatName: string;
    avatar?: string;
    isGroup: boolean;
    lastMessage?: string;
    lastMessageTime?: string;
    unreadCount?: number;

    friendshipStatus?: "NONE" | "PENDING_OUT" | "PENDING_IN" | "FRIEND" | "BLOCKED";
    canMessage?: boolean;
    otherUser?: { id: string; fullName?: string; avatar?: string; username?: string };
    box?: "PRIMARY" | "ANON";
}


export interface MessageDTO {
    id: number;
    content: string;
    senderId: string;
    senderName: string;
    senderAvatar: string;
    createdAt: string;
    type: 'TEXT' | 'IMAGE' | 'FILE';
    status: 'SENT' | 'DELIVERED' | 'READ';
}

export interface PagedConversationResp {
    items: ConversationDTO[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
}

export interface PagedMessageResp {
    items: MessageDTO[];
    currentPage: number;
    totalPages: number;
    totalItems: number;
    hasNext: boolean;
}

export const chatService = {
    // lay danh sach hop thoai
    getConversations: async () => {
        const res = await axiosClient.get('/conversations');
        return res.data.data;
    },
    // lay danh sach hop thoai paged
    async getConversationsPaged(page: number = 0, size: number = 20): Promise<PagedConversationResp> {
        const res = await axiosClient.get(`/conversations/paged?page=${page}&size=${size}`);
        return res.data.data;
    },
    // lay tin nhan 1 hoi thoai
    getMessages: async (conversationId: number) => {
        const res = await axiosClient.get(`/messages/${conversationId}`);
        return res.data.data;
    },
    async getMessagesPaged(
        conversationId: number,
        page: number = 0,
        size: number = 50
    ): Promise<PagedMessageResp> {
        const res = await axiosClient.get(
            `/messages/${conversationId}/paged?page=${page}&size=${size}`
        );
        return res.data.data;
    },
    // gui tin nhan
    sendMessage: async (conversationId: number, content: string, type: string = 'TEXT') => {
        const payload = {
            conversationId: conversationId,
            content: content,
            messageType: "TEXT"
        };
        const res = axiosClient.post('/messages', payload);
        return res;
    }
};
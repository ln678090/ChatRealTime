import axiosClient from "./api/axiosClient.ts";


export interface ConversationDTO {
    conversationId: number;
    chatName: string; // Tên hiển thị (Tên người chat cùng hoặc tên nhóm)
    avatar: string;   // Avatar hiển thị
    lastMessage: string;
    lastMessageTime: string;
    isGroup: boolean;
    unreadCount: number;
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

export const chatService = {
    // lay danh sach hop thoai
    getConversations: async () => {
        const res = await axiosClient.get('/conversations');
        return res.data.data;
    }
    ,
    // lay tin nhan 1 hoi thoai
    getMessages: async (conversationId: number) => {
        const res = await axiosClient.get(`/messages/${conversationId}`);
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
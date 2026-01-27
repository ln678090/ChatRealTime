import { create } from "zustand";


interface User{
     id: string;
    fullName: string;
    avatar: string;
    isOnline: boolean;
}
interface Conversation {
    id: number;
    chatName: string;
    isGroup: boolean;
    lastMessage?: string;
    lastMessageTime?: string;
    otherUser?: User; // Thông tin người chat cùng (nếu không phải group)
}

interface ChatState {
    activeConversation: Conversation | null;
    setActiveConversation: (conversation: Conversation | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    activeConversation: null,
    setActiveConversation: (conversation) => set({ activeConversation: conversation }),
}));
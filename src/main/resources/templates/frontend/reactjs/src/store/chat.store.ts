import {create} from "zustand";

export type FriendshipStatus =
    | "NONE"
    | "PENDING_OUT"
    | "PENDING_IN"
    | "FRIEND"
    | "BLOCKED";

export type InboxBox = "PRIMARY" | "ANON"; // PRIMARY = bạn bè/nhóm, ANON = chưa kết bạn

export interface OtherUser {
    id: string;
    fullName?: string;
    avatar?: string;
    username?: string;
    isOnline?: boolean; // optional để khỏi TS đỏ
}

export interface Conversation {
    id: number;
    chatName: string;
    isGroup: boolean;

    avatar?: string;
    otherUser?: OtherUser;    // 1-1

    friendshipStatus?: FriendshipStatus;
    canMessage?: boolean;     // BE quyết định
    box?: InboxBox;           //  phân loại tab
    otherUserId?: string | null;     //  add

}

interface ChatState {
    activeConversation: Conversation | null;
    setActiveConversation: (conversation: Conversation | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    activeConversation: null,
    setActiveConversation: (conversation) => set({activeConversation: conversation}),
}));

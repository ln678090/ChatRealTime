import {create} from 'zustand';

interface CallState {
    outgoingCall: { conversationId: string | number, otherUserId: string, isVideo: boolean } | null;
    startOutgoingCall: (convId: string | number, userId: string, isVideo: boolean) => void;
    clearOutgoingCall: () => void;
}

export const useCallStore = create<CallState>((set) => ({
    outgoingCall: null,
    startOutgoingCall: (conversationId, otherUserId, isVideo) => set({
        outgoingCall: {
            conversationId,
            otherUserId,
            isVideo
        }
    }),
    clearOutgoingCall: () => set({outgoingCall: null})
}));

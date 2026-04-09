// src/components/GlobalFriendEventListener.tsx
import {useEffect} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {useGlobalSocket} from '../context/WebSocketContext';
import {useChatStore} from '../store/chat.store';

const FRIEND_EVENT_CODE = 7;

export const GlobalFriendEventListener = () => {
    const queryClient = useQueryClient();
    const {subscribe} = useGlobalSocket();
    const {activeConversation, setActiveConversation} = useChatStore();

    useEffect(() => {
        console.log(' Global friend event listener mounted');

        const unsubscribe = subscribe((payload: any) => {
            const isFriendEvent =
                payload?.messageType === FRIEND_EVENT_CODE ||
                payload?.messageType === "FRIEND_EVENT";

            if (!isFriendEvent) return;

            console.log('👥 Global friend event received:', payload);

            // Refresh conversations
            void queryClient.invalidateQueries({queryKey: ["conversations"]});

            //  Parse từ TOP-LEVEL (không phải metadata)
            const newStatus = String(payload?.uiStatus ?? "");
            const actorId = String(payload?.actorId ?? "");
            const targetId = String(payload?.targetId ?? "");

            console.log(' Friend status update:', {
                newStatus,
                actorId,
                targetId,
                friendEventType: payload?.friendEventType,
                activeConvId: activeConversation?.id
            });

            //  Update active conversation
            if (activeConversation && newStatus && (actorId || targetId)) {
                const otherUserId =
                    (activeConversation as any).otherUserId ??
                    (activeConversation as any).peerUserId ??
                    (activeConversation as any).targetUserId;

                const isAffected =
                    String(otherUserId) === actorId ||
                    String(otherUserId) === targetId;

                if (isAffected) {
                    console.log(' Updating active conversation friend status:', newStatus);
                    setActiveConversation({
                        ...(activeConversation as any),
                        friendshipStatus: newStatus
                    } as any);
                }
            }
        });

        return () => {
            console.log(' Global friend event listener unmounted');
            unsubscribe();
        };
    }, [subscribe, queryClient, activeConversation, setActiveConversation]);

    return null;
};
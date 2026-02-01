import {BsThreeDots, BsTrash} from "react-icons/bs";
import {BiEdit} from "react-icons/bi";
import IconButton from "../ui/IconButton";
import {IoSearch} from "react-icons/io5";
import {useChatStore} from "../../store/chat.store";
import {useInfiniteQuery, useMutation, useQueryClient} from "@tanstack/react-query";
import {chatService} from "../../services/chat.service";
import {formatDistanceToNow} from "date-fns";
import {vi} from "date-fns/locale";
import React, {useEffect, useRef, useState} from "react";
import axiosClient from "../../services/api/axiosClient.ts";
import NewChatModal from "./NewChatModal.tsx";
import {useGlobalSocket} from "../../context/WebSocketContext.tsx";

const getLocalUnread = (): string[] => {
    try {
        return JSON.parse(localStorage.getItem("unread_convs") || "[]");
    } catch {
        return [];
    }
};

const addLocalUnread = (convId: number) => {
    const list = getLocalUnread();
    if (!list.includes(String(convId))) {
        list.push(String(convId));
        localStorage.setItem("unread_convs", JSON.stringify(list));
    }
};

const removeLocalUnread = (convId: number) => {
    const list = getLocalUnread();
    const newList = list.filter(id => id !== String(convId));
    localStorage.setItem("unread_convs", JSON.stringify(newList));
};

const ConversationList = () => {
    const computeBox = (c: any): "PRIMARY" | "ANON" => {
        if (c.isGroup) return "PRIMARY";
        return c.friendshipStatus === "FRIEND" ? "PRIMARY" : "ANON";
    };

    const [onlineStatusMap, setOnlineStatusMap] = useState<Record<string, boolean>>({});
    const [tab, setTab] = useState<"PRIMARY" | "ANON">("PRIMARY");
    const {subscribe} = useGlobalSocket();
    const queryClient = useQueryClient();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const {activeConversation, setActiveConversation} = useChatStore();
    const [localUnreadIds, setLocalUnreadIds] = useState<string[]>(getLocalUnread());
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
    } = useInfiniteQuery({
        queryKey: ['conversations-paged'],
        queryFn: ({pageParam = 0}) => chatService.getConversationsPaged(pageParam, 20),
        getNextPageParam: (lastPage) => lastPage.hasNext ? lastPage.currentPage + 1 : undefined,
        initialPageParam: 0,
        staleTime: 30000,
    });

    const allConversations = React.useMemo(() => {
        return data?.pages.flatMap(page => page.items) || [];
    }, [data]);

    const filtered = React.useMemo(() => {
        return allConversations.filter((c: any) => {
            const box = c.box ?? computeBox(c);
            return box === tab;
        });
    }, [allConversations, tab]);

    useEffect(() => {
        const scrollEl = scrollRef.current;
        if (!scrollEl) return;

        const handleScroll = () => {
            const {scrollTop, scrollHeight, clientHeight} = scrollEl;
            const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

            if (isNearBottom && hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
            }
        };

        scrollEl.addEventListener("scroll", handleScroll);
        return () => scrollEl.removeEventListener("scroll", handleScroll);
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const deleteChatMutation = useMutation({
        mutationFn: async (conversationId: number) => {
            return await axiosClient.delete(`/conversations/${conversationId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({queryKey: ['conversations-paged']});
            setActiveConversation(null);
            setOpenMenuId(null);
        }
    });

    const handleDeleteChat = (e: React.MouseEvent, conversationId: number) => {
        e.stopPropagation();
        if (window.confirm("Bạn chắc chắn muốn xóa cuộc trò chuyện này?")) {
            deleteChatMutation.mutate(conversationId);
        }
    };

    const toggleMenu = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        setOpenMenuId(openMenuId === id ? null : id);
    };

    const handleSelectChat = (chat: any, conversationId: number) => {
        setActiveConversation({
            id: chat.conversationId,
            chatName: chat.chatName,
            isGroup: chat.isGroup,
            avatar: chat.avatar,
            friendshipStatus: chat.friendshipStatus ?? "NONE",
            canMessage: chat.canMessage ?? true,
            box: chat.box ?? computeBox(chat),
            otherUser: {id: chat.otherUserId, fullName: chat.otherUserName, avatar: chat.otherUserAvatar},
        });

        removeLocalUnread(conversationId);
        setLocalUnreadIds(getLocalUnread());

        queryClient.setQueryData(["conversations-paged"], (old: any) => {
            if (!old?.pages) return old;

            return {
                ...old,
                pages: old.pages.map((page: any) => ({
                    ...page,
                    items: page.items.map((c: any) =>
                        c.conversationId === conversationId ? {...c, unreadCount: 0} : c
                    )
                }))
            };
        });
    };

    useEffect(() => {
        if (!allConversations || allConversations.length === 0) return;

        const sendHeartbeat = () => {
            axiosClient.post("/presence/heartbeat").catch(() => {
            });
        };

        const checkFriendStatus = () => {
            const userIds = allConversations
                .map((c: any) => c.otherUser?.id || c.otherUserId)
                .filter((id: any) => id);

            if (userIds.length > 0) {
                const uniqueIds = Array.from(new Set(userIds));
                axiosClient.post("/presence/check", uniqueIds)
                    .then((res) => {
                        setOnlineStatusMap(prev => ({...prev, ...res.data}));
                    })
                    .catch(console.error);
            }
        };

        sendHeartbeat();
        checkFriendStatus();

        const heartbeatInterval = setInterval(sendHeartbeat, 30000);
        const checkInterval = setInterval(checkFriendStatus, 45000);

        return () => {
            clearInterval(heartbeatInterval);
            clearInterval(checkInterval);
        };
    }, [allConversations]);

    //  FIX: WebSocket - Move conversation to top
    useEffect(() => {
        const unsub = subscribe((payload: any) => {
            // Friend Event
            if (payload?.messageType === 7) {
                queryClient.invalidateQueries({queryKey: ["conversations-paged"]});
                return;
            }

            // Chat Event
            if (payload?.messageType === 1) {
                const convId = payload.conversationId;
                const isCurrentChat = activeConversation?.id && String(activeConversation.id) === String(convId);

                if (!isCurrentChat) {
                    addLocalUnread(convId);
                    setLocalUnreadIds(getLocalUnread());
                }

                if (payload.senderId) {
                    setOnlineStatusMap(prev => ({...prev, [payload.senderId]: true}));
                }

                //  MOVE to top
                queryClient.setQueryData(["conversations-paged"], (old: any) => {
                    if (!old?.pages || !Array.isArray(old.pages)) return old;

                    let targetConv: any = null;

                    // Xóa conversation khỏi vị trí cũ
                    const newPages = old.pages.map((page: any) => ({
                        ...page,
                        items: page.items.filter((c: any) => {
                            if (String(c.conversationId) === String(convId)) {
                                targetConv = c;
                                return false;
                            }
                            return true;
                        })
                    }));

                    if (!targetConv) {
                        setTimeout(() => {
                            queryClient.invalidateQueries({queryKey: ["conversations-paged"]});
                        }, 500);
                        return old;
                    }

                    // Update info
                    const newUnread = isCurrentChat ? 0 : (targetConv.unreadCount || 0) + 1;
                    const updatedConv = {
                        ...targetConv,
                        lastMessage: payload.content || "Tin nhắn mới",
                        lastMessageTime: payload.createdAt || new Date().toISOString(),
                        unreadCount: newUnread
                    };

                    // Thêm vào đầu page 1
                    if (newPages.length > 0 && newPages[0]) {
                        newPages[0] = {
                            ...newPages[0],
                            items: [updatedConv, ...newPages[0].items]
                        };
                    }

                    return {...old, pages: newPages};
                });
            }
        });

        return unsub;
    }, [subscribe, queryClient, activeConversation]);

    return (
        <div onClick={() => setOpenMenuId(null)} className="flex flex-col h-full">
            <div className="px-4 pt-3 pb-2">
                <div className="flex justify-between items-center mb-4">
                    <h1 className="text-2xl font-bold text-gray-900">Đoạn chat</h1>
                    <div className="flex space-x-2">
                        <IconButton icon={<BsThreeDots size={20}/>}/>
                        <div onClick={() => setIsModalOpen(true)}>
                            <IconButton icon={<BiEdit size={20}/>}/>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-lg"/>
                    <input
                        type="text"
                        placeholder="Search on Mess"
                        className="w-full bg-gray-100 text-gray-700 pl-10 pr-4 py-2 rounded-full outline-none focus:ring-1 focus:ring-blue-300 transition-all text-[15px]"
                    />
                </div>
            </div>

            <div className="px-4 pb-2">
                <div className="flex gap-2">
                    <button
                        className={`px-3 py-1.5 rounded-full text-sm ${tab === "PRIMARY" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                        onClick={() => setTab("PRIMARY")}
                    >
                        Hộp thư
                    </button>
                    <button
                        className={`px-3 py-1.5 rounded-full text-sm ${tab === "ANON" ? "bg-blue-600 text-white" : "bg-gray-100"}`}
                        onClick={() => setTab("ANON")}
                    >
                        Ẩn danh
                    </button>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 space-y-1 mt-2 custom-scrollbar">
                {isLoading ? (
                    <div className="text-center mt-5 text-gray-500">Đang tải ...</div>
                ) : (
                    <>
                        {filtered?.map((chat: any) => {
                            const isActive = activeConversation?.id === chat.conversationId;
                            const otherUserId = chat.otherUser?.id || chat.otherUserId;
                            const isOnline = onlineStatusMap[otherUserId];
                            const isUnread = (chat.unreadCount > 0) || localUnreadIds.includes(String(chat.conversationId));
                            const showBlueDot = !isActive && isUnread;

                            return (
                                <div
                                    key={chat.conversationId}
                                    onClick={() => handleSelectChat(chat, chat.conversationId)}
                                    className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors group ${isActive ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                                >
                                    <div className="relative flex-shrink-0 mr-3">
                                        <img
                                            src={chat.avatar || "https://i.pravatar.cc/150?img=3"}
                                            alt=""
                                            className="w-12 h-12 rounded-full object-cover"
                                        />
                                        {isOnline && (
                                            <span
                                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full z-10"></span>
                                        )}
                                        {!isOnline && chat.active && (
                                            <span
                                                className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-white border-2 rounded-full"></span>
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                            <h3 className={`text-[15px] truncate ${chat.active ? 'font-semibold' : 'text-gray-900'}`}>
                                                {chat.chatName}
                                            </h3>
                                        </div>
                                        <div className="flex items-center text-[13px] text-gray-500 truncate">
                                            <span className="text-[11px] text-gray-500 ml-2 flex-shrink-0">
                                                {chat.lastMessageTime ? formatDistanceToNow(new Date(chat.lastMessageTime), {
                                                    addSuffix: false,
                                                    locale: vi
                                                }) : ''}
                                            </span>
                                        </div>
                                        <div className="flex items-center text-[13px] text-gray-500 truncate">
                                            <span
                                                className={`truncate ${isActive || showBlueDot ? 'font-bold text-gray-900' : ''}`}>
                                                {chat.lastMessage}
                                            </span>
                                        </div>
                                    </div>

                                    {showBlueDot && (
                                        <div className="w-3 h-3 bg-blue-600 rounded-full ml-2 flex-shrink-0"></div>
                                    )}

                                    <div className="relative ml-2">
                                        <div
                                            onClick={(e) => toggleMenu(e, chat.conversationId)}
                                            className="p-2 hover:bg-gray-200 rounded-full text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                            <BsThreeDots size={20}/>
                                        </div>
                                        {openMenuId === chat.conversationId && (
                                            <div
                                                className="absolute right-0 top-8 w-48 bg-white shadow-xl border border-gray-100 rounded-lg z-50 overflow-hidden">
                                                <div
                                                    onClick={(e) => handleDeleteChat(e, chat.conversationId)}
                                                    className="w-full flex items-center px-4 py-3 text-sm text-red-600 hover:bg-red-50 text-left cursor-pointer"
                                                >
                                                    <BsTrash className="mr-2"/> Xóa đoạn chat
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {isFetchingNextPage && (
                            <div className="flex justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        )}

                        {!hasNextPage && filtered.length > 10 && (
                            <div className="text-center py-3 text-xs text-gray-400">
                                — Hết —
                            </div>
                        )}
                    </>
                )}
            </div>

            {isModalOpen && <NewChatModal onClose={() => setIsModalOpen(false)}/>}
        </div>
    );
};

export default ConversationList;

import {useMutation} from "@tanstack/react-query";
import {useState} from "react";
import {useChatStore} from "../../store/chat.store";

import {IoClose, IoSearch} from "react-icons/io5";
import {BsChatDots} from "react-icons/bs";
import toast from "react-hot-toast";
import axiosClientchatbe from "../../services/api/axiosClientchatbe";

interface UserResult {
    id: string;
    fullName: string;
    avatar: string;
    username?: string;
    friendshipStatus?: "NONE" | "PENDING_OUT" | "PENDING_IN" | "FRIEND" | "BLOCKED";
    canMessage?: boolean;
}

interface NewChatModalProps {
    onClose: () => void;
}

const NewChatModal = ({onClose}: NewChatModalProps) => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [search, setSearch] = useState(false);
    // const queryClient = useQueryClient();
    const {setActiveConversation} = useChatStore();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        setSearch(true);
        try {
            const res = await axiosClientchatbe.get(`/users/search?query=${encodeURIComponent(query)}`);
            setResults(res.data.data);
        } catch (error) {
            console.error("search error:", error);
            toast.error("Search lỗi. Xem console để biết chi tiết.");
        } finally {
            setSearch(false);
        }
    };

    const startChatMutation = useMutation({
        mutationFn: async (receiverId: string) => {
            const res = await axiosClientchatbe.post(`/conversations/start`, {receiverId});
            return res.data.data;
        },
        onError: (err: any) => {
            console.error("start chat error:", err);
            const msg = err?.response?.data?.message ?? "Không thể bắt đầu cuộc trò chuyện.";
            toast.error(msg);
        },
        // [FIX] Thêm tham số thứ 2 là variables (chính là receiverId truyền vào lúc gọi mutate)
        onSuccess: (newConversation: any, receiverId: string) => {

            // Tìm user trong list result (để lấy avatar/tên nếu API trả về thiếu)
            const receiver = results.find(u => u.id === receiverId);

            // Ưu tiên lấy thông tin từ API trả về (newConversation), nếu thiếu mới fallback sang receiver
            setActiveConversation({
                id: newConversation.conversationId,

                // Nếu API trả về chatName (thường là tên user kia), dùng luôn
                chatName: newConversation.chatName || receiver?.fullName || "Chat",

                // Avatar cũng vậy
                avatar: newConversation.avatar || receiver?.avatar,

                isGroup: false,
                friendshipStatus: newConversation.friendshipStatus || receiver?.friendshipStatus || "NONE",

                // Quan trọng: API đã trả về canMessage = true, phải ưu tiên dùng nó
                canMessage: newConversation.canMessage ?? receiver?.canMessage ?? true,

                // [QUAN TRỌNG NHẤT] Cấu trúc otherUser phải đúng ID
                otherUser: {
                    id: newConversation.otherUserId || receiverId, // API trả về otherUserId (xem log JSON của bạn)
                    fullName: newConversation.otherUserName || receiver?.fullName || "User",
                    avatar: newConversation.avatar || receiver?.avatar
                },
            });

            // Đóng modal để user chat luôn
            onClose();
        },
    });

    const addFriendMutation = useMutation({
        mutationFn: async (targetUserId: string) => {
            return axiosClientchatbe.post("/friends/request", {targetUserId});
        },
        onSuccess: (_res, targetUserId) => {
            setResults((prev) =>
                prev.map((u) => (u.id === targetUserId ? {...u, friendshipStatus: "PENDING_OUT"} : u))
            );
        },
        onError: (err: any) => {
            console.error("friends/request error:", err);
            const msg = err?.response?.data?.message ?? "Gửi lời mời kết bạn thất bại.";
            toast.error(msg);
        },
    });

    const cancelFriendMutation = useMutation({
        mutationFn: (targetUserId: string) => axiosClientchatbe.post("/friends/cancel", {targetUserId}),
        onSuccess: (_r, targetUserId) => {
            setResults((prev) =>
                prev.map((u) => (u.id === targetUserId ? {...u, friendshipStatus: "NONE"} : u))
            );
        },
        onError: (e: any) => {
            console.error("friends/cancel error:", e);
            toast.error(e?.response?.data?.message ?? "Hủy lời mời thất bại.");
        },
    });

    const acceptFriendMutation = useMutation({
        mutationFn: (requesterId: string) => axiosClientchatbe.post("/friends/accept", {requesterId}),
        onSuccess: (_r, requesterId) => {
            setResults((prev) =>
                prev.map((u) => (u.id === requesterId ? {...u, friendshipStatus: "FRIEND"} : u))
            );
        },
        onError: (e: any) => {
            console.error("friends/accept error:", e);
            toast.error(e?.response?.data?.message ?? "Chấp nhận kết bạn thất bại.");
        },
    });

    // Handler “chắc ăn”: chạy sớm + chặn bubble
    const safeAction = (e: React.SyntheticEvent, fn: () => void) => {
        e.preventDefault();
        e.stopPropagation();
        fn();
    };

    return (
        // Nếu app cha có onMouseDown đóng modal, cái này vẫn an toàn
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onMouseDown={(e) => {
                // click ra ngoài panel thì đóng
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-white rounded-xl w-[400px] max-h-[80vh] flex flex-col shadow-2xl"
                onMouseDown={(e) => e.stopPropagation()} // chặn đóng modal khi bấm trong panel
            >
                {/* header */}
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Tin nhắn mới</h2>
                    <button type="button" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
                        <IoClose size={24}/>
                    </button>
                </div>

                {/* search input */}
                <form onSubmit={handleSearch} className="p-3 border-b">
                    <div className="relative">
                        <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search User"
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                </form>

                {/* result list */}
                <div className="flex-1 overflow-y-auto p-2 min-h-[300px]">
                    {search ? (
                        <div className="text-center py-4 text-gray-500">Đang tìm ...</div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">Nhập tên để tìm kiếm</div>
                    ) : (
                        results.map((user) => {
                            const st = user.friendshipStatus ?? "NONE";
                            const showAddFriend = st === "NONE";
                            const showCancelRequest = st === "PENDING_OUT";
                            const showAccept = st === "PENDING_IN";
                            const canMessage = user.canMessage !== false;
                            const showMessage = canMessage && st !== "BLOCKED";

                            return (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg transition"
                                >
                                    <div className="flex items-center">
                                        <img
                                            src={user.avatar || "https://i.pravatar.cc/150?img=3"}
                                            className="w-10 h-10 rounded-full mr-3 object-cover"
                                            alt=""
                                        />
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                                            <p className="text-xs text-gray-500">@{user.username ?? "unknown"}</p>
                                            {/*<p className="text-[11px] text-gray-400">*/}
                                            {/*    {st === "FRIEND"*/}
                                            {/*        ? "Bạn bè"*/}
                                            {/*        : st === "PENDING_OUT"*/}
                                            {/*            ? "Đã gửi lời mời"*/}
                                            {/*            : st === "PENDING_IN"*/}
                                            {/*                ? "Chờ bạn xác nhận"*/}
                                            {/*                : st === "BLOCKED"*/}
                                            {/*                    ? "Bị chặn"*/}
                                            {/*                    : "Chưa kết bạn"}*/}
                                            {/*</p>*/}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {showMessage && (
                                            <button
                                                type="button"
                                                onPointerDown={(e) =>
                                                    safeAction(e, () => {
                                                        console.log("click message:", user.id);
                                                        startChatMutation.mutate(user.id);
                                                    })
                                                }
                                                className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition"
                                                title="Nhắn tin"
                                            >
                                                <BsChatDots size={18}/>
                                            </button>
                                        )}

                                        {!showAddFriend && (
                                            <button
                                                type="button"
                                                onPointerDown={(e) =>
                                                    safeAction(e, () => {
                                                        console.log("click add friend:", user.id);
                                                        addFriendMutation.mutate(user.id);
                                                    })
                                                }
                                                disabled={addFriendMutation.isPending}
                                                className="px-3 py-1.5 text-sm rounded-full bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {addFriendMutation.isPending ? "Đang gửi..." : "Kết bạn"}
                                            </button>
                                        )}

                                        {showCancelRequest && (
                                            <button
                                                type="button"
                                                onPointerDown={(e) =>
                                                    safeAction(e, () => {
                                                        console.log("click cancel:", user.id);
                                                        cancelFriendMutation.mutate(user.id);
                                                    })
                                                }
                                                disabled={cancelFriendMutation.isPending}
                                                className="px-3 py-1.5 text-sm rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Hủy lời mời
                                            </button>
                                        )}

                                        {showAccept && (
                                            <button
                                                type="button"
                                                onPointerDown={(e) =>
                                                    safeAction(e, () => {
                                                        console.log("click accept:", user.id);
                                                        acceptFriendMutation.mutate(user.id);
                                                    })
                                                }
                                                disabled={acceptFriendMutation.isPending}
                                                className="px-3 py-1.5 text-sm rounded-full bg-amber-100 text-amber-800 hover:bg-amber-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Chấp nhận
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default NewChatModal;

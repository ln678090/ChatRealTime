import {useMutation, useQueryClient} from "@tanstack/react-query";
import {useState} from "react";
import {useChatStore} from "../../store/chat.store";
import axiosClient from "../../services/api/axiosClient";
import {IoClose, IoSearch} from "react-icons/io5";
import {BsChatDots} from "react-icons/bs";


interface UserResult {
    id: string;
    fullName: string;
    avatar: string;

}

interface NewChatModalProps {
    onClose: () => void;
}

const NewChatModal = ({onClose}: NewChatModalProps) => {

    const [query, setQuery] = useState("");
    const [results, setResults] = useState<UserResult[]>([]);
    const [search, SetSearch] = useState(false);
    const queryClient = useQueryClient();

    const {setActiveConversation} = useChatStore();

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;
        SetSearch(true);
        try {
            const res = await axiosClient.get(`/users/search?query=${query}`);
            setResults(res.data.data);
        } catch (error) {
            console.log(error);
        } finally {
            SetSearch(false);
        }
    };
    // Mutation bắt đầu chat
    const startSchatMutation = useMutation({
        mutationFn: async (receiverId: string) => {
            const res = await axiosClient.post(`/conversations/start`, {
                receiverId
            });
            return res.data.data;
        },
        onSuccess: (newConversation) => {
            // Refresh list chat
            queryClient.invalidateQueries({queryKey: ['conversations']});
            // Set active ngay lập tức để mở cửa sổ chat

            setActiveConversation({
                id: newConversation.conversationId,
                chatName: newConversation.chatName,
                avatar: newConversation.avatar,
                isGroup: false
            });
            onClose();

        }
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl w-[400px] max-h-[80vh] flex flex-col shadow-2xl">
                {/* header */}
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-lg font-bold">Tin nhắn mới</h2>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-100 rounded-full">
                        <IoClose size={24}/>
                    </button>
                </div>
                {/* search input  */}

                <form onSubmit={handleSearch} className="p-3 border-b">
                    <div className="relative">
                        <IoSearch
                            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search User"
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-lg outline-none focus:right-1 focus:ring-blue-500"
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
                        <div className="text-center py-4 text-gray-500">Nhận tên để tim kiếm</div>
                    ) : (
                        results.map(user => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-100 rounded-lg transition group"
                            >

                                <div className="flex items-center">
                                    <img src={user.avatar || "https://i.pravatar.cc/150?img=3"}
                                         className="w-10 h-10 rounded-full mr-3 object-cover"/>
                                    <div>
                                        <h3 className="font-semibold text-gray-900">{user.fullName}</h3>
                                        <p className="text-xs text-gray-500">@{user.username}</p>
                                    </div>
                                </div>


                                <div>
                                    <button
                                        onClick={() => startSchatMutation.mutate(user.id)}
                                        className="p-2 bg-blue-100 text-blue-600 rounded-full hover:bg-blue-200 transition"
                                        title="Nhắn tin"
                                    >
                                        <BsChatDots size={18}/>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};


export default NewChatModal;
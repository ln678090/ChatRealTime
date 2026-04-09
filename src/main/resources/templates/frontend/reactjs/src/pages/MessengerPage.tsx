// src/pages/MessengerPage.tsx
import LogoCustom from "../components/compoment/LogoCustom";
import {GoHomeFill} from "react-icons/go";
import {HiOutlineVideoCamera} from "react-icons/hi";
import {BsShop} from "react-icons/bs";
import {RiArchiveDrawerLine} from "react-icons/ri";
import NavItem from "../components/compoment/NavItem";
import {FaCog} from "react-icons/fa";
import {BiLogOut} from "react-icons/bi";
import ConversationList from "../components/Chat/ConversationList";
import ChatWindow from "../components/Chat/ChatWindow";
import {AiChatPanel} from "../components/AiChatPanel"; // ← MỚI
import SettingsModal from "../components/settings/SettingsModal";
import '../assets/CustomScrollbar.css';
// import {useChatStore} from "../store/chat.store";
import {useAuthStore} from "../store/auth.store";
import {useState} from "react";
import {useAuth} from "../auth.useAuth.ts";
import {Link} from "react-router-dom";
import {FiShield} from "react-icons/fi";
import withReactContent from "sweetalert2-react-content";
import Swal from "sweetalert2";

const MessengerPage = () => {
    // const {activeConversation} = useChatStore();
    const {user, logout} = useAuthStore();
    const {isAdmin} = useAuth();
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAiChat, setShowAiChat] = useState(false);   // ← MỚI
    const MySwal = withReactContent(Swal);
    // const handleLogout = () => {

    // };

    const handleLogout = () => {
        MySwal.fire({
            title: 'Xác nhận đăng xuất',
            text: "Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33', // Màu đỏ cho nút đăng xuất
            cancelButtonColor: '#3085d6', // Màu xám/xanh cho nút huỷ
            confirmButtonText: 'Có, đăng xuất!',
            cancelButtonText: 'Huỷ'
        }).then((result) => {
            if (result.isConfirmed) {

                logout();
            }
        });
    };
    return (
        <div
            className="flex h-screen bg-white overflow-hidden"
            onClick={() => setShowUserMenu(false)}
        >
            {/* ── Thanh điều hướng trái ── */}
            <nav
                onClick={(e) => e.stopPropagation()}
                className="w-[72px] flex flex-col items-center py-4 border-r border-gray-200 h-full z-20 shadow-sm bg-white justify-between relative"
            >
                <div className="flex flex-col items-center space-y-6 w-full">
                    {/* Logo */}
                    <div className="mb-2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition">
                        <LogoCustom/>
                    </div>

                    {/* Nav items */}
                    <div className="flex flex-col space-y-2 w-full px-2">
                        <NavItem icon={<GoHomeFill size={26}/>} active={!showAiChat}/>
                        <NavItem icon={<HiOutlineVideoCamera size={26}/>}/>
                        <NavItem icon={<BsShop size={24}/>}/>
                        <NavItem icon={<RiArchiveDrawerLine size={24}/>}/>

                        {/* ── AI Chat Button ── */}
                        <button
                            onClick={() => setShowAiChat((v) => !v)}
                            title="AI Assistant"
                            className={`
                                w-full flex items-center justify-center p-2 rounded-xl transition-all
                                ${showAiChat
                                ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-md'
                                : 'hover:bg-gray-100 text-gray-500'
                            }
                            `}
                        >
                            <span className="text-2xl">🤖</span>
                        </button>
                    </div>
                </div>
                {isAdmin && (
                    <div className="w-full  pt-4 border-t border-gray-200">
                        <Link
                            to="/admin"
                            className="
                group relative flex items-center justify-center gap-2
                py-2.5 rounded-xl
                bg-gradient-to-br from-indigo-500 via-blue-600 to-purple-600
                text-white font-semibold text-sm
                shadow-md
                hover:shadow-lg hover:scale-105
                active:scale-95
                transition-all duration-200
            "
                        >
                            <FiShield
                                size={18}
                                className="group-hover:rotate-6 transition-transform duration-200"
                            />
                            Admin
                        </Link>
                    </div>
                )}
                {/* Avatar & Settings */}
                <div className="flex flex-col items-center space-y-5 pb-4 relative">
                    <div
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowSettings(true);
                        }}
                        className="p-2 rounded-full hover:bg-gray-100 cursor-pointer text-gray-500 transition"
                        title="Cài đặt"
                    >
                        <FaCog size={24}/>
                    </div>

                    {/* Avatar */}
                    <div
                        className="relative cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowUserMenu(!showUserMenu);
                        }}
                    >
                        <img
                            src={user?.avatar || "https://i.pravatar.cc/150?img=11"}
                            alt={user?.fullName || "User"}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200 hover:ring-2 hover:ring-blue-500 transition"
                        />
                        <span
                            className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"/>
                    </div>

                    {/* Menu đăng xuất */}
                    {showUserMenu && (
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="absolute bottom-2 left-14 w-60 bg-white shadow-2xl border border-gray-100 rounded-xl z-50 overflow-hidden animate-fade-in-up"
                        >
                            <div className="px-4 py-3 border-b bg-gray-50">
                                <p className="text-sm font-bold text-gray-900 truncate">
                                    {user?.fullName || "Người dùng"}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {user?.email || "Chưa cập nhật email"}
                                </p>
                            </div>
                            <div className="py-1">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowSettings(true);
                                        setShowUserMenu(false);
                                    }}
                                    className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2 transition-colors"
                                >
                                    <FaCog size={18}/> Cài đặt tài khoản
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                                >
                                    <BiLogOut size={18}/> Đăng xuất
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </nav>

            {/* ── Main area ── */}
            <div className="flex-1 h-screen flex overflow-hidden">
                {showAiChat ? (
                    // ── AI Chat mode: full width ──
                    <div className="flex-1 flex flex-col">
                        {/* Header AI */}
                        <div className="flex items-center gap-3 px-4 py-3 border-b bg-white">
                            <button
                                onClick={() => setShowAiChat(false)}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition"
                                title="Quay lại"
                            >
                                ←
                            </button>
                            <span className="text-xl">🤖</span>
                            <div>
                                <p className="font-semibold text-gray-900">AI Assistant</p>
                                <p className="text-xs text-gray-400">Powered by lâm</p>
                            </div>
                        </div>
                        {/* AI Chat Panel chiếm toàn bộ phần còn lại */}
                        <div className="flex-1 overflow-hidden">
                            <AiChatPanel/>
                        </div>
                    </div>
                ) : (
                    // ── Chat mode thường ──
                    <>
                        <aside className="w-[380px] h-screen border-r bg-white flex-shrink-0">
                            <ConversationList/>
                        </aside>
                        <main className="flex-1 h-screen bg-gray-50 overflow-hidden">
                            <ChatWindow/>
                        </main>
                    </>
                )}
            </div>

            <SettingsModal
                isOpen={showSettings}
                onClose={() => setShowSettings(false)}
            />
        </div>
    );
};

export default MessengerPage;

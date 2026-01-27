import LogoCustom from "../components/compoment/LogoCustom"
import {GoHomeFill} from "react-icons/go";
import {HiOutlineVideoCamera} from "react-icons/hi";
import {BsShop} from "react-icons/bs";
import {RiArchiveDrawerLine} from "react-icons/ri";
import NavItem from "../components/compoment/NavItem";
import {FaCog} from "react-icons/fa";
import ConversationList from "../components/Chat/ConversationList";
import ChatWindow from "../components/Chat/ChatWindow";
import '../assets/CustomScrollbar.css';
// import NavItem from "../components/compoment/NavItem";
const MessengerPage = () => {
    return (
        <div className="flex h-screen bg-white overflow-hidden">
            {/* thanh dieu huong left */}
            <nav
                className="w-[72px] flex flex-col items-center py-4 border-r border-gray-200    h-full z-20 shadow-sm bg-white justify-between">
                {/* top icon */}
                <div className="flex flex-col items-center space-y-6 w-full">
                    {/* logo */}
                    <div className="mb2 p-2 rounded-lg hover:bg-gray-100 cursor-pointer transition  ">
                        <LogoCustom/>
                    </div>
                    {/* nav item */}
                    <div className="flex flex-col space-y-2 w-full px-2">
                        <NavItem icon={<GoHomeFill size={26}/>} active={true}/>
                        <NavItem icon={<HiOutlineVideoCamera size={26}/>}/>
                        <NavItem icon={<BsShop size={24}/>}/>
                        <NavItem icon={<RiArchiveDrawerLine size={24}/>}/>
                    </div>
                </div>
                {/* (Avatar & Settings) */}
                <div className="flex flex-col items-center space-y-5 pb-2">
                    <div className="p-2 rounded-full hover:bg-gray-100 cursor-pointer text-gray-500">
                       {/* icon seting */}
                        <FaCog size={24}/>
                    </div>
                    <div className="relative cursor-pointer">
                        {/* avatar */}
                        <img src="https://i.pravatar.cc/150?img=11" alt="User" className=" 
                        w-9 h-9 rounded-full object-cover border border-gray-200" />
                       {/* status */}
                    <span className=" absolute bottom-0 right-0 w-3 h-3 bg-red-500 border-2 border-white rounded-full"></span>
                    </div>
                </div>
            </nav>
            {/* danh sach chat */}
            <div className="w-[360px] h-full border-r border-gray-200 flex-shrink-0 bg-white">
                <ConversationList/>
            </div>
            {/* cua so chat chinh  */}
            <div className="flex-1 h-full min-w-0 bg-white">
                 <ChatWindow />
            </div>
        </div>
    );
};
export default MessengerPage
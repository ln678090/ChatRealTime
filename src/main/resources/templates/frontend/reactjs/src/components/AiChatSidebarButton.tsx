// src/components/AiChatSidebarButton.tsx
interface Props {
    isActive: boolean;
    onClick: () => void;
}

export function AiChatSidebarButton({isActive, onClick}: Props) {
    return (
        <button
            onClick={onClick}
            className={`
                w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors
                ${isActive
                ? 'bg-blue-50 text-blue-600'
                : 'hover:bg-gray-100 text-gray-700'
            }
            `}
        >
            <div className={`
                w-12 h-12 rounded-full flex items-center justify-center text-xl flex-shrink-0
                bg-gradient-to-br from-blue-500 to-purple-600
            `}>
                🤖
            </div>
            <div className="flex-1 text-left min-w-0">
                <p className="font-semibold text-sm">AI Assistant</p>
                <p className="text-xs text-gray-400 truncate">Powered by lâm</p>
            </div>
            {isActive && (
                <div className="w-2 h-2 rounded-full bg-blue-500"/>
            )}
        </button>
    );
}

export const getDomain = () => import.meta.env.VITE_API_URL || "http://localhost:8808";
export const getBinaryChatDomain = () => import.meta.env.VITE_BINARY_CHAT_URL || "ws://localhost:8808/ws-binary-chat";
// export const getDomain = () => import.meta.env.VITE_API_URL || "https://fax-trading-hans-processes.trycloudflare.com";
// export const getBinaryChatDomain = () => import.meta.env.VITE_BINARY_CHAT_URL || "ws://localhost:8808/ws-binary-chat";
export const getConnectHubApiUrl = () => import.meta.env.VITE_CONNECTHUB_API_URL || "http://localhost:8809";
export const getConnectHubFrontendUrl = () => import.meta.env.VITE_CONNECTHUB_FE_URL || "http://localhost:5274";
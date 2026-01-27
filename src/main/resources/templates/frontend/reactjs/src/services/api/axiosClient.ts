import axios, {type AxiosError, type InternalAxiosRequestConfig} from "axios";
import {useAuthStore} from "../../store/auth.store.ts";

const baseURL = import.meta.env.VITE_API_URL || "http://localhost:8808/api";
export const axiosClient = axios.create(
    {
        baseURL,
        headers: {
            'Content-Type': 'application/json'
        },
        withCredentials: true // Quan trọng: Để cookie refresh token được gửi đi
    }
);

// gắn access token vào all req
axiosClient.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;//  lấy token từ ram :)
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            delete config.headers.Authorization; // tránh dính token cũ
        }
        return config;
    },
    (error: any) => Promise.reject(error)
);
type FailedRequest = {
    resolve: (token: string) => void;
    reject: (err: any) => void;
};
// khi token hết hạn Xử lý lỗi 401 (Token hết hạn) & Refresh Token tự động
let isRefreshing: boolean = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: any, token?: string) => {
    failedQueue.forEach(p => {
        if (error) {
            p.reject(error);
        } else if (token) {
            p.resolve(token);
        }
    });
    failedQueue = [];
};

const refreshAccessToken = async (): Promise<string> => {
    const resp = await axiosClient.post("/auth/refresh-token");
    const accessToken = resp?.data?.data?.accessToken ?? resp?.data?.accessToken ?? null;
    if (!accessToken || typeof accessToken !== "string") {
        throw new Error("Refresh response does not contain accessToken");
    }
    useAuthStore.getState().setAccessToken(accessToken);
    return accessToken;
};

axiosClient.interceptors.response.use(
    (resp) => resp,
    async (error: AxiosError) => {


        // Không có response => lỗi mạng
        if (!error.response) return Promise.reject(error);
        const originalRequest: any = error.config;
        const status = error.response.status;

        // Không refresh cho chính endpoint refresh/login/logout để tránh loop
        const url: string = originalRequest?.url || "";

        const isAuthEndpoint =
            url.includes("/auth/refresh-token") ||
            url.includes("/auth/login") ||
            url.includes("/auth/logout");

        if (status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
            if (isRefreshing) {
                // đang refresh => xếp hàng
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token: string) => {
                            originalRequest.headers.Authorization = `Bearer ${token}`;
                            resolve(axiosClient(originalRequest))
                        },
                        reject,
                    });
                });
            }
            originalRequest._retry = true;
            isRefreshing = true;
            try {
                const newAccessToken = await refreshAccessToken();

                processQueue(null, newAccessToken);// giải phóng hàng đợi

                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`; // retry request ban đầu
                return axiosClient(originalRequest);
            } catch (err) {
                processQueue(err, undefined);
                useAuthStore.getState().setAccessToken(null); // clear RAM token

                window.location.href = "/auth";
                return Promise.reject(err);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);

    }
);
export default axiosClient;
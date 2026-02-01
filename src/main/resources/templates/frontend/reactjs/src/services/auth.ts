import axiosClient from "./api/axiosClient.ts";
import {useAuthStore} from "../store/auth.store.ts";
import {getApiErrorMessage} from "../utils/getApiErrorMessage.tsx";
//set token vào RAM khi login 
export const loginAndGetAccessToken = async (email: string, password: string, rememberMe: boolean) => {
    try {

        const res = await axiosClient.post("/auth/login", {email, password, rememberMe})
        const resUser = await axiosClient.get("/users/me");


        const accessToken = res?.data?.data?.accessToken ?? res?.data?.accessToken ?? null;
        useAuthStore.getState().setAccessToken(accessToken);
        const user = resUser?.data?.data ?? resUser?.data ?? null;
        useAuthStore.getState().setUser(user);
        return res.data;
    } catch (err) {
        return getApiErrorMessage(err);
    }

};

export type RegisterPayload = {
    username: string;
    password: string;
    email: string;
    fullName: string;
    address?: string;
};

export const registerAndGetAccessToken = async (payload: RegisterPayload) => {
    try {
        const res = await axiosClient.post("/auth/register", payload);

        const accessToken =
            res?.data?.data?.accessToken ?? res?.data?.accessToken ?? null;

        useAuthStore.getState().setAccessToken(accessToken);

        return res.data;
    } catch (err) {
        return getApiErrorMessage(err);
    }
};
  
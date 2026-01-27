import axios from "axios";

export function getApiErrorMessage(err: unknown): string {
    if (!axios.isAxiosError(err)) return "Có lỗi xảy ra";

    const data = err.response?.data as any;

    // ApiResp của bạn
    // const msg =
    //     data?.message ||
    //     data?.error ||
    //     data?.title ||
    //     (typeof data === "string" ? data : null);

    return data;
}

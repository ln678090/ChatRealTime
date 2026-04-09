import {useMemo, useState} from "react";
import LogoCustom from "../components/compoment/LogoCustom.tsx";
import {FaEye, FaEyeSlash} from "react-icons/fa";
import bgImage from "../assets/backgoundlogin.png";
import {loginAndGetAccessToken, registerAndGetAccessToken} from "../services/auth.ts";
import {useAuthStore} from "../store/auth.store.ts";
import axiosClient from "../services/api/axiosClient.ts";
import toast from "react-hot-toast";
import {GoogleLogin} from "@react-oauth/google";

type Mode = "login" | "register";
type LoginForm = { email: string; password: string; rememberMe: boolean };
type RegisterForm = { username: string; email: string; password: string; fullName: string; address: string };
type FieldErrors = Partial<Record<keyof (LoginForm & RegisterForm), string>> & { _form?: string };

const LoginPage = () => {

    const {setAccessToken, setUser, setAuthReady} = useAuthStore();

    const [mode, setMode] = useState<Mode>("login");


    const [loginForm, setLoginForm] = useState<LoginForm>({
        email: "",
        password: "",
        rememberMe: false,
    });

    const [registerForm, setRegisterForm] = useState<RegisterForm>({
        username: "",
        email: "",
        password: "",
        fullName: "",
        address: "",
    });

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<FieldErrors>({});
    const [serverError, setServerError] = useState<string>("");
    const [loading, setLoading] = useState(false);


    const handleGoogleSuccess = async (credentialResponse: any) => {
        try {
            setLoading(true);
            const res = await axiosClient.post('/auth/login/google', {
                idToken: credentialResponse.credential
            });

            const newAccessToken = res.data?.data?.token || res.data?.accessToken;

            // Cập nhật Zustand Store
            if (newAccessToken) {
                setAccessToken(newAccessToken);
            }
            if (res.data?.data?.user || res.data?.user) {
                setUser(res.data.data.user || res.data.user);
            }
            setAuthReady(true);

            toast.success("Đăng nhập Google thành công!");

            // Ép trình duyệt chuyển trang cứng (Hard Redirect).
            // Cách này 100% sẽ hoạt động và xóa rác của Google OAuth popup
            setTimeout(() => {
                window.location.href = "/";
            }, 300); // Delay nhẹ 300ms để Toast kịp hiện lên

        } catch (err: any) {
            console.error('Google login API failed', err);
            if (err.response?.status === 403) {
                toast.error(err.response?.data?.message || 'Tài khoản của bạn đã bị vô hiệu hóa.');
            } else {
                toast.error('Có lỗi xảy ra khi xác thực với máy chủ.');
            }
        } finally {
            setLoading(false);
        }
    };

    const applyApiErrors = (apiRes: any) => {
        setErrors({});
        setServerError("");

        if (apiRes?.message === "Validation failed" && apiRes?.data && typeof apiRes.data === "object") {
            setErrors(apiRes.data);
            return true;
        }

        if (apiRes?.message && apiRes?.code !== "success") {
            setServerError(apiRes.message);
            return true;
        }

        return false;
    };

    const validateLogin = (v: LoginForm) => {
        const next: FieldErrors = {};
        if (!v.email.trim()) next.email = "Vui lòng nhập Email";
        if (!v.password) next.password = "Vui lòng nhập Password";
        return next;
    };

    const validateRegister = (v: RegisterForm) => {
        const next: FieldErrors = {};
        if (!v.username.trim()) next.username = "Vui lòng nhập Username";
        if (!v.email.trim()) next.email = "Vui lòng nhập Email";
        if (!v.password) next.password = "Vui lòng nhập Password";
        if (!v.fullName.trim()) next.fullName = "Vui lòng nhập Họ tên";
        return next;
    };

    const submitDisabled = useMemo(() => {
        if (loading) return true;
        if (mode === "login") {
            return !loginForm.email.trim() || !loginForm.password;
        }
        return (
            !registerForm.username.trim() ||
            !registerForm.email.trim() ||
            !registerForm.password ||
            !registerForm.fullName.trim()
        );
    }, [mode, loading, loginForm, registerForm]);

    // ==========================================
    // 2. LUỒNG ĐĂNG NHẬP EMAIL / ĐĂNG KÝ
    // ==========================================
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setServerError("");
        setErrors({});

        const feErrs = mode === "login" ? validateLogin(loginForm) : validateRegister(registerForm);
        if (Object.keys(feErrs).length) {
            setErrors(feErrs);
            return;
        }

        try {
            setLoading(true);

            if (mode === "login") {
                const data = await loginAndGetAccessToken(loginForm.email, loginForm.password, loginForm.rememberMe);

                const handled = applyApiErrors(data);
                if (handled) return;

                if (data?.message === "Bad credentials" || data?.message === "Wrong account or password") {
                    setServerError("Sai email hoặc mật khẩu. Vui lòng thử lại.");
                    return;
                }

                toast.success("Đăng nhập thành công!");
                setTimeout(() => {
                    window.location.href = "/";
                }, 300);
                return;
            }

            // Register
            const data = await registerAndGetAccessToken({
                username: registerForm.username,
                email: registerForm.email,
                password: registerForm.password,
                fullName: registerForm.fullName,
                address: registerForm.address,
            });

            const handled = applyApiErrors(data);
            if (handled) return;

            toast.success("Đăng ký thành công!");
            setTimeout(() => {
                window.location.href = "/";
            }, 300);

        } catch {
            setServerError("Có lỗi xảy ra. Vui lòng thử lại sau.");
        } finally {
            setLoading(false);
        }
    };

    const switchMode = (m: Mode) => {
        setMode(m);
        setErrors({});
        setServerError("");
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-no-repeat bg-cover bg-center"
             style={{backgroundImage: `url(${bgImage})`}}>
            <div className="max-w-6xl w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-20">

                {/* Left */}
                <div
                    className="text-center lg:text-left flex-1 space-y-4 p-6 rounded-2xl bg-white/75 backdrop-blur-md border border-white/40 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                    <div className="inline-block"><LogoCustom/></div>
                    <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter leading-tight bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 bg-clip-text text-transparent pb-2">
                        Hang out <br/> anytime, anywhere
                    </h1>
                    <p className="text-lg lg:text-xl text-gray-600 max-w-lg mx-auto lg:mx-0 font-normal">
                        makes it easy and fun to stay close to your favorite people.
                    </p>
                </div>

                {/* Right */}
                <div className="w-full max-w-md flex-shrink-0">
                    <div className="bg-white rounded-xl shadow-lg p-8 sm:p-10">

                        {/* Tabs */}
                        <div className="lg:flex justify-center mb-8">
                            <h1 className="inline-block text-5xl lg:text-7xl font-extrabold tracking-tight leading-[1.15] pb-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-[length:200%_200%] bg-clip-text text-transparent animate-gradient">
                                {mode === "login" ? "Login" : "Register"}
                            </h1>
                        </div>

                        <div className="flex gap-2 mb-6">
                            <button type="button" onClick={() => switchMode("login")}
                                    className={`flex-1 py-2 rounded-xl font-semibold ${mode === "login" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                Login
                            </button>
                            <button type="button" onClick={() => switchMode("register")}
                                    className={`flex-1 py-2 rounded-xl font-semibold ${mode === "register" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}>
                                Register
                            </button>
                        </div>

                        {/* Global server error */}
                        {serverError && (
                            <div
                                className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                                {serverError}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* REGISTER fields */}
                            {mode === "register" && (
                                <>
                                    <div>
                                        <input value={registerForm.username} onChange={(e) => setRegisterForm((p) => ({
                                            ...p,
                                            username: e.target.value
                                        }))} placeholder="Username"
                                               className={`w-full px-4 py-3.5 rounded-md border outline-none transition-all text-base ${errors.username ? "border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}/>
                                        {errors.username &&
                                            <p className="mt-1 text-sm text-red-600">{errors.username}</p>}
                                    </div>
                                    <div>
                                        <input value={registerForm.fullName} onChange={(e) => setRegisterForm((p) => ({
                                            ...p,
                                            fullName: e.target.value
                                        }))} placeholder="Full name"
                                               className={`w-full px-4 py-3.5 rounded-md border outline-none transition-all text-base ${errors.fullName ? "border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}/>
                                        {errors.fullName &&
                                            <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
                                    </div>
                                    <div>
                                        <input value={registerForm.address} onChange={(e) => setRegisterForm((p) => ({
                                            ...p,
                                            address: e.target.value
                                        }))} placeholder="Address (optional)"
                                               className="w-full px-4 py-3.5 rounded-md border border-gray-300 outline-none transition-all text-base focus:ring-blue-500 focus:border-blue-500"/>
                                    </div>
                                </>
                            )}

                            {/* Common: Email */}
                            <div>
                                <input type="text" placeholder="Email"
                                       value={mode === "login" ? loginForm.email : registerForm.email}
                                       onChange={(e) => {
                                           const v = e.target.value;
                                           if (mode === "login") setLoginForm((p) => ({
                                               ...p,
                                               email: v
                                           })); else setRegisterForm((p) => ({...p, email: v}));
                                       }}
                                       className={`w-full px-4 py-3.5 rounded-md border outline-none transition-all text-base ${errors.email ? "border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}/>
                                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                            </div>

                            {/* Common: Password */}
                            <div className="relative">
                                <input type={showPassword ? "text" : "password"} placeholder="Password"
                                       value={mode === "login" ? loginForm.password : registerForm.password}
                                       onChange={(e) => {
                                           const v = e.target.value;
                                           if (mode === "login") setLoginForm((p) => ({
                                               ...p,
                                               password: v
                                           })); else setRegisterForm((p) => ({...p, password: v}));
                                       }}
                                       className={`w-full px-4 py-3.5 rounded-md border outline-none transition-all text-base ${errors.password ? "border-red-500" : "border-gray-300 focus:ring-blue-500 focus:border-blue-500"}`}/>
                                <button type="button"
                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                        onClick={() => setShowPassword((s) => !s)}>
                                    {showPassword ? <FaEyeSlash size={20}/> : <FaEye size={20}/>}
                                </button>
                                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
                            </div>

                            {/* Login-only remember me */}
                            {mode === "login" && (
                                <div className="flex items-center justify-between pt-2">
                                    <label className="flex items-center gap-2">
                                        <input type="checkbox" checked={loginForm.rememberMe}
                                               onChange={(e) => setLoginForm((p) => ({
                                                   ...p,
                                                   rememberMe: e.target.checked
                                               }))}
                                               className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"/>
                                        <span className="text-gray-500 text-sm">Remember me</span>
                                    </label>
                                    <a href="#" className="text-blue-600 hover:underline text-sm font-medium">Forgot
                                        password?</a>
                                </div>
                            )}

                            <button
                                className={`w-full text-white font-bold text-xl py-3 rounded-2xl transition-colors mt-2 ${submitDisabled ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"}`}
                                type="submit" disabled={submitDisabled}>
                                {loading ? "Please wait..." : mode === "login" ? "Log In" : "Create Account"}
                            </button>

                            {/* HOẶC LOGIN GOOGLE */}
                            {mode === "login" && (
                                <>
                                    <div className="my-4 flex items-center">
                                        <hr className="flex-grow border-gray-300"/>
                                        <span className="px-3 text-gray-400 text-sm">HOẶC</span>
                                        <hr className="flex-grow border-gray-300"/>
                                    </div>
                                    <div className="flex justify-center w-full">
                                        <GoogleLogin
                                            onSuccess={handleGoogleSuccess}
                                            onError={() => {
                                                toast.error('Đăng nhập Google thất bại');
                                            }}
                                            useOneTap
                                            shape="rectangular"
                                            theme="outline"
                                            text="signin_with"
                                        />
                                    </div>
                                </>
                            )}
                        </form>
                    </div>
                </div>
            </div>
            <div className="absolute bottom-4 w-full text-center text-xs text-gray-400 hidden lg:block">
                Create At: Nguyen Phuc Lam-PN00273
            </div>
        </div>
    );
};

export default LoginPage;

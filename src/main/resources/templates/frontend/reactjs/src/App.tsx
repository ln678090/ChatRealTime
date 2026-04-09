import './App.css'
import {Navigate, Route, Routes} from "react-router-dom";
import AuthPage from "./pages/AuthPage.tsx";
import MessengerPage from "./pages/MessengerPage.tsx";
import PrivateRoute from "./PrivateRoute.tsx";
import {WebSocketProvider} from "./context/WebSocketContext.tsx";
import {GlobalFriendEventListener} from "./components/GlobalFriendEventListener.tsx";
import {AdminGuard} from "./admin/auth/AdminGuard.tsx";
import {AdminLayout} from "./admin/layouts/AdminLayout.tsx";
import {UsersPage} from "./admin/pages/UsersPage.tsx";
import {BlacklistPage} from "./admin/pages/BlacklistPage.tsx";
import {Toaster} from "react-hot-toast";
// import {GlobalCallListener} from "./components/chat/GlobalCallListener";
import {GoogleOAuthProvider} from "@react-oauth/google";
import { GlobalCallListener } from './components/Chat/GlobalCallListener.tsx';


const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function App() {
    return (
        // 2. BỌC GoogleOAuthProvider BAO TRÙM TẤT CẢ ROUTES
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
            <div>
                <Toaster/>

                <Routes>

                    <Route path={'/auth'} element={<AuthPage/>}/>

                    <Route path={'/'} element={
                        <PrivateRoute>
                            <WebSocketProvider>
                                <GlobalFriendEventListener/>
                                <GlobalCallListener/>
                                <MessengerPage/>
                            </WebSocketProvider>
                        </PrivateRoute>
                    }/>

                    {/* Admin Protected Routes */}
                    <Route element={<AdminGuard/>}>
                        <Route element={<AdminLayout/>}>
                            <Route path="/admin" element={<Navigate to="/admin/users" replace/>}/>
                            <Route path="/admin/users" element={<UsersPage/>}/>
                            <Route path="/admin/blacklist" element={<BlacklistPage/>}/>
                        </Route>
                    </Route>

                    <Route path="*" element={<Navigate to="/" replace/>}/>
                </Routes>
            </div>
        </GoogleOAuthProvider>
    )
}

export default App

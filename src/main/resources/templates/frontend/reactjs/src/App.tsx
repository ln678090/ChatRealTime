import './App.css'

import {Navigate, Route, Routes} from "react-router-dom";
import AuthPage from "./pages/AuthPage.tsx";
import MessengerPage from "./pages/MessengerPage.tsx";
import PrivateRoute from "./PrivateRoute.tsx";


function App() {
    // const [count, setCount] = useState(0)

    return (

        <Routes>
            <Route path={'/auth'} element={<AuthPage/>}/>
       

            <Route path={'/'} element={
                <PrivateRoute>
                    <MessengerPage/>
                </PrivateRoute>
            }/>

            <Route path="*" element={<Navigate to="/" replace/>}/>
        </Routes>


    )
}

export default App

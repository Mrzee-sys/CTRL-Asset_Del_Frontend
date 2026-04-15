import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";

import Home from "./pages/Home/Home";
import ComputerRegister from "./pages/ComputerRegister/ComputerRegister";
import ComputerCard from "./pages/ComputerRegister/ComputerCard";
// ✅ Add the ServerCard import here
import ServerCard from "./pages/ComputerRegister/ServerCard"; 

import PeporgRegister from "./pages/PeporgRegister/PeporgRegister";
import PeporgCard from "./pages/PeporgRegister/PeporgCard";
import Peoplecards from "./pages/PeporgRegister/Peoplecards";
import PeopleDashboard from "./pages/PeporgRegister/PeopleDashboard";

import IncidentManRegister from "./pages/IncidentRegister/IncidentManRegister";
import IncidentCard from "./pages/IncidentRegister/IncidentCard";

import pageBg from "./assets/PageBackground.png";
import defaultLogo from "./assets/logos/DefaultLogo.png";
import LoginForm from "./pages/LoginForm";
import "./App.css";

export default function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

function AppContent() {
    const location = useLocation();
    const isLogin = location.pathname === "/login";
    
    return (
        <div className={`appShell${isLogin ? ' loginPage' : ''}`}> 
            <div
                className="appBackground"
                style={{ backgroundImage: `url(${pageBg})` }}
                aria-hidden="true"
            />
            <div
                className="appOverlay"
                aria-hidden="true"
                style={{ pointerEvents: "none" }}
            />
            {isLogin ? (
                <div className="loginFormCenter"><LoginForm /></div>
            ) : (
                <div className="appFrame">
                    <div className="appContent">
                        <img
                            className="appWatermark"
                            src={defaultLogo}
                            alt=""
                            aria-hidden="true"
                            draggable="false"
                        />
                        <div className="appBody">
                            <Routes>
                                <Route path="/login" element={<LoginForm />} />
                                <Route path="/" element={<Home />} />
                                
                                {/* Computer Routes */}
                                <Route path="/computers" element={<ComputerRegister />} />
                                <Route path="/computers/new" element={<ComputerCard mode="create" />} />
                                <Route path="/computers/:id" element={<ComputerCard mode="view" />} />

                                {/* ✅ New Server Routes */}
                                <Route path="/servers/new" element={<ServerCard />} />
                                <Route path="/servers/:id" element={<ServerCard />} />

                                {/* People & Org Routes */}
                                <Route path="/peporg" element={<PeopleDashboard />} />
                                <Route path="/peporg/register" element={<PeporgRegister />} />
                                <Route path="/peporg/new" element={<PeporgCard />} />
                                <Route path="/peporg/:id/people/:email" element={<Peoplecards />} />
                                <Route path="/peporg/:id" element={<PeporgCard />} />
                                <Route path="/peoplecard/:id" element={<Peoplecards />} />
                                
                                {/* Incident Routes */}
                                <Route path="/incident-manage" element={<IncidentManRegister />} />
                                <Route path="/incident/:orgId/:email" element={<IncidentCard />} />
                                
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
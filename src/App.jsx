
import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import AssetDashboard from "./pages/ComputerRegister/AssetDashboard.jsx";
import PeopleDashboard from "./pages/PeporgRegister/PeopleDashboard.jsx";
import ComputerRegister from "./pages/ComputerRegister/ComputerRegister.jsx";
import ComputerCard from "./pages/ComputerRegister/ComputerCard.jsx";
import NetworkCard from "./pages/ComputerRegister/NetworkCard.jsx";
import AVCard from "./pages/ComputerRegister/AVCard.jsx";
import ServerCard from "./pages/ComputerRegister/ServerCard.jsx";
import PeporgRegister from "./pages/PeporgRegister/PeporgRegister.jsx";
import PeporgCard from "./pages/PeporgRegister/PeporgCard.jsx";
import Peoplecards from "./pages/PeporgRegister/Peoplecards.jsx";
import IncidentManRegister from "./pages/IncidentRegister/IncidentManRegister.jsx";
import IncidentCard from "./pages/IncidentRegister/IncidentCard.jsx";
import { DashboardFilterProvider } from "./context/DashboardFilterContext";
import pageBg from "./assets/PageBackground.png";
import LoginForm from "./pages/LoginForm";
import SettingsPage from "./pages/Settings/SettingsPage.jsx";
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
                        <div className="appBody">
                            <DashboardFilterProvider>
                                <Routes key={`${location.pathname}${location.search}`}>
                                    <Route path="/login" element={<LoginForm />} />
                                    <Route path="/" element={<Home />} />
                                    {/* Asset Dashboard Route */}
                                    <Route path="/asset-dashboard" element={<AssetDashboard />} />
                                    {/* Computer Routes */}
                                    <Route path="/computers" element={<ComputerRegister />} />
                                    <Route path="/computers/new" element={<ComputerCard mode="create" />} />
                                    <Route path="/computers/:id" element={<ComputerCard mode="view" />} />
                                    {/* Server Routes */}
                                    <Route path="/servers" element={<ComputerRegister />} />
                                    <Route path="/servers/new" element={<ServerCard />} />
                                    <Route path="/servers/:id" element={<ServerCard />} />
                                    {/* Networking & AV Routes */}
                                    <Route path="/networking" element={<ComputerRegister />} />
                                    <Route path="/networking/new" element={<NetworkCard mode="create" />} />
                                    <Route path="/networking/:id" element={<NetworkCard mode="view" />} />
                                    <Route path="/av" element={<ComputerRegister />} />
                                    <Route path="/av-equipment/new" element={<AVCard mode="create" />} />
                                    <Route path="/av-equipment/:id" element={<AVCard mode="view" />} />
                                    {/* People & Org Routes */}
                                    <Route path="/peporg/register" element={<PeporgRegister />} />
                                    <Route path="/peporg/new" element={<PeporgCard />} />
                                    <Route path="/peporg/dashboard" element={<PeopleDashboard />} />
                                    <Route path="/peporg/:id/people/:email" element={<Peoplecards />} />
                                    <Route path="/peporg/:id" element={<PeporgCard />} />
                                    <Route path="/peporg" element={<Navigate to="/peporg/dashboard" replace />} />
                                    <Route path="/peoplecard/:id" element={<Peoplecards />} />
                                    {/* Incident Routes */}
                                    <Route path="/incident-manage" element={<IncidentManRegister />} />
                                    <Route path="/incident/:orgId/:email" element={<IncidentCard />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </DashboardFilterProvider>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home/Home";
import ComputerRegister from "./pages/ComputerRegister/ComputerRegister";
import ComputerCard from "./pages/ComputerRegister/ComputerCard";

import PeporgRegister from "./pages/PeporgRegister/PeporgRegister";
import PeporgCard from "./pages/PeporgRegister/PeporgCard";

import pageBg from "./assets/PageBackground.png";
import defaultLogo from "./assets/logos/DefaultLogo.png";
import "./App.css";

export default function App() {
    return (
        <BrowserRouter>
            <div className="appShell">
                <div
                    className="appBackground"
                    style={{ backgroundImage: `url(${pageBg})` }}
                    aria-hidden="true"
                />

                {/* ✅ FIX: overlay must NOT capture clicks */}
                <div
                    className="appOverlay"
                    aria-hidden="true"
                    style={{ pointerEvents: "none" }}
                />

                <div className="appFrame">
                    <div className="appContent">
                        {/* Watermark (behind all pages, inside the panel) */}
                        <img
                            className="appWatermark"
                            src={defaultLogo}
                            alt=""
                            aria-hidden="true"
                            draggable="false"
                        />

                        {/* App pages above watermark */}
                        <div className="appBody">
                            <Routes>
                                {/* Home */}
                                <Route path="/" element={<Home />} />

                                {/* Computers */}
                                <Route path="/computers" element={<ComputerRegister />} />
                                <Route path="/computers/new" element={<ComputerCard mode="create" />} />
                                <Route path="/computers/:id" element={<ComputerCard mode="view" />} />

                                {/* People & Organisations */}
                                <Route path="/peporg" element={<PeporgRegister />} />
                                <Route path="/peporg/new" element={<PeporgCard />} />
                                <Route path="/peporg/:id" element={<PeporgCard />} />

                                {/* Fallback */}
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </div>
                    </div>
                </div>
            </div>
        </BrowserRouter>
    );
}
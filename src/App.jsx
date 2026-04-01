import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Home from "./pages/Home/Home";
import ComputerRegister from "./pages/ComputerRegister/ComputerRegister";
import ComputerCard from "./pages/ComputerRegister/ComputerCard";

import pageBg from "./assets/PageBackground.png";
import defaultLogo from "./assets/logos/DefaultLogo.png";
import "./App.css";

export default function App() {
    return (
        <div className="appShell">
            <div
                className="appBackground"
                style={{ backgroundImage: `url(${pageBg})` }}
                aria-hidden="true"
            />

            <div className="appOverlay" aria-hidden="true" />

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
                        <BrowserRouter>
                            <Routes>
                                <Route path="/" element={<Home />} />
                                <Route path="/computers" element={<ComputerRegister />} />
                                <Route path="/computers/new" element={<ComputerCard mode="create" />} />
                                <Route path="/computers/:id" element={<ComputerCard mode="view" />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </BrowserRouter>
                    </div>
                </div>
            </div>
        </div>
    );
}
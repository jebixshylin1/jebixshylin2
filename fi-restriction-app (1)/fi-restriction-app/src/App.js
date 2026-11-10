import React, { useState } from "react";
import FireRestriction from "./components/Firestriction/FireRestriction";
import FIRestrictionConfiguration from "./components/Firestriction/FIRestrictionConfiguration";
import "./App.css";

const TABS = [
  { key: "master", label: "FI Restriction" },
  { key: "config", label: "FI Restriction Configuration" },
];

export default function App() {
  const [activeTab, setActiveTab] = useState("master");

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1 className="app-header-title">FI Restriction</h1>
      </header>

      <main className="page">
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`tab-button ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "master" ? <FireRestriction /> : <FIRestrictionConfiguration />}
      </main>

      <footer className="app-footer">&copy; 2026 Sundaram Finance Ltd.</footer>
    </div>
  );
}

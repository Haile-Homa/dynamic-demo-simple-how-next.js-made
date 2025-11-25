
// app/dashboard/layout.js
import React from "react";
export default function DashboardLayout({ children }) {
    return React.createElement(
        "div",
        null,
        React.createElement("header", null, "Dashboard Navbar"),
        children,
        React.createElement("footer", null, "Dashboard Footer")
    );
}
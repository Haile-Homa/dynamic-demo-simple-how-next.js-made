import React from "react";
export default function RootLayout({ children }) {
  return React.createElement(
    "div",
    null,
    React.createElement("header", null, "Navbar"),
    children,
    React.createElement("footer", null, "Footer")
  );
}

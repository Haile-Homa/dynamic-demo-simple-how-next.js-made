import express from "express";
import fs from "fs";
import path from "path";
import React from "react";
import ReactDOMServer from "react-dom/server";
import { pathToFileURL } from "url";

const appFolder = path.join(process.cwd(), "app");
const appServer = express();

// 1️⃣ Scan folder recursively to build route tree with logs
function scanFolder(folderPath, level = 0) {
  const entries = fs.readdirSync(folderPath, { withFileTypes: true });
  const tree = {};
  const indent = "  ".repeat(level);

  console.log(`${indent}Scanning folder: ${folderPath}`);

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name);
    if (entry.isDirectory()) {
      console.log(`${indent}📁 Found folder: ${entry.name}`);
      tree[entry.name] = scanFolder(fullPath, level + 1);
    } else if (entry.isFile()) {
      console.log(`${indent}📄 Found file: ${entry.name}`);
      if (entry.name === "page.js") tree.page = fullPath;
      if (entry.name === "layout.js") tree.layout = fullPath;
    }
  }
  return tree;
}

const routeTree = scanFolder(appFolder);
console.log("\n✅ Full Route Tree:", JSON.stringify(routeTree, null, 2));

// 2️⃣ Find page and layouts dynamically for a URL with logs
async function findRoute(urlPath) {
  console.log(`\n🔍 Finding route for URL: ${urlPath}`);

  const segments = urlPath.split("/").filter(Boolean);
  let current = routeTree;
  const layouts = [];
  let params = {};
  let matchedSegments = [];

  for (const seg of segments) {
    const dynamicSeg = Object.keys(current).find(
      (k) => k === seg || k.startsWith("[")
    );

    if (!dynamicSeg) break;

    matchedSegments.push(dynamicSeg);

    if (current[dynamicSeg].layout) layouts.push(current[dynamicSeg].layout);
    current = current[dynamicSeg];

    if (dynamicSeg.startsWith("[")) {
      const paramName = dynamicSeg.slice(1, -1);
      params[paramName] = seg;
      console.log(`⚡ Dynamic param detected: ${paramName} = ${seg}`);
    }
  }

  const pagePath = current.page || routeTree.page;
  console.log(`✔ Matched segments: ${matchedSegments.join(" / ")}`);
  console.log(`📄 Page path: ${pagePath}`);
  console.log(`📦 Layouts applied: ${layouts.join(" -> ")}`);
  console.log(`📝 Params:`, params);

  return { layouts, pagePath, params };
}

// 3️⃣ Render page wrapped in layouts with logs
async function renderRoute(urlPath) {
  const { layouts, pagePath, params } = await findRoute(urlPath);

  // Import layouts dynamically
  const LayoutComponents = [];
  for (const layoutFile of layouts) {
    const mod = await import(pathToFileURL(layoutFile).href);
    LayoutComponents.push(mod.default);
  }

  // Import page dynamically
  const PageModule = await import(pathToFileURL(pagePath).href);
  const PageComponent = PageModule.default;

  // Wrap page in layouts
  let element = React.createElement(PageComponent, { params });
  for (let i = LayoutComponents.length - 1; i >= 0; i--) {
    const Layout = LayoutComponents[i];
    element = React.createElement(Layout, null, element);
  }

  console.log(`✅ Rendering completed for URL: ${urlPath}`);
  return ReactDOMServer.renderToStaticMarkup(element);
}

// 4️⃣ Express route — match all paths
appServer.get(/.*/, async (req, res) => {
  try {
    const html = await renderRoute(req.path);
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

// 5️⃣ Start server
appServer.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});



// import express from "express";
// import fs from "fs";
// import path from "path";
// import React from "react";
// import ReactDOMServer from "react-dom/server";

// const appFolder = path.join(process.cwd(), "app");
// const appServer = express();

// // 1️⃣ Scan folder recursively
// function scanFolder(folderPath) {
//     const entries = fs.readdirSync(folderPath, { withFileTypes: true });
//     const tree = {};
//     for (const entry of entries) {
//         const fullPath = path.join(folderPath, entry.name);
//         if (entry.isDirectory()) {
//             tree[entry.name] = scanFolder(fullPath);
//         } else if (entry.isFile()) {
//             if (entry.name === "page.js") tree.page = fullPath;
//             if (entry.name === "layout.js") tree.layout = fullPath;
//         }
//     }
//     return tree;
// }

// // Build route tree
// const routeTree = scanFolder(appFolder);

// // 2️⃣ Find page & layout dynamically
// async function findRoute(urlPath) {
//     const segments = urlPath.split("/").filter(Boolean);
//     let current = routeTree;
//     const layouts = [];
//     let pagePath;

//     for (const seg of segments) {
//         let dynamicSeg = Object.keys(current).find(k => k === seg || k.startsWith("["));
//         if (!dynamicSeg) break;

//         if (current[dynamicSeg].layout) layouts.push(current[dynamicSeg].layout);
//         current = current[dynamicSeg];

//         // Capture dynamic param
//         if (dynamicSeg.startsWith("[")) {
//             const paramName = dynamicSeg.slice(1, -1);
//             current.param = current.param || {};
//             current.param[paramName] = seg;
//         }
//     }

//     pagePath = current.page || routeTree.page;
//     return { layouts, pagePath, params: current.param || {} };
// }

// // 3️⃣ Render route dynamically
// async function renderRoute(urlPath) {
//     const { layouts, pagePath, params } = await findRoute(urlPath);

//     const LayoutComponents = [];
//     for (const layoutFile of layouts) {
//         const mod = await import(layoutFile);
//         LayoutComponents.push(mod.default);
//     }

//     const PageModule = await import(pagePath);
//     const PageComponent = PageModule.default;

//     // Wrap page in layouts
//     let element = <PageComponent params={params} />;
//     for (let i = LayoutComponents.length - 1; i >= 0; i--) {
//         const Layout = LayoutComponents[i];
//         element = <Layout>{element}</Layout>;
//     }

//     return ReactDOMServer.renderToStaticMarkup(element);
// }

// // Express routes
// appServer.get("*", async (req, res) => {
//     const html = await renderRoute(req.path);
//     res.send(html);
// });

// appServer.listen(3000, () => {
//     console.log("Server running at http://localhost:3000");
// });

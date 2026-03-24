const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = process.env.PORT || 3000;
const accounts = {};

// Shared config that all Lua scripts poll
let sharedConfig = {
    trade: {
        enabled: false,
        targetPlayer: "",
    },
};

const server = http.createServer((req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

    // POST /api/status — Lua scripts send status updates
    if (req.method === "POST" && req.url === "/api/status") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                if (data.username) {
                    accounts[data.username] = { ...data, timestamp: Date.now() };
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ ok: true }));
                } else {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: "missing username" }));
                }
            } catch {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "invalid json" }));
            }
        });
        return;
    }

    // GET /api/accounts — dashboard fetches this
    if (req.method === "GET" && req.url === "/api/accounts") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(accounts));
        return;
    }

    // GET /api/config — Lua scripts poll this for remote config
    if (req.method === "GET" && req.url === "/api/config") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(sharedConfig));
        return;
    }

    // POST /api/config — panel updates config
    if (req.method === "POST" && req.url === "/api/config") {
        let body = "";
        req.on("data", chunk => body += chunk);
        req.on("end", () => {
            try {
                const data = JSON.parse(body);
                if (data.trade !== undefined) {
                    sharedConfig.trade = { ...sharedConfig.trade, ...data.trade };
                }
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ ok: true, config: sharedConfig }));
            } catch {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "invalid json" }));
            }
        });
        return;
    }

    // Serve pages
    if (req.method === "GET") {
        let file;
        if (req.url === "/" || req.url === "/index.html") {
            file = path.join(__dirname, "index.html");
        } else if (req.url === "/panel" || req.url === "/panel.html") {
            file = path.join(__dirname, "panel.html");
        }
        if (file) {
            fs.readFile(file, (err, data) => {
                if (err) { res.writeHead(500); res.end("Error"); return; }
                res.writeHead(200, { "Content-Type": "text/html" });
                res.end(data);
            });
            return;
        }
    }

    res.writeHead(404);
    res.end("Not found");
});

server.listen(PORT, () => {
    console.log(`[WHI Server] Running on http://localhost:${PORT}`);
    console.log(`[WHI Server] Dashboard: http://localhost:${PORT}`);
    console.log(`[WHI Server] Panel:     http://localhost:${PORT}/panel`);
});

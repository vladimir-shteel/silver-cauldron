const WebSocket = require('ws');
const http = require('http');

const PORT = 8081;

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/websocket' });

// group_key -> Set of WebSocket clients
const groups = new Map();

wss.on('connection', function(ws) {
    let group_key = null;

    console.log('Client connected');

    ws.on('message', function(message) {
        try {
            const data = JSON.parse(message);

            // First message from client contains group_key
            if (group_key === null) {
                if (data.group_key) {
                    group_key = data.group_key;
                    if (!groups.has(group_key)) {
                        groups.set(group_key, new Set());
                    }
                    groups.get(group_key).add(ws);
                    console.log(`Client joined group: ${group_key} (total in group: ${groups.get(group_key).size})`);
                }
                return;
            }

            // Broadcast to all other clients in the same group
            if (groups.has(group_key)) {
                const messageStr = message.toString();
                let sent = 0;
                for (const client of groups.get(group_key)) {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(messageStr);
                        sent++;
                    }
                }
                console.log(`Action "${data.action}" broadcast to ${sent} client(s) in group ${group_key}`);
            }
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', function() {
        if (group_key && groups.has(group_key)) {
            groups.get(group_key).delete(ws);
            console.log(`Client left group: ${group_key} (remaining: ${groups.get(group_key).size})`);
            if (groups.get(group_key).size === 0) {
                groups.delete(group_key);
            }
        }
    });

    ws.on('error', function(err) {
        console.error('WebSocket error:', err);
    });
});

server.listen(PORT, function() {
    console.log(`Cauldron WebSocket server running on port ${PORT}`);
    console.log(`Waiting for connections at ws://localhost:${PORT}/websocket`);
});

const WebSocket = require('ws');
const http = require('http');

const PORT = 8081;

const server = http.createServer();
const wss = new WebSocket.Server({ server, path: '/websocket' });

// group_key -> { clients: Set<WebSocket>, music: { track: string|null, playing: bool } }
const groups = new Map();

function ensure_group(group_key) {
    if (!groups.has(group_key)) {
        groups.set(group_key, {
            clients: new Set(),
            music: { track: null, playing: false, startTime: null }
        });
    }
    return groups.get(group_key);
}

function music_position(music) {
    if (!music.playing || !music.startTime) {
        return 0;
    }
    return (Date.now() - music.startTime) / 1000;
}

function broadcast(group, sender, payload) {
    const str = typeof payload === 'string' ? payload : JSON.stringify(payload);
    let sent = 0;
    for (const client of group.clients) {
        if (client !== sender && client.readyState === WebSocket.OPEN) {
            client.send(str);
            sent++;
        }
    }
    return sent;
}

function send_to(client, payload) {
    if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(payload));
    }
}

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
                    const group = ensure_group(group_key);
                    group.clients.add(ws);
                    console.log(`Client joined group: ${group_key} (total in group: ${group.clients.size})`);
                }
                return;
            }

            const group = groups.get(group_key);
            if (!group) return;

            // Music state handling: intercept before broadcast.
            switch (data.action) {
                case 'music_play':
                    group.music = { track: data.track, playing: true, startTime: Date.now() };
                    // Broadcast to everyone INCLUDING sender so DM's own client also plays
                    // via the unified WS-handler path.
                    {
                        const payload = JSON.stringify({ action: 'music_play', track: data.track, position: 0 });
                        for (const c of group.clients) {
                            if (c.readyState === WebSocket.OPEN) c.send(payload);
                        }
                        console.log(`music_play "${data.track}" in group ${group_key}`);
                    }
                    return;
                case 'music_stop':
                    group.music = { track: null, playing: false, startTime: null };
                    {
                        const payload = JSON.stringify({ action: 'music_stop' });
                        for (const c of group.clients) {
                            if (c.readyState === WebSocket.OPEN) c.send(payload);
                        }
                        console.log(`music_stop in group ${group_key}`);
                    }
                    return;
                case 'music_sync':
                    if (group.music.playing && typeof data.position === 'number') {
                        group.music.startTime = Date.now() - (data.position * 1000);
                    }
                    broadcast(group, ws, message.toString());
                    return;
                case 'music_state_request':
                    send_to(ws, {
                        action: 'music_state',
                        track: group.music.track,
                        playing: group.music.playing,
                        position: music_position(group.music)
                    });
                    return;
            }

            // Default: broadcast to all other clients in the same group.
            const sent = broadcast(group, ws, message.toString());
            console.log(`Action "${data.action}" broadcast to ${sent} client(s) in group ${group_key}`);
        } catch (e) {
            console.error('Error processing message:', e);
        }
    });

    ws.on('close', function() {
        if (group_key && groups.has(group_key)) {
            const group = groups.get(group_key);
            group.clients.delete(ws);
            console.log(`Client left group: ${group_key} (remaining: ${group.clients.size})`);
            if (group.clients.size === 0) {
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

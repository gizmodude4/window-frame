let socket;
let backendServerUrl;
let backendServerWebsocketUrl;

export async function initializeBackend(backendUrl, backendWebsocketUrl, receiveMetadata) {
    backendServerUrl = backendUrl;
    backendServerWebsocketUrl = backendWebsocketUrl;
    await initializeWebsocket(receiveMetadata);
}

export async function getCollections() {
    try {
        let resp = fetch(`${backendServerUrl}/scenes`)
        return (await resp).json()
    } catch (e) {
        console.error("Couldn't fetch scenes", e);
    }
    return []
}

export function sendSocketMessage(message) {
    var retry = setInterval(function() {
        if (socket.readyState == WebSocket.OPEN) {
            socket.send(message);
            clearInterval(retry);
        }
    }, 1000);
}

async function initializeWebsocket( receiveMetadata) {
    const ticket = await getWebsocketTicket(backendServerUrl);
    socket = new WebSocket(`${backendServerWebsocketUrl}/scenes/updates?ticket=${ticket}`);
    socket.onmessage = receiveMetadata;
}

async function getWebsocketTicket(backendServerUrl) {
    const response = await fetch(`${backendServerUrl}/ticket`);
    const data = await response.json();
    return data['ticket'];
}
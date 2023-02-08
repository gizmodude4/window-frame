let backendServerUrl;
let websocketClient;

export async function initializeBackend(backendUrl) {
    backendServerUrl = backendUrl;
}

export async function getCollections() {
    try {
        let resp = fetch(`${backendServerUrl}/spots`)
        return (await resp).json()
    } catch (e) {
        console.error("Couldn't fetch scenes", e);
    }
    return []
}

export async function getGeoData() {
    try {
        const resp = fetch(`${backendServerUrl}/location`)
        const body = await (await resp).json();
        return {
            'lat': body.ll[0],
            'lon': body.ll[1],
            'tz': body.timezone
        }
    } catch (e) {
        console.debug("Couldn't fetch location based on IP, use default.")
    }
    return null;
}

export async function connectToWebsocket() {
    return new Promise(resolve => {
        const socket = new SockJS(`${backendServerUrl}/notifications`);
        const stompClient = Stomp.over(socket);
        stompClient.debug = () => {};
        stompClient.connect({}, function(frame) {
            websocketClient = stompClient;
            resolve();
        });
    })
}

export async function subscribeToMetadata(spotId, sceneId, streamUrl, onChange) {
    if (!websocketClient || !onChange) {
        return null;
    }

    // Get the initial fetch of current metadata and set appropriately
    fetch(`${backendServerUrl}/spots/${spotId}/scenes/${sceneId}/metadata`)
      .then((res) => {
        return res.json();
      })
      .then((res) => {
        onChange(res);
      })
      .catch((err) => {
        console.error("Error getting metadata", err);
      });

    return websocketClient.subscribe(`/topic/${streamUrl}/metadata`, function(messageOutput) {
        const eventData = JSON.parse(messageOutput.body);
        onChange(eventData);
    });
}
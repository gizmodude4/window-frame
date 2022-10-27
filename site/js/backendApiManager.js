let backendServerUrl;

export async function initializeBackend(backendUrl) {
    backendServerUrl = backendUrl;
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
        console.error("Couldn't fetch geo data", e);
    }
    return null;
}
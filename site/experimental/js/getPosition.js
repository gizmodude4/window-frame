export const getPosition = async() => {
    try {
        if (navigator.geolocation) {
            const pos = await new Promise((res) => navigator.geolocation.getCurrentPosition(res));
            return {
                "lat": pos.coords.latitude,
                "lon": pos.coords.longitude
            }
        }
    } catch (e) {
        console.log(e)
        // get location based on IP
        const resp = await fetch('http://www.geoplugin.net/json.gp');
        const data = await resp.json();
        return {
            "lat": data.geoplugin_latitude,
            "lon": data.geoplugin_longitude,
        }
    }
}
export const getPosition = async() => {
    const resp = await fetch('http://www.geoplugin.net/json.gp');
    const data = await resp.json();
    return {
        "lat": data.geoplugin_latitude,
        "lon": data.geoplugin_longitude,
    }
}
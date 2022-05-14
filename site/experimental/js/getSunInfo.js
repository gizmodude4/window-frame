export const getSunInfo = (curTime, pos) => {
    const tmp = new Date(curTime.getTime());
    tmp.setHours(12)
    
    const lat = pos.lat ? pos.lat : 39.8283;
    const lon = pos.lon ? pos.lon : 98.5795;
    return SunCalc.getTimes(tmp, lat, lon)
}

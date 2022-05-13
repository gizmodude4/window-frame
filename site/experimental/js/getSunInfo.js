export const getSunInfo = (curTime, pos) => {
    const tmp = new Date(curTime.getTime());
    tmp.setHours(12)
    
    return SunCalc.getTimes(tmp, pos.lat, pos.lon)
}

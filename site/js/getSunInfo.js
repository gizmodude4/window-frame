import { fromMilitaryTime, timeLerp } from './dateTimeUtils.js';

export const getSunInfo = (curTime, pos) => {    
    let timeToUse;
    if (!pos || !pos.lat || !pos.lon || !pos.tz) {
        pos = {
            lat: 39.8283,
            lon: -98.5795,
            tz: "America/Chicago"
        }
        timeToUse = luxon.DateTime.now({hour: 0, minute: 0, second: 0, millisecond: 0}).toJSDate()
    } else {
        timeToUse = curTime.set({hour: 0, minute: 0, second: 0, millisecond: 0}).toJSDate()
    }
    const sunCalcTimes = SunCalc.getTimes(timeToUse, pos.lat, pos.lon);

    // night and nightEnd are known to be unreliable at times at certain places on the globe.
    // If we don't get a time for these fields, average the dates and best as we can
    // https://github.com/mourner/suncalc/issues/117
    if (isNaN(sunCalcTimes.night.getTime())) {
        const nextToMidnight = fromMilitaryTime('23:59');
        sunCalcTimes.night = timeLerp(luxon.DateTime.fromJSDate(sunCalcTimes.dusk).setZone(pos.tz), nextToMidnight, 0.25).toJSDate();
    }
    if (isNaN(sunCalcTimes.nightEnd.getTime())) {
        const midnight = fromMilitaryTime('00:00', pos.tz);
        sunCalcTimes.nightEnd = timeLerp(midnight, luxon.DateTime.fromJSDate(sunCalcTimes.sunrise).setZone(pos.tz), 0.75).toJSDate();
    }
    return {
        nightEnd: luxon.DateTime.fromJSDate(sunCalcTimes.nightEnd).setZone(pos.tz),
        sunrise: luxon.DateTime.fromJSDate(sunCalcTimes.sunrise).setZone(pos.tz),
        sunriseEnd: luxon.DateTime.fromJSDate(sunCalcTimes.sunriseEnd).setZone(pos.tz),
        goldenHourEnd: luxon.DateTime.fromJSDate(sunCalcTimes.goldenHourEnd).setZone(pos.tz),
        solarNoon: luxon.DateTime.fromJSDate(sunCalcTimes.solarNoon).setZone(pos.tz),
        goldenHour: luxon.DateTime.fromJSDate(sunCalcTimes.goldenHour).setZone(pos.tz),
        sunsetStart: luxon.DateTime.fromJSDate(sunCalcTimes.sunsetStart).setZone(pos.tz),
        sunset: luxon.DateTime.fromJSDate(sunCalcTimes.sunset).setZone(pos.tz),
        dusk: luxon.DateTime.fromJSDate(sunCalcTimes.dusk).setZone(pos.tz),
        night: luxon.DateTime.fromJSDate(sunCalcTimes.night).setZone(pos.tz),
    }
}

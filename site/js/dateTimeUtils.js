export function timeLerp(earlierTime, laterTime, percentage) {
    let diff = getTimeDiff(laterTime, earlierTime);
    return earlierTime.plus({millisecond: Math.floor(percentage * diff)});
};

export function getTimeDiff(date1, date2) {
    const hoursDiff = date1.hour - date2.hour;
    const minutesDiff = date1.minute - date2.minute;
    const secondsDiff = date1.second - date2.second;
    return (hoursDiff * 60 * 60 + minutesDiff * 60 + secondsDiff)*1000;
}

export function fromMilitaryTime(time, tz) {
    let split = time.split(":")
    let now = luxon.DateTime.now()
    if (tz) {
        now = now.setZone(tz)
    }
    return now.set({hour: split[0], minute: split[1], second: 0, millisecond: 0});
}
const lerp = (x, y, a) => x * (1 - a) + y * a;

const R = 1;
const G = 2;
const B = 3;
const CON = 4;
const SAT = 5;
const BRT = 6;
const POPS = 7;
const POPT = 8;

const COLOR1_R = 1;
const COLOR1_G = 2;
const COLOR1_B = 3;
const COLOR2_R = 4;
const COLOR2_G = 5;
const COLOR2_B = 6;

let dayNightShaderColors;
let cloudShaderColors;
let skyShaderColors;

export const getShaderInfo = (now, sunInfo, forceRefresh = false) => {
    let mix = getFilterIndexAndMix(now, sunInfo, forceRefresh);
    if (!mix) {
        return {
            foreground: {
                color: [30/255, 120/255, 225/255],
                con_sat_brt: [0.6, 1.0, -0.2, 0.8, 0.65]
            },
            clouds: {
                color: [30/255, 120/255, 225/255],
                con_sat_brt: [0.6, 1.0, -0.4, 0.8, 0.68]
            },
            sky: {
                color1: [0, 1/255, 26/255],
                color2: [4/255, 7/255, 48/255]
            }
        }
    }
    return {
        foreground: {
            color: [
                lerp(dayNightShaderColors[mix.index][R], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][R], mix.mix)/255,
                lerp(dayNightShaderColors[mix.index][G], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][G], mix.mix)/255,
                lerp(dayNightShaderColors[mix.index][B], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][B], mix.mix)/255,
            ],
            con_sat_brt: [
                lerp(dayNightShaderColors[mix.index][CON], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][CON], mix.mix),
                lerp(dayNightShaderColors[mix.index][SAT], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][SAT], mix.mix),
                lerp(dayNightShaderColors[mix.index][BRT], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][BRT], mix.mix),
                lerp(dayNightShaderColors[mix.index][POPS], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][POPS], mix.mix),
                lerp(dayNightShaderColors[mix.index][POPT], dayNightShaderColors[(mix.index+1)%dayNightShaderColors.length][POPT], mix.mix),
            ]
        },
        clouds: {
            color: [
                lerp(cloudShaderColors[mix.index][R], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][R], mix.mix)/255,
                lerp(cloudShaderColors[mix.index][G], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][G], mix.mix)/255,
                lerp(cloudShaderColors[mix.index][B], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][B], mix.mix)/255,
            ],
            con_sat_brt: [
                lerp(cloudShaderColors[mix.index][CON], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][CON], mix.mix),
                lerp(cloudShaderColors[mix.index][SAT], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][SAT], mix.mix),
                lerp(cloudShaderColors[mix.index][BRT], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][BRT], mix.mix),
                lerp(cloudShaderColors[mix.index][POPS], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][POPS], mix.mix),
                lerp(cloudShaderColors[mix.index][POPT], cloudShaderColors[(mix.index+1)%cloudShaderColors.length][POPT], mix.mix),
            ]
        },
        sky: {
            color1: [
                lerp(skyShaderColors[mix.index][COLOR1_R], skyShaderColors[(mix.index+1)%skyShaderColors.length][COLOR1_R], mix.mix)/255,
                lerp(skyShaderColors[mix.index][COLOR1_G], skyShaderColors[(mix.index+1)%skyShaderColors.length][COLOR1_G], mix.mix)/255,
                lerp(skyShaderColors[mix.index][COLOR1_B], skyShaderColors[(mix.index+1)%skyShaderColors.length][COLOR1_B], mix.mix)/255,
            ],
            color2: [
                lerp(skyShaderColors[mix.index][COLOR2_R], skyShaderColors[(mix.index+1)%skyShaderColors.length][COLOR2_R], mix.mix)/255,
                lerp(skyShaderColors[mix.index][COLOR2_G], skyShaderColors[(mix.index+1)%skyShaderColors.length][COLOR2_G], mix.mix)/255,
                lerp(skyShaderColors[mix.index][COLOR2_B], skyShaderColors[(mix.index+1)%skyShaderColors.length][COLOR2_B], mix.mix)/255,
            ]
        }
    }
}

function getFilterIndexAndMix(now, sunInfo, forceRefresh = false) {
    if (!sunInfo) {
        return null
    }
    if (!dayNightShaderColors || !cloudShaderColors || !skyShaderColors || forceRefresh) {
        dayNightShaderColors = createDayNightMap(now, sunInfo);
        cloudShaderColors = createDayNightMapClouds(now, sunInfo);
        skyShaderColors = createDayNightMapSky(now, sunInfo);
    }

    let minIndex = -1;
    let minDiff = 24*60*60*1000;
    for (let i = 0; i < dayNightShaderColors.length; i++) {
        let diff = now - dayNightShaderColors[i][0]
        if (diff >= 0 && diff < minDiff) {
            minIndex = i;
            minDiff = diff
        }
    }

    let mix = minDiff / getMixRange(minIndex, dayNightShaderColors);

    return {
        index: minIndex,
        mix: mix
    }
}

function getMixRange(index, dayNightShaderColors) {
    if (index == dayNightShaderColors.length - 1) {
        return getMidnightTomorrow() - dayNightShaderColors[index][0]
    }
    return dayNightShaderColors[index+1][0] - dayNightShaderColors[index][0]
}

function getMidnightTomorrow() {
    let midnightTomorrow = new Date(Date.now())
    midnightTomorrow.setDate(midnightTomorrow.getDate() + 1)
    midnightTomorrow.setHours(0, 0, 0, 0);
    return midnightTomorrow;
}

function createDayNightMap(now, sunInfo) {
    return [
        [fromMilitaryTime(now, "00:00"), 30, 120, 225, 0.6, 1.0, -0.2, 0.8, 0.68], // midnight
        [fromMilitaryTime(now, "04:00"), 40, 125, 215, 0.65, 0.9, -0.2, 0.7, 0.65], // late night
        [sunInfo.nightEnd, 80, 80, 185, 0.8, 0.6, -0.15, 0.2, 0.8], // night end
        // add dawn?
        [sunInfo.sunrise, 125, 70, 175, 1.0, 0.85, -0.10, -0.5, 0.6], // sunrise peak
        [sunInfo.sunriseEnd, 160, 145, 100, 1.2, 0.65, 0.03, 0.0, 1.0], //sunrise end
        [sunInfo.goldenHourEnd, 128, 128, 128, 1.2, 0.85, 0.05, 0.0, 1.0], // golden hour end
        [sunInfo.solarNoon, 128, 128, 128, 1.2, 0.85, 0.05, 0.0, 1.0], // noon,
        //[fromMilitaryTime("15:00"), 128, 128, 128, 1.0, 1.0, 0.0, 0.0, 1.0], // late afternoon
        [sunInfo.goldenHour, 128, 128, 128, 1.0, 1.0, 0.0, 0.0, 1.0], //golden hour start
        [sunInfo.sunsetStart, 145, 120, 90, 1.1, 0.75, 0.0, 0.0, 1.0], //sunset start
        [sunInfo.sunset, 240, 190, 100, 1.0, 0.8, -0.05, 0.2, 0.80], //sunset peak
        [sunInfo.dusk, 100, 100, 140, 0.8, 0.6, -0.15, 0.2, 0.70], //sunsetEnd
        [sunInfo.night, 80, 80, 185, 0.8, 0.6, -0.15, 0.2, 0.80], //sunsetEnd
    ]
}

function createDayNightMapClouds(now, sunInfo) {
    return [
        [fromMilitaryTime(now, "00:00"), 30, 120, 225, 0.6, 1.0, -0.4, 0.8, 0.68], // midnight
        [fromMilitaryTime(now, "04:00"), 40, 125, 215, 0.65, 0.9, -0.4, 0.7, 0.65], // late night
        [sunInfo.nightEnd, 50, 50, 155, 0.8, 0.6, -0.15, 0.0, 0.80], // night end
        // add dawn?
        [sunInfo.sunrise, 125, 70, 175, 1.0, 0.85, -0.10, -0.5, 0.6], // sunrise peak
        [sunInfo.sunriseEnd, 160, 145, 100, 1.2, 0.65, 0.03, 0.0, 1.0], //sunrise end
        [sunInfo.goldenHourEnd, 128, 128, 128, 1.2, 0.85, 0.0, 0.0, 1.0], // golden hour end
        [sunInfo.solarNoon, 128, 128, 128, 1.2, 0.85, 0.05, 0.0, 1.0], // noon,
        //[fromMilitaryTime("15:00"), 128, 128, 128, 1.0, 1.0, 0.0, 0.0, 1.0], // late afternoon
        [sunInfo.goldenHour, 128, 128, 128, 1.0, 1.0, 0.0, 0.0, 1.0], //golden hour start
        [sunInfo.sunsetStart, 145, 120, 90, 1.0, 0.75, 0.0, 0.0, 1.0], //sunset start
        [sunInfo.sunset, 240, 190, 100, 1.0, 0.8, -0.05, 0.2, 0.80], //sunset peak
        [sunInfo.dusk, 100, 100, 140, 0.8, 0.6, -0.15, 0.2, 0.70], //sunsetEnd
        [sunInfo.night, 50, 50, 155, 0.8, 0.6, -0.3, 0.2, 0.80], //sunsetEnd
    ]
}

function createDayNightMapSky(now, sunInfo) {
    return [
        [fromMilitaryTime(now, "00:00"), 0, 1, 26, 4, 7, 48], // midnight
        [fromMilitaryTime(now, "04:00"), 0, 1, 18, 4, 7, 48], // late night
        [sunInfo.nightEnd, 0, 31, 64, 244, 69, 0], // night end
        // add dawn?
        [sunInfo.sunrise, 105, 129, 177, 253, 169, 167], // sunrise peak
        [sunInfo.sunriseEnd, 42, 83, 135, 248, 209, 142], //sunrise end
        [sunInfo.goldenHourEnd, 2, 36, 100, 12, 111, 168], // golden hour end
        [sunInfo.solarNoon, 33, 97, 178, 136, 183, 201], // noon,
        //[fromMilitaryTime("15:00"), 128, 128, 128, 1.0, 1.0, 0.0, 0.0, 1.0], // late afternoon
        [sunInfo.goldenHour, 33, 97, 178, 35, 141, 175], //golden hour start
        [sunInfo.sunsetStart, 35, 141, 175, 254, 177, 105], //sunset start
        [sunInfo.sunset, 88, 86, 125, 255, 146, 107], //sunset peak
        [sunInfo.dusk, 6, 21, 44, 190, 149, 143], //sunsetEnd
        [sunInfo.night, 2, 10, 30, 21, 32, 62], //sunsetEnd
    ]
}

function fromMilitaryTime(now, time) {
    let tmp = new Date(now.getTime());
    let split = time.split(":")
    tmp.setHours(split[0], split[1], 0, 0);
    return tmp;
}
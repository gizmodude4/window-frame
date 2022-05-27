const defaultConfig = {
    "dynamicTimeOfDay": true,
    "audioFiltersOn": true,
    "streamVolume": 100,
    "ambianceVolume": 100
};

const config = getConfig();

export function updateConfig(partialConfig) {
    for (const configProp in partialConfig) {
        config[configProp] = partialConfig[configProp]
    }
    saveConfig(config);
}

export function getConfigProperty(property) {
    return config[property];
}

function getConfig() {
    const configString = localStorage.getItem("config");
    const savedConfig = configString ? JSON.parse(configString) : {};
    const mergeConfig = {};
    for (const configProp in defaultConfig) {
        mergeConfig[configProp] = (configProp in savedConfig) ? savedConfig[configProp] : defaultConfig[configProp]
    }
    return mergeConfig;
}

function saveConfig() {
    localStorage.setItem("config", JSON.stringify(config));
}
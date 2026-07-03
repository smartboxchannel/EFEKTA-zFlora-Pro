// ############################################################################//
//                                                                             //
//    ... перезагрузить z2m, что бы конвертер применился                       //
//                                                                             //
//#############################################################################//

const {
    battery,
    binary,
    enumLookup,
    numeric,
    temperature,
	humidity,
	soilMoisture,
	illuminance,
	reporting,
	identify,
} = require('zigbee-herdsman-converters/lib/modernExtend');

const sixReporting = {min: 3600, max: 21600, change: 1};
const soilMoistureReporting = {min: 600, max: 7200, change: 100};
const slowReporting = {min: 120, max: 3600, change: 25};
const slow2Reporting = {min: 300, max: 3600, change: 50};


const definition = {
        zigbeeModel: ["zFlora_ProMax"],
        model: "zFlora_ProMax",
        vendor: "EFEKTA",
        description: "Plant watering sensor zFlora ProMax",
        extend: [
            identify(),
            soilMoisture({
                reporting: soilMoistureReporting,
                access: "STATE",
            }),
            battery({
                percentage: true,
                lowStatus: true,
                voltage: true,
                percentageReporting: true,
                voltageReporting: true,
                percentageReportingConfig: sixReporting,
                voltageReportingConfig: sixReporting,
            }),
            temperature({
                reporting: slowReporting,
                access: "STATE",
            }),
            humidity({
                reporting: slow2Reporting,
                access: "STATE",
            }),
            illuminance({
                reporting: slowReporting,
                access: "STATE",
            }),
			numeric({
                name: "VPD",
                unit: "kPa",
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0340, type: 0x21},
                description: "VPD",
				scale: 100,
				precision: 2,
                access: "STATE",
            }),
            numeric({
                name: "lux_factor",
                valueMin: 0.1,
                valueMax: 30,
                valueStep: 0.1,
                cluster: "msIlluminanceMeasurement",
                attribute: {ID: 0x0310, type: 0x39},
                description: "Lux factor",
                access: "STATE_SET",
            }),
            numeric({
                name: "reading_interval",
                unit: "min",
                valueMin: 1,
                valueMax: 360,
                cluster: "genPowerCfg",
                attribute: {ID: 0x0201, type: 0x21},
                description: "Setting the time in minutes, by default 3 minutes",
                access: "STATE_SET",
            }),
            binary({
                name: "smart_sleep",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "genPowerCfg",
                attribute: {ID: 0x0216, type: 0x10},
                description: "Enable Smart Sleep, short wakeup every 7 seconds",
                access: "STATE_SET",
            }),
            enumLookup({
                name: "tx_radio_power",
                lookup: {"0dbm": 4, "4dbm": 19},
                cluster: "genPowerCfg",
                attribute: {ID: 0x0236, type: 0x28},
                description: "Set TX Radio Power, dbm",
                access: "STATE_SET",
            }),
            numeric({
                name: "uptime",
                unit: "Hours",
                cluster: "genTime",
                attribute: "standardTime",
                description: "Uptime",
                scale: 3600,
                precision: 1,
                access: "STATE",
            }),
            numeric({
                name: "lower_level",
                unit: "%",
                valueMin: 0,
                valueMax: 99,
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0502, type: 0x21},
                description: "Lower level of soil moisture 0% is:",
                access: "STATE_SET",
            }),
            numeric({
                name: "upper_level",
                unit: "%",
                valueMin: 1,
                valueMax: 100,
                cluster: "msSoilMoisture",
                attribute: {ID: 0x0503, type: 0x21},
                description: "Upper level of soil moisture 100% is:",
                access: "STATE_SET",
            }),
            binary({
                name: "temperature_compensation",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "msTemperatureMeasurement",
                attribute: {ID: 0x0504, type: 0x10},
                description: "Temperature compensation",
                access: "STATE_SET",
            }),
        ],
    };

module.exports = definition;
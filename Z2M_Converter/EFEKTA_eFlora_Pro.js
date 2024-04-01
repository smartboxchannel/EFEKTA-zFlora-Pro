const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const constants = require('zigbee-herdsman-converters/lib/constants');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;
const globalStore = require('zigbee-herdsman-converters/lib/store');
const OneJanuary2000 = new Date('January 01, 2000 00:00:00 UTC+00:00').getTime();

async function onEventSetLocalTime(type, data, device) {
		if (data.type === 'attributeReport' && data.cluster === 'genTime') {
	try {	
		const endpoint = device.getEndpoint(1);
		const time = Math.round((((new Date()).getTime() - OneJanuary2000) / 1000) + (((new Date()).getTimezoneOffset() * -1) * 60));
        await endpoint.write('genTime', {time: time});
    }catch (error) {
            // endpoint.write can throw an error which needs to
            // be caught or the zigbee-herdsman may crash
            // Debug message is handled in the zigbee-herdsman
        }
    }
}

const tzLocal = {
	node_config: {
        key: ['report_delay'],
        convertSet: async (entity, key, rawValue, meta) => {
			const endpoint = meta.device.getEndpoint(1);
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                report_delay: ['genPowerCfg', {0x0201: {value, type: 0x21}}],
            };
            await endpoint.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	node_debug: {
        key: ['lower_level', 'upper_level'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                lower_level: ['genBasic', {0x0502: {value, type: 0x21}}],
				upper_level: ['genBasic', {0x0503: {value, type: 0x21}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	config_disp: {
        key: ['invert', 'fastmode'],
        convertSet: async (entity, key, rawValue, meta) => {
			const endpoint = meta.device.getEndpoint(1);
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
				invert: ['genBasic', {0xF004: {value, type: 0x20}}],
				fastmode: ['genBasic', {0xF005: {value, type: 0x20}}],
            };
            await endpoint.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};


const fzLocal = {
	node_config: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0201)) {
                result.report_delay = msg.data[0x0201];
            }
            return result;
        },
    },
	node_debug: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
			if (msg.data.hasOwnProperty(0x0500)) {
                result.bat_adc = msg.data[0x0500];
            }
            if (msg.data.hasOwnProperty(0x0499)) {
                result.sm_adc_compens = msg.data[0x0499];
            }
			if (msg.data.hasOwnProperty(0x0501)) {
                result.sm_adc = msg.data[0x0501];
            }
			if (msg.data.hasOwnProperty(0x0502)) {
                result.lower_level = msg.data[0x0502];
            }
			if (msg.data.hasOwnProperty(0x0503)) {
                result.upper_level = msg.data[0x0503];
            }
            return result;
        },
    },
	config_disp: {
        cluster: 'genBasic',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0xF004)) {
                result.invert = msg.data[0xF004];
            }
			if (msg.data.hasOwnProperty(0xF005)) {
                result.fastmode = msg.data[0xF005];
            }
            return result;
        },
    },
	local_time: {
        cluster: 'genTime',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            return {local_time: msg.data.localTime};
        },
    },
};


const definition = {
        zigbeeModel: ['EFEKTA_eFlora_Pro'],
        model: 'EFEKTA_eFlora_Pro',
        vendor: 'Custom devices (DiY)',
        description: '[Plant Wattering Sensor with e-ink display 2.13](https://efektalab.com/eFlowerPro)',
        fromZigbee: [fz.temperature, fz.humidity, fz.illuminance, fz.soil_moisture, fz.battery, fzLocal.local_time, fzLocal.config_disp, fzLocal.node_config, fzLocal.node_debug],
        toZigbee: [tz.factory_reset, tzLocal.config_disp, tzLocal.node_config, tzLocal.node_debug],
		onEvent: onEventSetLocalTime,
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpoint = device.getEndpoint(1);
			const endpoint2 = device.getEndpoint(2);
			await reporting.bind(endpoint, coordinatorEndpoint, [
                'genPowerCfg', 'genTime', 'msSoilMoisture', 'genBasic']);
		    await reporting.bind(endpoint2, coordinatorEndpoint, ['msTemperatureMeasurement', 'msRelativeHumidity', 'msIlluminanceMeasurement']);
        },
        exposes: [e.soil_moisture(), e.battery(), e.battery_low(),
		    e.battery_voltage(), e.temperature(), e.humidity(), e.illuminance_lux(), e.illuminance(),
			exposes.enum('invert', ea.STATE_SET, [0, 1]).withDescription('Invert display color'),
		    exposes.enum('fastmode', ea.STATE_SET, [0, 1]).withDescription('FM or UFM'),
			exposes.numeric('report_delay', ea.STATE_SET).withUnit('Minutes').withDescription('Adjust Report Delay. Setting the time in minutes, by default 30 minutes')
                .withValueMin(1).withValueMax(360),
			exposes.numeric('lower_level', ea.STATE_SET).withUnit('%').withDescription('The lower level of soil moisture 0% is:')
                .withValueMin(0).withValueMax(99),
			exposes.numeric('upper_level', ea.STATE_SET).withUnit('%').withDescription('The upper level of soil moisture 100% is:')
                .withValueMin(1).withValueMax(100)],
};

module.exports = definition;
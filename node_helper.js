const NodeHelper = require("node_helper");
const { execSync } = require("child_process");
const os = require("os");
const Log = require("logger");

module.exports = NodeHelper.create({
    start: function () {
        Log.info(`[${this.name}] Module started.`);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            Log.info(`[${this.name}] Received configuration.`);
            this.getStats();
        }
    },

    getStats: function () {
        const self = this;

        try {
            const stats = {
                cpuUsage: this.config.showCpuUsage ? parseFloat(this.getCpuUsage()) : null,
                ramUsage: this.config.showRamUsage ? parseFloat(this.getRamUsage()) : null,
                diskUsage: this.config.showDiskUsage ? parseFloat(this.getDiskUsage()) : null,
                cpuTemperature: this.config.showCpuTemperature ? parseFloat(this.getCpuTemperature()) : null,
                privateIp: this.config.showPrivateIp ? this.getPrivateIP() : null,
                volume: this.config.showVolume ? parseFloat(this.getVolume()) : null,
            };

            Log.info(`[${this.name}] Stats generated: ${JSON.stringify(stats)}`);

            if (this.validateStats(stats)) {
                this.sendSocketNotificationSafely("STATS", stats);
            } else {
                Log.warn(`[${this.name}] Some stats may be missing or invalid: ${JSON.stringify(stats)}`);
            }
        } catch (error) {
            Log.error(`[${this.name}] Error generating stats: ${error.message}`);
        }

        setTimeout(() => {
            self.getStats();
        }, this.config.updateInterval);
    },

    getCpuUsage: function () {
        return this.executeCommand(this.config.cpuUsageCommand, "CPU usage");
    },

    getRamUsage: function () {
        return this.executeCommand(this.config.ramUsageCommand, "RAM usage");
    },

    getDiskUsage: function () {
        return this.executeCommand(this.config.diskUsageCommand, "Disk usage");
    },

    getCpuTemperature: function () {
        const temperature = this.executeCommand(this.config.cpuTemperatureCommand, "CPU temperature");
        return temperature ? this.convertTemperature(parseFloat(temperature)) : null;
    },

    getPrivateIP: function () {
        const interfaces = os.networkInterfaces();
        for (const iface in interfaces) {
            for (const addr of interfaces[iface]) {
                if (!addr.internal && addr.family === "IPv4") {
                    Log.info(`[${this.name}] Found private IP: ${addr.address}`);
                    return addr.address;
                }
            }
        }
        Log.warn(`[${this.name}] No private IP found.`);
        return null;
    },

    getVolume: function () {
        if (!this.config.showVolumeCommand) {
            Log.warn(`[${this.name}] Volume command is not configured.`);
            return null;
        }
        return this.executeCommand(this.config.showVolumeCommand, "Volume");
    },

    executeCommand: function (cmd, description) {
        try {
            Log.info(`[${this.name}] Executing command: ${cmd}`);
            const result = execSync(cmd).toString().trim();
            Log.info(`[${this.name}] Command output for ${description}: ${result}`);
            return result;
        } catch (error) {
            Log.error(`[${this.name}] Error executing ${description} command: ${error.message}`);
            return null;
        }
    },

    convertTemperature: function (temperature) {
        let convertedTemp;
        switch (this.config.units) {
            case "imperial":
                convertedTemp = ((temperature / 1000) * 1.8 + 32).toFixed(0);
                break;
            case "metric":
            default:
                convertedTemp = (temperature / 1000).toFixed(0);
        }
        return convertedTemp;
    },

    validateStats: function (stats) {
        for (const [key, value] of Object.entries(stats)) {
            if (this.config[`show${key.charAt(0).toUpperCase() + key.slice(1)}`] && (value === null || isNaN(value))) {
                Log.warn(`[${this.name}] Invalid or missing data for ${key}: ${value}`);
                return false;
            }
        }
        return true;
    },

    sendSocketNotificationSafely: function (notification, payload) {
        try {
            Log.info(`[${this.name}] Sending socket notification: ${notification} with payload: ${JSON.stringify(payload)}`);
            this.sendSocketNotification(notification, payload);
        } catch (error) {
            Log.error(`[${this.name}] Error sending socket notification: ${error.message}`);
        }
    },
});

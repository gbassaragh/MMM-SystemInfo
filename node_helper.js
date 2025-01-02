const NodeHelper = require("node_helper");
const { execSync } = require("child_process");
const Log = require("logger");

module.exports = NodeHelper.create({
    start: function () {
        Log.info(`[${this.name}] Node helper started.`);
        this.connected = true;
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            Log.info(`[${this.name}] Configuration received.`);
            this.getStats();
        } else if (notification === "DISCONNECT") {
            this.connected = false;
            Log.warn(`[${this.name}] Socket disconnected.`);
        } else if (notification === "CONNECT") {
            this.connected = true;
            Log.info(`[${this.name}] Socket reconnected.`);
        }
    },

    getStats: function () {
        if (!this.connected) {
            Log.warn(`[${this.name}] No active socket connection. Skipping stats generation.`);
            return;
        }

        const stats = {
            cpuUsage: this.config.showCpuUsage ? this.getCpuUsage() : null,
            ramUsage: this.config.showRamUsage ? this.getRamUsage() : null,
            diskUsage: this.config.showDiskUsage ? this.getDiskUsage() : null,
            cpuTemperature: this.config.showCpuTemperature ? this.getCpuTemperature() : null,
            privateIp: this.config.showPrivateIp ? null : null, // Placeholder if logic is expanded.
            volume: this.config.showVolume ? null : null, // Placeholder if logic is expanded.
        };

        this.validateAndSendStats(stats);

        setTimeout(() => {
            this.getStats();
        }, this.config.updateInterval);
    },

    validateAndSendStats: function (stats) {
        try {
            Log.info(`[${this.name}] Stats generated: ${JSON.stringify(stats)}`);

            // Sanitize payload
            const sanitizedStats = JSON.stringify(stats).replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

            // Check payload size
            const MAX_PAYLOAD_SIZE = 10000;
            if (sanitizedStats.length > MAX_PAYLOAD_SIZE) {
                throw new Error(`Payload size exceeds limit: ${sanitizedStats.length}`);
            }

            Log.info(`[${this.name}] Sending socket notification: STATS`);
            this.sendSocketNotification("STATS", JSON.parse(sanitizedStats));
        } catch (error) {
            Log.error(`[${this.name}] Failed to send stats: ${error.message}`);
        }
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
        const temp = this.executeCommand(this.config.cpuTemperatureCommand, "CPU temperature");
        return temp ? this.convertTemperature(temp) : null;
    },

    executeCommand: function (cmd, description) {
        if (!cmd) {
            Log.info(`[${this.name}] No command provided for ${description}. Skipping.`);
            return null;
        }
        try {
            Log.info(`[${this.name}] Executing command: ${cmd}`);
            const result = execSync(cmd).toString().trim();
            Log.info(`[${this.name}] Command output for ${description}: ${result}`);
            return result;
        } catch (error) {
            Log.error(`[${this.name}] Error executing command for ${description}: ${error.message}`);
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
});

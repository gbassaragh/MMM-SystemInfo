const NodeHelper = require("node_helper");
const { execSync } = require("child_process");
const Log = require("logger");
const os = require("os");

module.exports = NodeHelper.create({
    start: function () {
        Log.info(`[${this.name}] Node helper started.`);
        this.connected = true; // Track connection status
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
            Log.error(`[${this.name}] No active socket connection. Skipping stats generation.`);
            return;
        }

        const stats = {
            cpuUsage: this.config.showCpuUsage ? this.getCpuUsage() : null,
            ramUsage: this.config.showRamUsage ? this.getRamUsage() : null,
            diskUsage: this.config.showDiskUsage ? this.getDiskUsage() : null,
            cpuTemperature: this.config.showCpuTemperature ? this.getCpuTemperature() : null,
            privateIp: this.config.showPrivateIp ? this.getPrivateIp() : null,
            volume: this.config.showVolume ? this.getVolume() : null,
        };

        Log.info(`[${this.name}] Stats generated: ${JSON.stringify(stats)}`);
        
        this.sendSocketNotificationWithRetry("STATS", stats);

        setTimeout(() => {
            this.getStats();
        }, this.config.updateInterval);
    },

    getCpuUsage: function () {
        const cmd = this.config.cpuUsageCommand;
        return this.executeCommand(cmd, "CPU usage");
    },

    getRamUsage: function () {
        const cmd = this.config.ramUsageCommand;
        return this.executeCommand(cmd, "RAM usage");
    },

    getDiskUsage: function () {
        const cmd = this.config.diskUsageCommand;
        return this.executeCommand(cmd, "Disk usage");
    },

    getCpuTemperature: function () {
        const cmd = this.config.cpuTemperatureCommand;
        const temp = this.executeCommand(cmd, "CPU temperature");
        return temp ? this.convertTemperature(temp) : null;
    },

    getPrivateIp: function () {
        if (!this.config.showPrivateIp) return null;
        const interfaces = os.networkInterfaces();
        for (const iface in interfaces) {
            for (const addr of interfaces[iface]) {
                if (!addr.internal && addr.family === "IPv4") {
                    return addr.address;
                }
            }
        }
        return null;
    },

    getVolume: function () {
        const cmd = this.config.volumeCommand;
        return this.executeCommand(cmd, "Volume");
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

    sendSocketNotificationWithRetry: function (notification, payload, retries = 3) {
        const payloadString = JSON.stringify(payload);
        const MAX_PAYLOAD_SIZE = 10000;

        if (payloadString.length > MAX_PAYLOAD_SIZE) {
            Log.error(`[${this.name}] Payload size exceeds limit: ${payloadString.length}`);
            return;
        }

        try {
            Log.info(`[${this.name}] Sending socket notification: ${notification}`);
            this.sendSocketNotification(notification, payload);
        } catch (error) {
            if (retries > 0) {
                Log.warn(`[${this.name}] Socket notification failed. Retrying... (${retries} retries left)`);
                setTimeout(() => {
                    this.sendSocketNotificationWithRetry(notification, payload, retries - 1);
                }, 1000);
            } else {
                Log.error(`[${this.name}] Failed to send socket notification after retries: ${error.message}`);
            }
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

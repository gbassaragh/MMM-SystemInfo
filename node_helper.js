const NodeHelper = require("node_helper");
const { execSync } = require("child_process");
const Log = require("logger");
const os = require("os");

module.exports = NodeHelper.create({
    start: function () {
        Log.info(`[${this.name}] Node helper started.`);
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            Log.info(`[${this.name}] Received CONFIG notification.`);
            this.config = payload;
            this.getStats();
        }
    },

    getStats: function () {
        try {
            const stats = {
                cpuUsage: this.getCpuUsage(),
                ramUsage: this.getRamUsage(),
                diskUsage: this.getAvailableSpacePercentage(),
                cpuTemperature: this.getCpuTemperature(),
                privateIp: this.getPrivateIP(),
                volume: this.getVolume()
            };

            Log.info(`[${this.name}] Stats generated: ${JSON.stringify(stats)}`);

            // Debugging individual fields before sending
            Log.info(`[${this.name}] Debugging stats fields: CPU: ${stats.cpuUsage}, RAM: ${stats.ramUsage}, Disk: ${stats.diskUsage}, Temp: ${stats.cpuTemperature}, IP: ${stats.privateIp}, Volume: ${stats.volume}`);

            // Send stats safely
            if (this.isValidStats(stats)) {
                this.sendSocketNotification("STATS", stats);
            } else {
                Log.error(`[${this.name}] Invalid stats detected. Stats not sent: ${JSON.stringify(stats)}`);
            }

            setTimeout(() => this.getStats(), this.config.updateInterval);
        } catch (error) {
            Log.error(`[${this.name}] Error generating stats: ${error.message}`);
        }
    },

    getCpuUsage: function () {
        return this.config.showCpuUsage ? parseFloat(this.safeExec(this.config.cpuUsageCommand)) || 0 : null;
    },

    getRamUsage: function () {
        return this.config.showRamUsage ? parseFloat(this.safeExec(this.config.ramUsageCommand)) || 0 : null;
    },

    getAvailableSpacePercentage: function () {
        return this.config.showDiskUsage ? this.safeExec(this.config.diskUsageCommand) || "0%" : null;
    },

    getCpuTemperature: function () {
        if (this.config.showCpuTemperature) {
            const temp = this.safeExec(this.config.cpuTemperatureCommand);
            return temp ? this.convertTemperature(temp) : null;
        }
        return null;
    },

    getPrivateIP: function () {
        if (this.config.showPrivateIp) {
            const interfaces = os.networkInterfaces();
            for (const iface in interfaces) {
                for (const addr of interfaces[iface]) {
                    if (!addr.internal && addr.family === "IPv4") {
                        return addr.address;
                    }
                }
            }
        }
        return null;
    },

    getVolume: function () {
        return this.config.showVolume ? parseFloat(this.safeExec(this.config.showVolumeCommand)) || 0 : null;
    },

    safeExec: function (cmd) {
        try {
            Log.info(`[${this.name}] Executing command: ${cmd}`);
            const result = execSync(cmd, { stdio: "pipe" }); // Safer stdio option
            const output = result.toString().trim();
            Log.info(`[${this.name}] Command output: ${output}`);
            return output;
        } catch (error) {
            Log.error(`[${this.name}] Error executing command: ${cmd}`);
            Log.error(`[${this.name}] Command error message: ${error.message}`);
            return null;
        }
    },

    isValidStats: function (stats) {
        // Check for NaN or undefined in any stats value
        return Object.values(stats).every(value => value !== null && value !== undefined);
    },

    convertTemperature: function (temperature) {
        let convertedTemp;
        const tempCelsius = parseFloat(temperature) / 1000;

        switch (this.config.units) {
            case "imperial":
                convertedTemp = ((tempCelsius * 1.8) + 32).toFixed(0);
                break;
            case "metric":
            default:
                convertedTemp = tempCelsius.toFixed(0);
        }

        return convertedTemp;
    }
});

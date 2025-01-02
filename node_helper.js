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

            // Set default disk usage command if not provided
            if (!this.config.diskUsageCommand || this.config.diskUsageCommand.trim() === "") {
                this.config.diskUsageCommand = "df --output=pcent / | tail -1 | tr -d '% '";
                Log.info(`[${this.name}] Default disk usage command applied: ${this.config.diskUsageCommand}`);
            }

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

            if (this.isValidStats(stats)) {
                this.sendSocketNotification("STATS", stats);
            } else {
                Log.warn(`[${this.name}] Some stats may be missing. Stats: ${JSON.stringify(stats)}`);
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
        if (!this.config.showDiskUsage || !this.config.diskUsageCommand) {
            Log.info(`[${this.name}] Disk usage command is missing or not enabled.`);
            return null;
        }
        return this.safeExec(this.config.diskUsageCommand) || "N/A";
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
        if (!this.config.showVolume || !this.config.showVolumeCommand) {
            Log.info(`[${this.name}] Volume command is missing or not enabled.`);
            return null;
        }
        return parseFloat(this.safeExec(this.config.showVolumeCommand)) || 0;
    },

    safeExec: function (cmd) {
        if (!cmd) {
            Log.error(`[${this.name}] Attempted to execute an empty command.`);
            return null;
        }

        try {
            Log.info(`[${this.name}] Executing command: ${cmd}`);
            const result = execSync(cmd, { stdio: "pipe" });
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
        // Allow `null` for optional stats like volume
        return Object.keys(stats).every(key => {
            const value = stats[key];
            return value !== undefined && (key === "volume" || value !== null);
        });
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

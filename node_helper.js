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
        const self = this;

        try {
            this.stats = {
                cpuUsage: this.getCpuUsage(),
                ramUsage: this.getRamUsage(),
                diskUsage: this.getAvailableSpacePercentage(),
                cpuTemperature: this.getCpuTemperature(),
                privateIp: this.getPrivateIP(),
                volume: this.getVolume()
            };

            Log.info(`[${this.name}] Stats generated: ${JSON.stringify(this.stats)}`);

            this.sendSocketNotification("STATS", this.stats);

            setTimeout(function () {
                self.getStats();
            }, this.config.updateInterval);
        } catch (error) {
            Log.error(`[${this.name}] Error generating stats: ${error.message}`);
        }
    },

    getCpuUsage: function () {
        if (this.config.showCpuUsage) {
            const output = this.exec(this.config.cpuUsageCommand);
            return output ? parseFloat(output) : 0;
        }
        return null;
    },

    getRamUsage: function () {
        if (this.config.showRamUsage) {
            const output = this.exec(this.config.ramUsageCommand);
            return output ? parseFloat(output) : 0;
        }
        return null;
    },

    getAvailableSpacePercentage: function () {
        if (this.config.showDiskUsage) {
            return this.exec(this.config.diskUsageCommand) || "0%";
        }
        return null;
    },

    getCpuTemperature: function () {
        if (this.config.showCpuTemperature) {
            const temp = this.exec(this.config.cpuTemperatureCommand);
            if (temp) {
                return this.convertTemperature(temp);
            }
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
        if (this.config.showVolume) {
            const output = this.exec(this.config.showVolumeCommand);
            return output ? parseFloat(output) : 0;
        }
        return null;
    },

    exec: function (cmd) {
        try {
            Log.info(`[${this.name}] Executing command: ${cmd}`);
            const result = execSync(cmd);
            const output = result.toString().trim();
            Log.info(`[${this.name}] Command output: ${output}`);
            return output;
        } catch (error) {
            Log.error(`[${this.name}] Error executing command: ${cmd}`);
            Log.error(`[${this.name}] Command error message: ${error.message}`);
            return null;
        }
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

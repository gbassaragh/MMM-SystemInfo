"use strict";

Module.register("MMM-SystemInfo", {
    defaults: {
        tableClass: "small",
        qrSize: 125,
        network: "network",
        password: "pass",
        authType: "WPA",
        hiddenId: false,
        showNetwork: true,
        showPassword: true,
        showAuthType: true,
        showCpuUsage: false,
        cpuUsageCommand: "top -b -n 1 | awk '/^%Cpu/{gsub(/,/, \".\", $8); print 100 - $8}'",
        showRamUsage: false,
        ramUsageCommand: 'free | awk \'/Mem:/ { printf("%.1f\\n", (($3 + $5) / $2) * 100) }\'',
        showDiskUsage: false,
        diskUsageCommand: "df --output=pcent / | tail -1 | tr -d '% '",
        showCpuTemperature: false,
        cpuTemperatureCommand: "cat /sys/class/thermal/thermal_zone0/temp",
        showInternet: true,
        showPrivateIp: true,
        showVolume: false,
        showVolumeCommand: "amixer get Master | grep 'Front Left:' | awk -F '[][]' '{ print $2 }' | tr -d '%'",
        layout: "ltr",
        connectedColor: "#008000",
        disconnectedColor: "#ff0000",
        wifiDataCompact: false,
        units: config.units,
        updateInterval: 2000,
        decimal: 1,
    },

    start: function () {
        this.root = document.querySelector(":root");
        this.stats = {
            cpuUsage: 0,
            ramUsage: 0,
            diskUsage: 0,
            cpuTemperature: 0,
            privateIp: null,
            volume: -1,
        };

        Log.info(`[MMM-SystemInfo] Module started with config: ${JSON.stringify(this.config)}`);
        this.sendSocketNotification("CONFIG", this.config);
    },

    socketNotificationReceived: function (notification, payload) {
        Log.info(`[MMM-SystemInfo] Notification received: ${notification}, Payload: ${JSON.stringify(payload)}`);
        if (notification === "STATS") {
            this.smartUpdate(payload);
            this.stats = payload;
        }
    },

    smartUpdate: function (payload) {
        Log.info(`[MMM-SystemInfo] Updating stats: ${JSON.stringify(payload)}`);
        const updateFunctions = [
            { condition: this.config.showCpuUsage, func: this.updateCpuUsage.bind(this) },
            { condition: this.config.showRamUsage, func: this.updateRamUsage.bind(this) },
            { condition: this.config.showDiskUsage, func: this.updateDiskUsage.bind(this) },
            { condition: this.config.showCpuTemperature, func: this.updateCpuTemperature.bind(this) },
            { condition: this.config.showVolume, func: this.updateVolume.bind(this) },
            { condition: this.config.showInternet, func: this.updateInternet.bind(this) },
            { condition: this.config.showPrivateIp, func: this.updatePrivateIp.bind(this) },
        ];

        updateFunctions.forEach(({ condition, func }) => {
            if (condition) {
                try {
                    func(payload);
                } catch (error) {
                    Log.error(`[MMM-SystemInfo] Error updating field: ${error.message}`);
                }
            }
        });
    },

    updateCpuUsage: function (payload) {
        if (payload.cpuUsage !== undefined && payload.cpuUsage !== this.stats.cpuUsage) {
            const value = this.root.querySelector(".cpuUsage .value");
            if (value) {
                value.innerHTML = `${payload.cpuUsage.toFixed(this.config.decimal)}%`;
            }
        } else {
            Log.warn("[MMM-SystemInfo] CPU Usage update skipped: Missing or unchanged value.");
        }
    },

    updateRamUsage: function (payload) {
        if (payload.ramUsage !== undefined && payload.ramUsage !== this.stats.ramUsage) {
            const value = this.root.querySelector(".ramUsage .value");
            if (value) {
                value.innerHTML = `${payload.ramUsage.toFixed(this.config.decimal)}%`;
            }
        } else {
            Log.warn("[MMM-SystemInfo] RAM Usage update skipped: Missing or unchanged value.");
        }
    },

    updateDiskUsage: function (payload) {
        if (payload.diskUsage !== undefined && payload.diskUsage !== this.stats.diskUsage) {
            const value = this.root.querySelector(".diskUsage .value");
            if (value) {
                value.innerHTML = `${payload.diskUsage}%`;
            }
        } else {
            Log.warn("[MMM-SystemInfo] Disk Usage update skipped: Missing or unchanged value.");
        }
    },

    updateCpuTemperature: function (payload) {
        if (payload.cpuTemperature !== undefined && payload.cpuTemperature !== this.stats.cpuTemperature) {
            const value = this.root.querySelector(".cpuTemperature .value");
            if (value) {
                value.innerHTML = this.config.units === "imperial"
                    ? `${payload.cpuTemperature}°F`
                    : `${payload.cpuTemperature}°C`;
            }
        } else {
            Log.warn("[MMM-SystemInfo] CPU Temperature update skipped: Missing or unchanged value.");
        }
    },

    updatePrivateIp: function (payload) {
        if (payload.privateIp !== undefined && payload.privateIp !== this.stats.privateIp) {
            const wrapper = this.root.querySelector(".privateIp");
            if (wrapper) {
                wrapper.querySelector(".key").innerHTML = payload.privateIp;
                wrapper.querySelector(".status").className = `fa status bold ${
                    payload.privateIp === null ? "offline fa-times" : "online fa-check"
                }`;
            }
        } else {
            Log.warn("[MMM-SystemInfo] Private IP update skipped: Missing or unchanged value.");
        }
    },

    updateVolume: function (payload) {
        if (payload.volume !== null && payload.volume !== this.stats.volume) {
            const wrapper = this.root.querySelector(".volume");
            if (wrapper) {
                wrapper.querySelector(".fa").className = "fa " + this.volumeStatus(payload.volume);
                wrapper.querySelector(".value").innerHTML = `${payload.volume}%`;
            }
        } else if (payload.volume === null) {
            Log.info("[MMM-SystemInfo] Volume is null, skipping update.");
        }
    },

    updateInternet: function () {
        const value = this.root.querySelector(".internet .status");
        if (value) {
            value.className = `fa status bold ${
                navigator.onLine ? "online fa-check" : "offline fa-times"
            }`;
        } else {
            Log.warn("[MMM-SystemInfo] Internet update skipped: Element not found.");
        }
    },

    volumeStatus(number) {
        if (number >= 0 && number <= 10) {
            return "fa-volume-off";
        } else if (number >= 80 && number <= 100) {
            return "fa-volume-up";
        } else {
            return "fa-volume-down";
        }
    },

    getScripts: function () {
        return [this.file("utils/qrcode.min.js")];
    },

    getStyles: function () {
        return [this.file("css/MMM-SystemInfo.css")];
    },
});

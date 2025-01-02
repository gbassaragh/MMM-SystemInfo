"use strict";

Module.register("MMM-SystemInfo", {
    // Default module config.
    defaults: {
        tableClass: 'small',
        qrSize: 125,
        network: 'network',
        password: 'pass',
        authType: 'WPA',
        hiddenId: false,
        showNetwork: true,
        showPassword: true,
        showAuthType: true,
        showCpuUsage: false,
        cpuUsageCommand: "top -b -n 1 | awk '/^%Cpu/{gsub(/,/, \".\", $8); print 100 - $8}'",
        showRamUsage: false,
        ramUsageCommand: 'free | awk \'/Mem:/ { printf("%.1f\\n", (($3 + $5) / $2) * 100) }\'',
        showDiskUsage: false,
        diskUsageCommand: "",
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

    getTranslations() {
        return {
            en: "translations/en.json",
            es: "translations/es.json"
        };
    },

    getDom: function () {
        this.root = document.createElement("div");
        const wifiDiv = this.createWifiDiv();
        const systemDiv = this.createSystemDiv();
        this.root.classList.add(
            'SI-container',
            this.config.tableClass,
            'layout-' + this.config.layout
        );

        wifiDiv.classList.add('SI-wifi');
        systemDiv.classList.add('SI-system-info');

        this.root.appendChild(wifiDiv);
        this.root.appendChild(systemDiv);

        return this.root;
    },

    createSystemDiv: function () {
        const table = document.createElement("table");

        const conditionsAndFunctions = [
            { condition: this.config.showCpuUsage, func: this.showCpuUsage.bind(this) },
            { condition: this.config.showRamUsage, func: this.showRamUsage.bind(this) },
            { condition: this.config.showDiskUsage, func: this.showDiskUsage.bind(this) },
            { condition: this.config.showCpuTemperature, func: this.showCpuTemperature.bind(this) },
            { condition: this.config.showVolume, func: this.showVolume.bind(this) },
            { condition: this.config.showInternet, func: this.showInternet.bind(this) },
            { condition: this.config.showPrivateIp, func: this.showPrivateIp.bind(this) }
        ];

        conditionsAndFunctions.forEach(({ condition, func }) => {
            if (condition) {
                table.appendChild(func());
            }
        });

        return table;
    },

    showCpuUsage: function () {
        return this.createRow('cpuUsage', 'fa-tachometer', this.translate("CPU_USAGE_PERCENT"));
    },
    showRamUsage: function () {
        return this.createRow('ramUsage', 'fa-microchip', this.translate("RAM_USAGE_PERCENT"));
    },
    showDiskUsage: function () {
        return this.createRow('diskUsage', 'fa-hard-drive', this.translate("DISK_USAGE_PERCENT"));
    },
    showCpuTemperature: function () {
        return this.createRow('cpuTemperature', 'fa-thermometer', this.translate("TEMPERATURE"));
    },
    showInternet: function () {
        const tr = this.createRow('internet', 'fa-wifi', this.translate("INTERNET"));
        const statusIcon = this.html.icon();
        statusIcon.classList.add('status');
        tr.lastChild.appendChild(statusIcon);
        return tr;
    },
    showPrivateIp: function () {
        const tr = this.createRow('privateIp', 'fa-network-wired', '');
        const statusIcon = this.html.icon();
        statusIcon.classList.add('status');
        tr.lastChild.appendChild(statusIcon);
        return tr;
    },
    showVolume: function () {
        return this.createRow('volume', '', this.translate("VOLUME"));
    },

    createRow: function (className, iconClass, labelText) {
        const tr = this.html.tr();
        const td1 = this.html.td();
        const td2 = this.html.td();
        const icon = this.html.icon();
        const key = this.html.key();
        const value = this.html.value();

        tr.classList.add(className);
        if (iconClass) icon.classList.add(iconClass);
        key.innerHTML = labelText;

        td1.appendChild(icon);
        td1.appendChild(key);
        tr.appendChild(td1);

        td2.appendChild(value);
        tr.appendChild(td2);

        return tr;
    },

    start: function () {
        this.root = document.querySelector(":root");
        this.stats = {
            cpuUsage: 0,
            ramUsage: 0,
            diskUsage: 0,
            cpuTemperature: 0,
            privateIp: null,
            volume: -1
        };

        this.html = {
            tr: () => document.createElement("tr"),
            td: () => document.createElement("td"),
            icon: () => {
                const i = document.createElement("i");
                i.className = 'fa';
                return i;
            },
            key: () => {
                const span = document.createElement("span");
                span.className = 'key';
                return span;
            },
            value: () => {
                const span = document.createElement("div");
                span.className = 'value';
                return span;
            }
        };

        this.sendSocketNotification("CONFIG", this.config);
    },

    smartUpdate: function (payload) {
        const conditionsAndFunctions = [
            { condition: this.config.showCpuUsage, func: this.updateCpuUsage.bind(this) },
            { condition: this.config.showRamUsage, func: this.updateRamUsage.bind(this) },
            { condition: this.config.showDiskUsage, func: this.updateDiskUsage.bind(this) },
            { condition: this.config.showCpuTemperature, func: this.updateCpuTemperature.bind(this) },
            { condition: this.config.showVolume, func: this.updateVolume.bind(this) },
            { condition: this.config.showInternet, func: this.updateInternet.bind(this) },
            { condition: this.config.showPrivateIp, func: this.updatePrivateIp.bind(this) }
        ];

        conditionsAndFunctions.forEach(({ condition, func }) => {
            if (condition) {
                func(payload);
            }
        });
    },

    updateCpuUsage: function (payload) {
        this.updateValue('.cpuUsage', payload.cpuUsage, "%");
    },
    updateRamUsage: function (payload) {
        this.updateValue('.ramUsage', payload.ramUsage, "%");
    },
    updateDiskUsage: function (payload) {
        this.updateValue('.diskUsage', payload.diskUsage, "%");
    },
    updateCpuTemperature: function (payload) {
        this.updateValue('.cpuTemperature', payload.cpuTemperature, this.config.units === "imperial" ? "°F" : "°C");
    },
    updateVolume: function (payload) {
        const wrapper = this.root.querySelector('.volume');
        if (wrapper) {
            const icon = wrapper.querySelector('.fa');
            const value = wrapper.querySelector('.value');
            if (icon) icon.className = 'fa ' + this.volumeStatus(payload.volume);
            if (value) value.innerHTML = payload.volume + '%';
        }
    },
    updateInternet: function () {
        const statusIcon = this.root.querySelector('.internet .status');
        if (statusIcon) {
            statusIcon.className = `fa status bold ${window.navigator.onLine ? 'online fa-check' : 'offline fa-times'}`;
        }
    },
    updatePrivateIp: function (payload) {
        const wrapper = this.root.querySelector('.privateIp');
        if (wrapper) {
            const key = wrapper.querySelector('.key');
            const status = wrapper.querySelector('.status');
            if (key) key.innerHTML = payload.privateIp;
            if (status) status.className = `fa status bold ${payload.privateIp ? 'online fa-check' : 'offline fa-times'}`;
        }
    },

    updateValue: function (selector, value, unit = "") {
        const valueElement = this.root.querySelector(`${selector} .value`);
        if (valueElement) {
            valueElement.innerHTML = value.toFixed(this.config.decimal) + unit;
        }
    },

    volumeStatus: function (volume) {
        if (volume <= 10) return "fa-volume-off";
        if (volume >= 80) return "fa-volume-up";
        return "fa-volume-down";
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "STATS") {
            this.smartUpdate(payload);
            this.stats = { ...this.stats, ...payload };
        }
    },

    getScripts: function () {
        return [this.file('utils/qrcode.min.js')];
    },

    getStyles: function () {
        return [this.file('css/MMM-SystemInfo.css')];
    }
});

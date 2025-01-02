Module.register("MMM-SystemInfo", {
    defaults: {
        updateInterval: 5000,
        cpu: true,
        ram: true,
        disk: true,
        cpuTemperature: true
    },

    start: function () {
        this.stats = {};
        this.sendSocketNotification("CONFIG", this.config);
        this.updateDom();
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "STATS") {
            this.stats = payload;
            this.updateDom();
        }
    },

    getDom: function () {
        const wrapper = document.createElement("div");

        const statKeys = Object.keys(this.stats);
        if (statKeys.length === 0) {
            wrapper.innerHTML = "<p>Loading stats...</p>";
            return wrapper;
        }

        wrapper.innerHTML = `
            <p>CPU Usage: ${this.stats.cpuUsage || "N/A"}%</p>
            <p>RAM Usage: ${this.stats.ramUsage || "N/A"}%</p>
            <p>Disk Usage: ${this.stats.diskUsage || "N/A"}%</p>
            <p>CPU Temperature: ${this.stats.cpuTemperature || "N/A"}°C</p>
        `;
        return wrapper;
    }
});

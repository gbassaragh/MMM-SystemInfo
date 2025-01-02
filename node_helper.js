const NodeHelper = require("node_helper");
const statsFetcher = require("./utils/statsFetcher");
const logger = require("./utils/logger");

module.exports = NodeHelper.create({
    start: function () {
        this.config = {};
        logger.info("MMM-SystemInfo helper started.");
    },

    socketNotificationReceived: function (notification, payload) {
        if (notification === "CONFIG") {
            this.config = payload;
            logger.info("Configuration received:", this.config);
            this.scheduleStatsFetching();
        }
    },

    scheduleStatsFetching: function () {
        if (this.fetchInterval) clearInterval(this.fetchInterval);

        this.fetchInterval = setInterval(async () => {
            try {
                const stats = await statsFetcher.fetchAll(this.config);
                logger.info("Stats fetched successfully:", stats);
                this.sendSocketNotification("STATS", stats);
            } catch (error) {
                logger.error("Error fetching stats:", error.message);
            }
        }, this.config.updateInterval || 5000);
    }
});

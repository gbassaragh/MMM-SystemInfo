// Node Helper
const NodeHelper = require("node_helper");
const { exec } = require("child_process");

module.exports = NodeHelper.create({
  start: function() {
    console.log("Starting node helper for: MMM-RPiSystemInfo");
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "GET_SYSTEM_INFO") {
      this.getSystemInfo();
    }
  },

  getSystemInfo: function() {
    exec("top -bn1 | grep '%Cpu' | awk '{print $2}'", (err, cpuUsage) => {
      exec("vcgencmd measure_temp | awk -F'=' '{print $2}'", (err, cpuTemp) => {
        exec("free | grep Mem | awk '{print $3/$2 * 100.0}'", (err, ramUsage) => {
          exec("df -h / | tail -1 | awk '{print $4}'", (err, diskFree) => {
            exec("ping -c 1 google.com > /dev/null 2>&1 && echo '✔️' || echo '❌'", (err, internetStatus) => {
              this.sendSocketNotification("SYSTEM_INFO", {
                cpuUsage: parseFloat(cpuUsage).toFixed(1) + "%",
                cpuTemp: cpuTemp.trim(),
                ramUsage: parseFloat(ramUsage).toFixed(1) + "%",
                diskFree: diskFree.trim(),
                internetStatus: internetStatus.trim() === '✔️' ? '✔️' : '❌'
              });
            });
          });
        });
      });
    });
  }
});

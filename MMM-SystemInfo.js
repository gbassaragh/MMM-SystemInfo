Module.register("MMM-SystemInfo", {
  defaults: {
    updateInterval: 10000, // 10 seconds
  },

  start: function() {
    this.systemInfo = {
      cpuUsage: "--%",
      cpuTemp: "--.-C",
      ramUsage: "--%",
      diskFree: "--.-GB",
      internetStatus: "❌"
    };
    this.getData();
    setInterval(() => {
      this.getData();
    }, this.config.updateInterval);
  },

  getData: function() {
    this.sendSocketNotification("GET_SYSTEM_INFO");
  },

  socketNotificationReceived: function(notification, payload) {
    if (notification === "SYSTEM_INFO") {
      this.systemInfo = payload;
      this.updateDom();
    }
  },

  getDom: function() {
    let wrapper = document.createElement("div");
    wrapper.innerHTML = `
      <div>CPU Usage: ${this.systemInfo.cpuUsage}</div>
      <div>CPU Temp: ${this.systemInfo.cpuTemp}</div>
      <div>RAM Usage: ${this.systemInfo.ramUsage}</div>
      <div>Disk Free: ${this.systemInfo.diskFree}</div>
      <div>Internet: <span style="color:${this.systemInfo.internetStatus === '✔️' ? 'green' : 'red'}">${this.systemInfo.internetStatus}</span></div>
    `;
    return wrapper;
  }
});

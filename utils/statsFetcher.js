const exec = require("util").promisify(require("child_process").exec);

const fetchCpuUsage = async () => {
    const { stdout } = await exec("top -b -n 1 | awk '/^%Cpu/{gsub(/,/, \".\", $8); print 100 - $8}'");
    return parseFloat(stdout.trim());
};

const fetchRamUsage = async () => {
    const { stdout } = await exec("free | awk '/Mem:/ { printf(\"%.1f\", (($3 + $5) / $2) * 100) }'");
    return parseFloat(stdout.trim());
};

const fetchDiskUsage = async () => {
    const { stdout } = await exec("df --output=pcent / | tail -1 | tr -d '% '");
    return parseInt(stdout.trim(), 10);
};

const fetchCpuTemperature = async () => {
    const { stdout } = await exec("cat /sys/class/thermal/thermal_zone0/temp");
    return Math.round(parseInt(stdout.trim(), 10) / 1000);
};

const fetchAll = async (config) => {
    const results = {};

    if (config.cpu) results.cpuUsage = await fetchCpuUsage();
    if (config.ram) results.ramUsage = await fetchRamUsage();
    if (config.disk) results.diskUsage = await fetchDiskUsage();
    if (config.cpuTemperature) results.cpuTemperature = await fetchCpuTemperature();

    return results;
};

module.exports = { fetchAll };

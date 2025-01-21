# MMM-SystemInfo

A MagicMirror module to display Raspberry Pi system information such as:

- CPU Usage
- CPU Temperature
- RAM Usage
- Disk Free Space
- Internet Connection Status

## Installation

1. Navigate to your MagicMirror modules directory:
   ```bash
   cd ~/MagicMirror/modules
2. Clone the repositiory
   git clone https://github.com/gbassaragh/MMM-SystemInfo.git

3. Install dependencies
  cd MMM-SystemInfo
  npm install
  
4. Add the module to your config.js:
  {
  module: "MMM-RPiSystemInfo",
  position: "top_right",
  config: {
    updateInterval: 10000
  }
}

5. 

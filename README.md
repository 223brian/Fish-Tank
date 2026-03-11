# Fish Tank Monitor

This is a Fish Tank monitoring tool.

## Architecture Overview

- **Hardware (Raspberry Pi):** Reads sensors (Temperature, pH, and TDS ) every 60 seconds. Streams h264 video.
- **Networking (Tailscale):** Creates a secure VPN tunnel between the Pi and the server. No public ports are exposed.
- **Backend (EC2):** A Python FastAPI server backed by SQLite for data storage, and MediaMTX for converting raw RTSP video into web-friendly HLS streams.
- **Frontend:** An HTML/JS dashboard featuring real-time sensor data, historical logs, "smart" status alerts, and a custom livestream player.

---

## 1. Prerequisites

Before installing, you must set up the VPN. Here are instructions on setting up Tailscale, but you can bring your own alternative.

1.  Create a free account at [Tailscale](https://tailscale.com)
2.  Install Tailscale on your cloud server (e.g., AWS EC2) and authenticate it.
    - `curl -fsSL https://tailscale.com/install.sh | sh`
    - `sudo tailscale up`
3.  Install Tailscale on your Raspberry Pi and authenticate it.
4.  Note the **Tailscale IP address** (starts with `100.x.x.x`) of your cloud server. You will need this for the configuration files.

---

## 2. Server Setup (EC2 / Cloud)

This assumes an Ubuntu/Debian server.

### A. Install Python and Dependencies

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install python3-pip python3-venv -y

git clone https://github.com/223brian/Fish-Tank.git
cd Fish-Tank/web/backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### B. Configure and Start the Web API

1.  Copy the `web.service.template` from the `systemd-templates` folder.
2.  Replace `{USERNAME}` with your server user (e.g., `ubuntu`).
3.  Replace `{PATH_TO_BACKEND_DIR}` with the absolute path to your `web/backend` folder.
4.  Save it to `/etc/systemd/system/fishtank-web.service`.
5.  Start the service:
    ```bash
    sudo systemctl daemon-reload
    sudo systemctl enable --now fishtank-web
    ```

### C. Install MediaMTX (Video Server)

MediaMTX is required to translate the raw camera feed into a web-playable format.

1.  Download the latest release from the [MediaMTX GitHub](https://github.com/bluenviron/mediamtx/releases).
2.  Extract it into a folder (e.g., `~/mediamtx`).
3.  Create a systemd service for it (similar to the web API) to keep it running in the background. Make sure the `ExecStart` points to the `mediamtx` binary and its `.yml` config file.

**Firewall Note:** Expose ports `8000` (Web UI) and `8888` (HLS Video) in your cloud provider's firewall.

---

## 3. Hardware Setup (Raspberry Pi)

### A. Software Configuration

1.  Clone this repository to the Pi.
2.  Navigate to the `hardware/` folder.
3.  Copy `config.json.template` to `config.json`.
4.  Edit `config.json` and change the IP address to your **Server's Tailscale IP** (e.g., `100.x.x.x:8000`).

### B. Start the Sensor Service

1.  Copy `hardware-sensor.service.template` from `systemd-templates/`.
2.  Replace the placeholders (`{USERNAME}`, `{PATH_TO_HARDWARE_DIR}`).
3.  Save to `/etc/systemd/system/fishtank-sensor.service`.
4.  Start it: `sudo systemctl enable --now fishtank-sensor`.

### C. Start the Camera Services

\*Note: This relies on `rpicam-vid` and `ffmpeg` being installed on the Pi.

1.  Copy `hardware-camera.service.template` from `systemd-templates/`.
2.  Replace `{USERNAME}`.
3.  Replace `{RTSP_URL}` with your **Server's Tailscale IP** (e.g., `rtsp://100.x.x.x:8554`).
4.  Replace all instances of `{CAM_NUMBER}` with your current camera number (e.g., `cam1`).
5.  Save to `/etc/systemd/system/fishtank-camera1.service`. (or camera2 for the second camera)
6.  Start it: `sudo systemctl enable --now fishtank-camera1`.

**Repeat these steps again for the second camera.**

---

## 5. Troubleshooting & Architecture Notes

**Why use a named pipe for the video?**
Newer versions of `rpicam-vid` (or maybe just the version that came with our off-brand cameras) will crash with a `libav` format error if you attempt to pipe raw video directly to a stdout for network streaming. Creating a named pipe with the `.h264` extension works around it.

**Why does ffmpeg use `-pkt_size 1200`?**
Tailscale (And WireGuard) have strict MTU (Maximum Transmission Unit) limits. This means that forcing smaller packet sizes is necessary to avoid massive packet loss and a crashed stream.

**Why does ffmpeg use `-use_wallclock_as_timestamps 1`?**
When `rpicam-vid` dumps raw data into the pipe, it strips all timestamps. If `ffmpeg` tries to stream data without timestamps, the server will reject it as corrupted. This flag forces `ffmpeg` to generate fresh timestamps on the fly based on the framerate.

**Why does the camera use `--mode 2304:1296`?**
By default, changing the height or width of the image crops it. This flag forces it to stretch instead. (2304:1296 is the resolution of the camera we used).

**Why does ffmpeg use `-rtsp_transport tcp`?**
RTSP streams over UDP by default, which would be fine if low-latency was a priority, but can cause packet loss, freezing, and pixelation. This flag forces the use of TCP instead, which provides much higher quality and reliability, at the cost of a slightly longer delay.

**Why does the camera use `--inline` and `--intra 30`?**
For H.264 streaming, the video server needs keyframes and headers to start decoding. `--intra 30` forces an I-frame (keyframe) every 30 frames, and `--inline` ensures the necessary sequence headers (PPS/SPS) are written to the stream so the server can easily process the feed.

**Why does the camera use `--denoise cdn_off`?**
Disabling color denoise (`cdn_off`) reduces the hardware processing overhead on the Raspberry Pi, which helps maintain a stable stream without dropping frames.

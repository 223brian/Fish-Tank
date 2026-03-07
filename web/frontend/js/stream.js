const stream1 = "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8";
const stream2 =
    "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8";

let currentCamera = 1;
let hls = null;

function loadVideoStream(url) {
    const video = document.getElementById("video-player");

    // clean up the old stream if one exists
    if (hls) {
        hls.destroy();
    }

    if (Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
            video.play().catch((e) => console.log("Autoplay prevented", e));
        });
    } else if (video.canPlayType("application/vnd.apple.mepgurl")) {
        video.src = url;
        video.addEventListener("loadedmetadata", function () {
            video.play().catch((e) => console.log("Autoplay prevented", e));
        });
    }
}

document.getElementById("switch-cam-btn").addEventListener("click", () => {
    const label = document.getElementById("camera-label");
    const btn = document.getElementById("switch-cam-btn");

    if (currentCamera === 1) {
        currentCamera = 2;
        label.textContent = "Camera 2";
        btn.textContent = "Switch to Camera 1";
        loadVideoStream(stream2);
    } else {
        currentCamera = 1;
        label.textContent = "Camera 1";
        btn.textContent = "Switch to Camera 2";
        loadVideoStream(stream1);
    }
});

document.getElementById("fullscreen-btn").addEventListener("click", () => {
    const videoElement = document.getElementById("video-player");

    if (videoElement.requestFullscreen) {
        videoElement.requestFullscreen();
    } else if (videoElement.webkitRequestFullscreen) {
        videoElement.webkitRequestFullscreen();
    } else if (videoElement.msRequestFullscreen) {
        videoElement.msRequestFullscreen();
    }
});

loadVideoStream(stream1);

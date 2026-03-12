const hostname = window.location.hostname;

const stream1 = `http://${hostname}:8888/cam1/index.m3u8`;
const stream2 = `http://${hostname}:8888/cam2/index.m3u8`;

let currentCamera = 1;
let hls = null;

const videoElement = document.getElementById("video-player");
const spinnerElement = document.getElementById("video-spinner");

if (videoElement && spinnerElement) {
    videoElement.addEventListener("playing", () =>
        spinnerElement.classList.remove("active"),
    );
    videoElement.addEventListener("waiting", () =>
        spinnerElement.classList.add("active"),
    );
    videoElement.addEventListener("error", () =>
        spinnerElement.classList.remove("active"),
    );

    // prevent pausing by immediately playing again
    videoElement.addEventListener("pause", () => {
        videoElement.play().catch((e) => console.log("Autoplay prevented", e));
    });
}

function loadVideoStream(url) {
    if (spinnerElement) spinnerElement.classList.add("active");
    const video = document.getElementById("video-player");

    // clean up the old stream if one exists
    if (hls) {
        hls.destroy();
    }

    if (Hls.isSupported()) {
        hls = new Hls({
            // start 6 chunks behind the live to build a buffer
            liveSyncDurationCount: 6,
            // allow the buffer to grow up to 60 seconds
            maxBufferLength: 60,
            maxMaxBufferLength: 60,
            // give it more time to load chunks before giving up
            manifestLoadingMaxRetry: 10,
            levelLoadingMaxRetry: 10,
            fragLoadingMaxRetry: 10,
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, function (event, data) {
            if (data.fatal) {
                switch (data.type) {
                    case Hls.ErrorTypes.NETWORK_ERROR:
                        console.log(
                            "Fatal network error, trying to recover...",
                        );
                        hls.startLoad();
                        break;
                    case Hls.ErrorTypes.MEDIA_ERROR:
                        console.log("Fatal media error, trying to recover...");
                        hls.recoverMediaError();
                        break;
                    default:
                        console.log("Unrecoverable error, destroying player.");
                        hls.destroy();
                        break;
                }
            }
        });
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

window.addEventListener("load", () => {
    loadVideoStream(stream1);
});

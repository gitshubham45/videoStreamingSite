import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

// VP9 produces MSE-compatible WebM chunks; VP8 from MediaRecorder can include
// non-standard elements that Chrome's own ChunkDemuxer rejects.
const MIME = "video/webm; codecs=vp9,opus";

// ─── Broadcaster ────────────────────────────────────────────────────────────

const BroadcastView = () => {
    const previewRef = useRef(null);
    const wsRef = useRef(null);
    const recorderRef = useRef(null);
    const [streaming, setStreaming] = useState(false);
    const [error, setError] = useState(null);

    const start = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            previewRef.current.srcObject = stream;

            const ws = new WebSocket("ws://localhost:8000/ws/broadcast");
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;

            ws.onopen = () => {
                const recorder = new MediaRecorder(stream, { mimeType: MIME });
                recorderRef.current = recorder;

                recorder.ondataavailable = (e) => {
                    if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
                        ws.send(e.data);
                    }
                };

                recorder.start(200); // 200ms chunks for low latency
                setStreaming(true);
            };

            ws.onerror = () => setError("WebSocket connection failed");
        } catch (e) {
            setError("Could not access webcam: " + e.message);
        }
    };

    const stop = () => {
        recorderRef.current?.stop();
        recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
        wsRef.current?.close();
        if (previewRef.current) previewRef.current.srcObject = null;
        setStreaming(false);
    };

    useEffect(() => () => stop(), []);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-black aspect-video relative">
                <video
                    ref={previewRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                />
                {!streaming && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm">
                        Camera preview will appear here
                    </div>
                )}
                {streaming && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold text-white">
                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                        LIVE
                    </div>
                )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {!streaming ? (
                <button
                    onClick={start}
                    className="bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-xl transition"
                >
                    Go Live
                </button>
            ) : (
                <button
                    onClick={stop}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-xl transition"
                >
                    Stop Streaming
                </button>
            )}
        </div>
    );
};

// ─── Viewer ──────────────────────────────────────────────────────────────────

const WatchView = () => {
    const videoRef = useRef(null);
    const wsRef = useRef(null);
    const connIdRef = useRef(0);
    const blobUrlRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState(null);
    const [chunks, setChunks] = useState(0); // visible chunk counter

    const connect = () => {
        setError(null);
        setChunks(0);

        if (!MediaSource.isTypeSupported(MIME)) {
            setError("Your browser does not support WebM/VP8 playback");
            return;
        }

        const id = ++connIdRef.current;
        const alive = () => connIdRef.current === id;

        // Reset the video element so sourceopen fires reliably on every connect
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
            videoRef.current.removeAttribute("src");
            videoRef.current.load();
        }

        const ms = new MediaSource();
        blobUrlRef.current = URL.createObjectURL(ms);
        videoRef.current.src = blobUrlRef.current;

        // Call play() NOW — while we're still inside the button click handler
        // (user gesture context). Calling it later from async callbacks can be
        // blocked by Chrome's autoplay policy.
        videoRef.current.play().catch(() => {});

        ms.addEventListener("sourceopen", () => {
            console.log("[MSE] sourceopen, readyState:", ms.readyState);
            if (!alive()) return;

            const sb = ms.addSourceBuffer(MIME);
            const queue = [];
            let appendCount = 0;

            const flush = () => {
                if (!alive() || sb.updating || queue.length === 0 || ms.readyState !== "open") return;
                try {
                    const chunk = queue.shift();
                    appendCount++;
                    console.log(`[MSE] append #${appendCount} bytes=${chunk.byteLength} queued=${queue.length}`);
                    sb.appendBuffer(chunk);
                } catch (err) {
                    console.error("[MSE] appendBuffer error:", err.name, err.message);
                    if (err.name === "QuotaExceededError" && sb.buffered.length > 0) {
                        const end = sb.buffered.end(sb.buffered.length - 1);
                        sb.remove(sb.buffered.start(0), Math.max(0, end - 5));
                    } else {
                        setError("Stream decode error: " + err.name);
                    }
                }
            };

            sb.addEventListener("updateend", () => {
                if (sb.buffered.length === 0) { flush(); return; }

                const lastIdx = sb.buffered.length - 1;
                const rangeStart = sb.buffered.start(lastIdx);
                const liveEdge = sb.buffered.end(lastIdx);
                const ct = videoRef.current.currentTime;
                console.log(`[MSE] updateend ranges=${sb.buffered.length} last=[${rangeStart.toFixed(2)},${liveEdge.toFixed(2)}] ct=${ct.toFixed(2)} paused=${videoRef.current.paused}`);

                // Keep viewer at live edge — jump if we've drifted or landed in a gap
                if (liveEdge - ct > 2 || ct < rangeStart) {
                    console.log(`[MSE] jump ${ct.toFixed(2)} → ${rangeStart.toFixed(2)}`);
                    videoRef.current.currentTime = rangeStart;
                }

                flush();
            });

            videoRef.current.addEventListener("error", () => {
                const e = videoRef.current.error;
                console.error("[VIDEO] error code:", e?.code, e?.message);
                if (alive()) setError(`Video error (code ${e?.code})`);
            });
            videoRef.current.addEventListener("waiting",  () => console.log("[VIDEO] waiting at", videoRef.current.currentTime.toFixed(2)));
            videoRef.current.addEventListener("playing",  () => console.log("[VIDEO] playing at", videoRef.current.currentTime.toFixed(2)));
            videoRef.current.addEventListener("stalled",  () => console.log("[VIDEO] stalled at", videoRef.current.currentTime.toFixed(2)));

            const ws = new WebSocket("ws://localhost:8000/ws/watch");
            ws.binaryType = "arraybuffer";
            wsRef.current = ws;

            ws.onopen = () => { if (alive()) setConnected(true); };

            ws.onmessage = (e) => {
                if (!alive()) return;
                const first4 = new Uint8Array(e.data, 0, 4);
                const hex = Array.from(first4).map(b => b.toString(16).padStart(2, "0")).join("");
                console.log(`[WS] chunk bytes=${e.data.byteLength} first4=0x${hex}`);
                setChunks(n => n + 1);
                queue.push(e.data);
                flush();
            };

            ws.onclose = (e) => {
                console.log("[WS] closed code=", e.code);
                if (!alive()) return;
                queue.length = 0;
                setConnected(false);
                if (ms.readyState === "open") ms.endOfStream();
            };

            ws.onerror = () => { if (alive()) setError("Stream connection lost"); };
        });
    };

    const disconnect = () => {
        connIdRef.current++;
        wsRef.current?.close();
        wsRef.current = null;
        setConnected(false);
        setChunks(0);
    };

    useEffect(() => () => disconnect(), []);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-black aspect-video relative">
                <video
                    ref={videoRef}
                    playsInline
                    controls
                    className="w-full h-full"
                />
                {!connected && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
                        Press Watch to join
                    </div>
                )}
                {connected && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        WATCHING LIVE
                    </div>
                )}
                {connected && (
                    <div className="absolute top-3 right-3 bg-black/60 px-3 py-1 rounded-full text-xs text-gray-300">
                        chunks: {chunks}
                    </div>
                )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {!connected ? (
                <button
                    onClick={connect}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-semibold px-8 py-3 rounded-xl transition"
                >
                    Watch Live
                </button>
            ) : (
                <button
                    onClick={disconnect}
                    className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-8 py-3 rounded-xl transition"
                >
                    Disconnect
                </button>
            )}
        </div>
    );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const LivePage = () => {
    const navigate = useNavigate();
    const [tab, setTab] = useState("watch");

    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col">
            <nav className="px-8 py-5 flex items-center border-b border-gray-800">
                <button
                    onClick={() => navigate("/")}
                    className="text-gray-400 hover:text-white transition text-sm flex items-center gap-2"
                >
                    ← Home
                </button>
                <span className="mx-auto text-xl font-bold tracking-tight">
                    stream<span className="text-violet-500">vault</span>
                    <span className="ml-2 text-xs font-normal text-red-500 border border-red-500 rounded px-1.5 py-0.5">LIVE</span>
                </span>
            </nav>

            <div className="flex-1 max-w-3xl mx-auto w-full px-4 py-8">
                {/* Tabs */}
                <div className="flex gap-1 bg-gray-900 rounded-xl p-1 mb-8 w-fit mx-auto">
                    {["watch", "broadcast"].map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`px-6 py-2 rounded-lg text-sm font-medium transition capitalize ${
                                tab === t
                                    ? "bg-violet-600 text-white"
                                    : "text-gray-400 hover:text-white"
                            }`}
                        >
                            {t === "broadcast" ? "Go Live" : "Watch Live"}
                        </button>
                    ))}
                </div>

                <div className={tab === "broadcast" ? "" : "hidden"}><BroadcastView /></div>
                <div className={tab === "watch" ? "" : "hidden"}><WatchView /></div>
            </div>
        </div>
    );
};

export default LivePage;

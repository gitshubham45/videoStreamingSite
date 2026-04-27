import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SIGNAL_URL } from "../config";

const RTC_CONFIG = {
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

const sendSignal = (ws, message) => {
    if (ws?.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
    }
};

const BroadcastView = () => {
    const previewRef = useRef(null);
    const wsRef = useRef(null);
    const streamRef = useRef(null);
    const peersRef = useRef(new Map());
    const [streaming, setStreaming] = useState(false);
    const [viewerCount, setViewerCount] = useState(0);
    const [audioMuted, setAudioMuted] = useState(false);
    const [videoClosed, setVideoClosed] = useState(false);
    const [error, setError] = useState(null);

    const closePeer = (viewerId) => {
        const pc = peersRef.current.get(viewerId);
        if (pc) {
            pc.close();
            peersRef.current.delete(viewerId);
            setViewerCount(peersRef.current.size);
        }
    };

    const createOfferForViewer = async (viewerId) => {
        if (!streamRef.current || peersRef.current.has(viewerId)) return;

        const pc = new RTCPeerConnection(RTC_CONFIG);
        peersRef.current.set(viewerId, pc);
        setViewerCount(peersRef.current.size);

        streamRef.current.getTracks().forEach((track) => {
            pc.addTrack(track, streamRef.current);
        });

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                sendSignal(wsRef.current, {
                    type: "candidate",
                    viewerId,
                    candidate: event.candidate,
                });
            }
        };

        pc.onconnectionstatechange = () => {
            if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
                closePeer(viewerId);
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        sendSignal(wsRef.current, {
            type: "offer",
            viewerId,
            sdp: pc.localDescription,
        });
    };

    const start = async () => {
        setError(null);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            previewRef.current.srcObject = stream;
            setAudioMuted(false);
            setVideoClosed(false);

            const ws = new WebSocket(`${SIGNAL_URL}/ws/broadcast`);
            wsRef.current = ws;

            ws.onopen = () => setStreaming(true);
            ws.onerror = () => setError("WebSocket connection failed");
            ws.onclose = () => {
                setStreaming(false);
                peersRef.current.forEach((pc) => pc.close());
                peersRef.current.clear();
                setViewerCount(0);
            };

            ws.onmessage = async (event) => {
                const message = JSON.parse(event.data);

                try {
                    if (message.type === "viewer-joined") {
                        await createOfferForViewer(message.viewerId);
                    }

                    if (message.type === "answer") {
                        const pc = peersRef.current.get(message.viewerId);
                        if (pc && message.sdp) {
                            await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
                        }
                    }

                    if (message.type === "candidate") {
                        const pc = peersRef.current.get(message.viewerId);
                        if (pc && message.candidate) {
                            await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
                        }
                    }

                    if (message.type === "viewer-left") {
                        closePeer(message.viewerId);
                    }
                } catch (err) {
                    setError(`Broadcast signaling failed: ${err.message}`);
                }
            };
        } catch (err) {
            setError(`Could not access webcam: ${err.message}`);
        }
    };

    const stop = () => {
        peersRef.current.forEach((pc) => pc.close());
        peersRef.current.clear();
        setViewerCount(0);
        setAudioMuted(false);
        setVideoClosed(false);

        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;

        wsRef.current?.close();
        wsRef.current = null;

        if (previewRef.current) previewRef.current.srcObject = null;
        setStreaming(false);
    };

    const toggleAudio = () => {
        const nextMuted = !audioMuted;
        streamRef.current?.getAudioTracks().forEach((track) => {
            track.enabled = !nextMuted;
        });
        setAudioMuted(nextMuted);
    };

    const toggleVideo = () => {
        const nextClosed = !videoClosed;
        streamRef.current?.getVideoTracks().forEach((track) => {
            track.enabled = !nextClosed;
        });
        setVideoClosed(nextClosed);
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
                    <>
                        <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold text-white">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                            LIVE
                        </div>
                        <div className="absolute top-3 right-3 bg-black/60 px-3 py-1 rounded-full text-xs text-gray-300">
                            viewers: {viewerCount}
                        </div>
                    </>
                )}
                {videoClosed && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black text-gray-300 text-sm pointer-events-none">
                        Camera is off
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

            {streaming && (
                <div className="flex flex-wrap justify-center gap-3">
                    <button
                        onClick={toggleAudio}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                            audioMuted
                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                : "bg-gray-800 hover:bg-gray-700 text-gray-100"
                        }`}
                    >
                        {audioMuted ? "Unmute Mic" : "Mute Mic"}
                    </button>
                    <button
                        onClick={toggleVideo}
                        className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${
                            videoClosed
                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                : "bg-gray-800 hover:bg-gray-700 text-gray-100"
                        }`}
                    >
                        {videoClosed ? "Open Camera" : "Close Camera"}
                    </button>
                </div>
            )}
        </div>
    );
};

const WatchView = () => {
    const videoRef = useRef(null);
    const wsRef = useRef(null);
    const peerRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [error, setError] = useState(null);

    const resetPeer = () => {
        peerRef.current?.close();
        peerRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const connect = () => {
        setError(null);
        setWaiting(true);
        setConnected(false);
        resetPeer();

        const ws = new WebSocket(`${SIGNAL_URL}/ws/watch`);
        wsRef.current = ws;

        ws.onerror = () => {
            setError("Stream connection lost");
            setWaiting(false);
        };

        ws.onclose = () => {
            setConnected(false);
            setWaiting(false);
            resetPeer();
        };

        ws.onmessage = async (event) => {
            const message = JSON.parse(event.data);

            try {
                if (message.type === "no-broadcaster") {
                    setWaiting(true);
                    setError(null);
                }

                if (message.type === "broadcast-ended") {
                    setWaiting(false);
                    setConnected(false);
                    resetPeer();
                }

                if (message.type === "offer") {
                    resetPeer();
                    const pc = new RTCPeerConnection(RTC_CONFIG);
                    peerRef.current = pc;

                    pc.ontrack = (trackEvent) => {
                        videoRef.current.srcObject = trackEvent.streams[0];
                        videoRef.current.play().catch(() => {});
                        setConnected(true);
                        setWaiting(false);
                    };

                    pc.onicecandidate = (candidateEvent) => {
                        if (candidateEvent.candidate) {
                            sendSignal(wsRef.current, {
                                type: "candidate",
                                candidate: candidateEvent.candidate,
                            });
                        }
                    };

                    pc.onconnectionstatechange = () => {
                        if (["closed", "failed", "disconnected"].includes(pc.connectionState)) {
                            setConnected(false);
                            setWaiting(false);
                        }
                    };

                    await pc.setRemoteDescription(new RTCSessionDescription(message.sdp));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    sendSignal(wsRef.current, {
                        type: "answer",
                        sdp: pc.localDescription,
                    });
                }

                if (message.type === "candidate" && peerRef.current && message.candidate) {
                    await peerRef.current.addIceCandidate(new RTCIceCandidate(message.candidate));
                }
            } catch (err) {
                setWaiting(false);
                setError(`Viewer signaling failed: ${err.message}`);
            }
        };
    };

    const disconnect = () => {
        wsRef.current?.close();
        wsRef.current = null;
        resetPeer();
        setConnected(false);
        setWaiting(false);
    };

    useEffect(() => () => {
        wsRef.current?.close();
        peerRef.current?.close();
        peerRef.current = null;
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    }, []);

    return (
        <div className="flex flex-col items-center gap-6">
            <div className="w-full max-w-2xl rounded-2xl overflow-hidden bg-black aspect-video relative">
                <video
                    ref={videoRef}
                    playsInline
                    controls
                    autoPlay
                    className="w-full h-full object-contain"
                />
                {!connected && (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-sm pointer-events-none">
                        {waiting ? "Connecting..." : "Press Watch to join"}
                    </div>
                )}
                {connected && (
                    <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/60 px-3 py-1 rounded-full text-xs font-semibold text-white">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        WATCHING LIVE
                    </div>
                )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            {!connected && !waiting ? (
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

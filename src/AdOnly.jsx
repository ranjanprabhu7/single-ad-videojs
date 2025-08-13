// AdOnly.jsx
import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "videojs-contrib-ads";
import "videojs-ima";

import "video.js/dist/video-js.css";
import "videojs-contrib-ads/dist/videojs.ads.css";
import "videojs-ima/dist/videojs.ima.css";

// Single VAST sample tag (outstream-friendly)
// const SAMPLE_TAG =
//   "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

const SAMPLE_TAG = "https://raw.githubusercontent.com/vb201/asdasd/refs/heads/main/scoredunks.xml";
export default function AdOnly({ adTagUrl = SAMPLE_TAG }) {
  const el = useRef(null);
  const playerRef = useRef(null);
  const inited = useRef(false);

  // Debug flags so you can see lifecycle in the UI
  const [flags, setFlags] = useState({
    requestAdsCalled: false, // we prefetch exactly once on mount
    adsManagerLoaded: false, // IMA AdsManager exists
    adsReady: false,         // contrib-ads signaled "adsready"
  });

  // If autoplay is blocked, we reveal a tiny overlay button to complete the gesture
  const [needsGesture, setNeedsGesture] = useState(false);

  // Helper: best-effort autoplay when ads are ready
  const tryAutoStartAd = (p) => {
    // 1) Try to init the AdDisplayContainer (works on desktop; mobile may ignore without a gesture)
    try { p.ima.initializeAdDisplayContainer(); } catch {}

    // 2) Start the ad break
    p.ima.playAdBreak();

    // 3) If we don't see an ad actually start soon, assume autoplay was blocked → show overlay
    let started = false;
    const onStart = () => { started = true; p.off("adstart", onStart); };
    p.one("adstart", onStart);

    window.setTimeout(() => {
      if (!started) {
        console.log("[auto] autoplay blocked → showing gesture overlay");
        setNeedsGesture(true);
      }
    }, 1200);
  };

  // Manual start (used only by the fallback overlay)
  const manualStart = () => {
    const p = playerRef.current;
    if (!p) return;
    try { p.ima.initializeAdDisplayContainer(); } catch {}
    p.ima.playAdBreak();
  };

  useEffect(() => {
    if (inited.current) return;
    inited.current = true;

    // Load the IMA SDK (debug build for verbose logs)
    const loadIma = () =>
      new Promise((res, rej) => {
        if (window.google?.ima) return res();
        const s = document.createElement("script");
        // In prod you can switch to: "https://imasdk.googleapis.com/js/sdkloader/ima3.js"
        s.src = "https://imasdk.googleapis.com/js/sdkloader/ima3_debug.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });

    (async () => {
      await loadIma();

      // Create the outstream player (no content sources)
      const player = (playerRef.current = videojs(el.current, {
        autoplay: false,
        muted: true,       // friendlier in autoplay/gesture scenarios
        playsinline: true, // iOS inline playback
        controls: false,   // outstream UX
        width: 640,
        height: 360,
        sources: [],       // IMPORTANT: outstream has NO content
      }));

      // Wire up IMA with manual ad-break control
      player.ima({
        adTagUrl,
        autoPlayAdBreaks: false, // we will start the break ourselves
        debug: true,             // more logs from the plugin
        contribAdsSettings: { playerMode: "outstream", timeout: 8000 },
      });

      // --- Instrumentation (optional but helpful) ---

      // 1) AdsManager created (confirms IMA is ready)
      player.one("ads-manager", (e) => {
        console.log("[IMA] 'ads-manager' event fired. AdsManager available:", !!e?.adsManager);
        setFlags((f) => ({ ...f, adsManagerLoaded: true }));

        const IMA = window.google.ima;
        const am = e.adsManager;
        // Useful IMA events
        am.addEventListener(IMA.AdEvent.Type.LOADED, () =>
          console.log("[IMA] AdEvent.LOADED (creative loaded)")
        );
        am.addEventListener(IMA.AdEvent.Type.STARTED, () =>
          console.log("[IMA] AdEvent.STARTED")
        );
        am.addEventListener(IMA.AdEvent.Type.COMPLETE, () =>
          console.log("[IMA] AdEvent.COMPLETE")
        );
        am.addEventListener(IMA.AdEvent.Type.ALL_ADS_COMPLETED, () =>
          console.log("[IMA] AdEvent.ALL_ADS_COMPLETED")
        );
        am.addEventListener(IMA.AdErrorEvent.Type.AD_ERROR, (ev) =>
          console.warn("[IMA] AdError:", ev?.getError?.()?.getMessage?.())
        );
      });

      // 2) Contrib-ads signals that an ad break can be run
      player.on("adsready", () => {
        console.log("[contrib-ads] 'adsready' fired (OutstreamPending)");
        setFlags((f) => ({ ...f, adsReady: true }));
        // Attempt autoplay as soon as ads are ready
        tryAutoStartAd(player);
      });

      // 3) Contrib-ads ad lifecycle (sanity logs)
      player.on("adstart", () => {
        console.log("[contrib-ads] 'adstart'");
        setNeedsGesture(false); // hide overlay if it was shown
      });
      player.on("adend", () => console.log("[contrib-ads] 'adend'"));
      player.on("adserror", (e) => {
        console.warn("[contrib-ads] 'adserror'", e);
        // On error, also remove overlay if shown
        setNeedsGesture(false);
      });

      // Prefetch ONCE on mount. Do NOT request again later.
      console.log("[IMA] Calling requestAds() now (prefetch once)");
      player.ima.requestAds();
      setFlags((f) => ({ ...f, requestAdsCalled: true }));
    })().catch((e) => console.error("IMA init failed", e));

    return () => {
      try { playerRef.current?.dispose(); } catch {}
    };
  }, [adTagUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ display: "grid", gap: 8, placeItems: "center" }}>
      {/* Make this wrapper relative so we can position the overlay */}
      <div style={{ position: "relative", width: 640, height: 360 }}>
        <video
          ref={el}
          className="video-js vjs-default-skin"
          style={{ width: "100%", height: "100%", background: "#000" }}
          playsInline
        />

        {/* Fallback overlay appears only if autoplay is blocked */}
        {needsGesture && (
          <button
            onClick={manualStart}
            style={{
              position: "absolute",
              inset: "auto 12px 12px auto",
              padding: "8px 12px",
              borderRadius: 8,
              border: "1px solid #444",
              background: "#111",
              color: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
              cursor: "pointer",
              zIndex: 5,
            }}
          >
            Play Ad
          </button>
        )}
      </div>

      {/* tiny debug badge — remove if you like */}
      <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>
        requestAds: {String(flags.requestAdsCalled)} ·{" "}
        adsManagerLoaded: {String(flags.adsManagerLoaded)} ·{" "}
        adsReady: {String(flags.adsReady)} ·{" "}
        needsGesture: {String(needsGesture)}
      </div>
    </div>
  );
}

// AdOnly.jsx
import { useEffect, useRef, useState } from "react";
import videojs from "video.js";
import "videojs-contrib-ads";
import "videojs-ima";

import "video.js/dist/video-js.css";
import "videojs-contrib-ads/dist/videojs.ads.css";
import "videojs-ima/dist/videojs.ima.css";

// Single VAST sample tag (outstream-friendly)
const SAMPLE_TAG =
  "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

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
        autoPlayAdBreaks: false, // we'll start the break ourselves
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
      });

      // 3) Contrib-ads ad lifecycle (sanity logs)
      player.on("adstart", () => console.log("[contrib-ads] 'adstart'"));
      player.on("adend", () => console.log("[contrib-ads] 'adend'"));
      player.on("adserror", (e) => console.warn("[contrib-ads] 'adserror'", e));

      // Prefetch ONCE on mount. Do NOT request again on click.
      console.log("[IMA] Calling requestAds() now (prefetch once)");
      player.ima.requestAds();
      setFlags((f) => ({ ...f, requestAdsCalled: true }));
    })().catch((e) => console.error("IMA init failed", e));

    return () => {
      try {
        playerRef.current?.dispose();
      } catch {}
    };
  }, [adTagUrl]);

  // Button handler:
  // - Must call initializeAdDisplayContainer() inside the user gesture.
  // - For outstream VAST, don't gate on player.play() (there is no content).
  // - Start immediately if adsready already fired; otherwise wait for it once.
  const startAd = () => {
    const p = playerRef.current;
    if (!p) return;

    // 1) Required by browsers: init the ad display container in the gesture
    try {
      p.ima.initializeAdDisplayContainer();
    } catch (e) {
      console.error("Failed to initialize ad display container:", e);
    }

    // 2) Optional: "unlock" the media element in stricter environments
    //    (There’s no content; we ignore the promise rejection)
    try {
      p.muted(true);
      p.play()?.catch(() => {});
    } catch {}

    // 3) Start the ad break (now or when adsready arrives)
    const startBreak = () => {
      console.log("[IMA] Starting ad break now");
      p.ima.playAdBreak();
    };

    if (flags.adsReady) {
      startBreak();
    } else {
      console.log("[IMA] Waiting for 'adsready' before starting ad break");
      p.one("adsready", startBreak);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8, placeItems: "center" }}>
      <video
        ref={el}
        className="video-js vjs-default-skin"
        style={{ width: 640, height: 360, background: "#000" }}
        playsInline
      />
      <button onClick={startAd} disabled={!flags.adsReady}>
        {flags.adsReady ? "Play Ad" : "Loading Ad…"}
      </button>

      {/* tiny debug badge — remove if you like */}
      <div style={{ fontFamily: "monospace", fontSize: 12, opacity: 0.8 }}>
        requestAds: {String(flags.requestAdsCalled)} ·{" "}
        adsManagerLoaded: {String(flags.adsManagerLoaded)} ·{" "}
        adsReady: {String(flags.adsReady)}
      </div>
    </div>
  );
}

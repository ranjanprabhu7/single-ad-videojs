// useImaOutstreamAds.js
import { useEffect, useRef, useState, useCallback } from "react";
import videojs from "video.js";

export default function useImaOutstreamAds({
  adTagUrl,
  autoStart = true,
  hideDefaultUi = true,
  onEvent
}) {
  const videoElRef = useRef(null);
  const playerRef = useRef(null);
  const initializedRef = useRef(false);

  const [flags, setFlags] = useState({
    requestAdsCalled: false,
    adsManagerLoaded: false,
    adsReady: false
  });
  const [needsGesture, setNeedsGesture] = useState(false);

  const emit = useCallback((name, payload) => {
    try { onEvent?.(name, payload); } catch {}
  }, [onEvent]);

  const startAd = useCallback(() => {
    const p = playerRef.current;
    if (!p || !p.ima) return;
    try { p.ima.initializeAdDisplayContainer(); } catch {}
    p.ima.playAdBreak();
  }, []);

  useEffect(() => {
    if (initializedRef.current) return;
    if (!videoElRef.current) return;
    initializedRef.current = true;

    const loadImaSdk = () =>
      new Promise((res, rej) => {
        if (window.google?.ima) return res();
        const s = document.createElement("script");
        s.src = "https://imasdk.googleapis.com/js/sdkloader/ima3_debug.js";
        s.onload = res;
        s.onerror = rej;
        document.head.appendChild(s);
      });

    (async () => {
      // 1) Load Google IMA SDK first
      await loadImaSdk();

      // 2) Ensure plugins register on THIS video.js instance
      window.videojs = videojs;
      await import("videojs-contrib-ads");
      await import("videojs-ima");

      // 3) Create a bare player (outstream)
      const player = (playerRef.current = videojs(videoElRef.current, {
        autoplay: false,
        muted: true,
        controls: false,
        playsinline: true,
        sources: []
      }));

      // 4) Configure IMA WITHOUT adTagUrl to prevent auto-request
      const IMA = window.google.ima;
      const opts = {
        autoPlayAdBreaks: false,
        showCountdown: false,
        contribAdsSettings: { playerMode: "outstream", timeout: 8000 }
      };
      if (hideDefaultUi) {
        const ars = new IMA.AdsRenderingSettings();
        ars.useStyledLinearAds = false;
        ars.uiElements = [];
        opts.adsRenderingSettings = ars;
      }
      player.ima(opts);

      // 5) When the plugin has created the AdsLoader, set the tag and request ads
      player.one("ads-loader", () => {
        // Set/replace tag now; plugin won’t auto-call requestAds earlier
        player.ima.changeAdTag(adTagUrl);
        player.ima.requestAds(); // safe: AdsLoader exists
        setFlags(f => ({ ...f, requestAdsCalled: true }));
        emit("request_ads");
      });

      // 6) IMA lifecycle hooks
      player.one("ads-manager", (e) => {
        setFlags(f => ({ ...f, adsManagerLoaded: true }));
        emit("ads_manager", {});

        const I = IMA.AdEvent.Type;
        const mgr = e.adsManager;

        mgr.addEventListener(I.LOADED, () => emit("ad_loaded"));
        mgr.addEventListener(I.STARTED, () => {
          emit("ad_started");
          setNeedsGesture(false);
        });

        const done = () => emit("ad_done");
        mgr.addEventListener(I.COMPLETE, done);
        mgr.addEventListener(I.ALL_ADS_COMPLETED, done);
        mgr.addEventListener(IMA.AdErrorEvent.Type.AD_ERROR, (err) => {
          emit("ad_error", err?.getError?.()?.getMessage?.());
          setNeedsGesture(false);
        });
      });

      // 7) contrib-ads → adsready means we can start the break
      player.on("adsready", () => {
        setFlags(f => ({ ...f, adsReady: true }));
        emit("ads_ready");
        if (autoStart) {
          // Try to start; if browser blocks, show gesture button
          let started = false;
          player.one("adstart", () => { started = true; setNeedsGesture(false); });
          try { player.ima.initializeAdDisplayContainer(); } catch {}
          player.ima.playAdBreak();
          setTimeout(() => { if (!started) setNeedsGesture(true); }, 1200);
        }
      });

    })().catch((e) => console.error("IMA init failed", e));

    return () => {
      try { playerRef.current?.dispose(); } catch {}
    };
  }, [adTagUrl, autoStart, hideDefaultUi]);

  return { videoElRef, flags, needsGesture, startAd };
}

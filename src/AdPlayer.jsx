// AdOnly.jsx
import useImaOutstreamAds from "./hooks/useImaOutstreamAds";

const SAMPLE_TAG =
  "https://raw.githubusercontent.com/vb201/asdasd/refs/heads/main/scoredunks.xml";

function AdPlayer({ adTagUrl = SAMPLE_TAG }) {
  const { videoElRef, flags, needsGesture, startAd } = useImaOutstreamAds({
    adTagUrl,
    autoStart: true,
    hideDefaultUi: true,
    onEvent: (name, payload) => {
      // console.log("[ad event]", name, payload);
    }
  });

  return (
    <div className="adonly-overlay" role="dialog" aria-modal="true">
      <div className="adonly-shell">
        <video
          ref={videoElRef}
          className="video-js vjs-default-skin"
          style={{ width: "100%", height: "100%", background: "#000" }}
          playsInline
        />
        {needsGesture && (
          <button className="adonly-cta" onClick={startAd}>Play Ad</button>
        )}
      </div>

      <div className="adonly-debug">
        requestAds: {String(flags.requestAdsCalled)} ·{" "}
        adsManagerLoaded: {String(flags.adsManagerLoaded)} ·{" "}
        adsReady: {String(flags.adsReady)} ·{" "}
        needsGesture: {String(needsGesture)}
      </div>
    </div>
  );
}

export default AdPlayer;

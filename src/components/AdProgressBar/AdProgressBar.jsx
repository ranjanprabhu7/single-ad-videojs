import "./adProgressBar.css";

const AdProgressBar = ({ currentTime, duration }) => {
  // Calculate progress percentage
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Helper to format ms to seconds (e.g. 0:05)
  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000);
    return `0:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="progress-bar-container">
      <div className="ad-label">
        <span className="ad-info"> SPONSORED • Ad 1 of 1</span> •{" "}
        <span className="ad-time">{formatTime(duration - currentTime)}</span>
      </div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${progress}%` }}></div>
      </div>
    </div>
  );
};

export default AdProgressBar;

import "./header.css";
import { currencyToIconMap } from "../../../constant";
import Branding from "../../Branding/Branding";

const Header = ({ price, currency, timePayVariant }) => {
  return (
    <div className="widget-header">
      <div className="price-section">
        <div className="zzazz-logo">
          <video
            muted
            autoPlay
            loop
            playsInline
            disablePictureInPicture
            controls={false}
            style={{
              height: "100%",
              width: "100%",
              objectFit: "cover",
            }}
          >
            <source src="https://sgp1.digitaloceanspaces.com/qx-cdn/files/signal/zzazzlogo.mp4" />
          </video>
        </div>
        <div className="price-info">
          <div className="price-info-header"> Article Value</div>
          <div className="price">
            <span>
              {currencyToIconMap[currency]}
              {price}{" "}
            </span>
            <span className="currency">{currency}</span>
          </div>
        </div>
      </div>
      <Branding timePayVariant={timePayVariant} />
    </div>
  );
};

export default Header;

import ArrowUpRightIcon from "../icons/ArrrowUpRightIcon/ArrowUpRightIcon";
import LogoText from "../icons/ZZAZZLogoText";
import "./Branding.css";

const Branding = ({ timePayVariant }) => {
  return (
    <div className="branding">
      <span>TIMEPAY BY </span>
      <a href="https://zzazz.com/" target="_blank" rel="noreferrer">
        <LogoText />
      </a>
      <button
        className="arrow-button"
        onClick={() => window.open("https://zzazz.com/", "_blank")}
      >
        <ArrowUpRightIcon />
      </button>
    </div>
  );
};

export default Branding;
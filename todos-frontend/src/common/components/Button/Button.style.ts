import {
  COLOR_BLUE_SKY,
  COLOR_BLUE_SKY_DARK,
  COLOR_BLUE_SKY_LIGHT,
  COLOR_DARK_BLUE,
  COLOR_ORANGE,
  COLOR_ORANGE_DARK,
  COLOR_ORANGE_LIGHT,
  COLOR_WHITE,
} from "../../contants/colors";
import { ButtonProps } from "./Button";

const isTertiary = (appearance: ButtonProps["appearance"]) =>
  appearance === "tertiary";

const bgColor = (appearance: ButtonProps["appearance"]) => {
  if (appearance === "primary") return COLOR_ORANGE;
  if (isTertiary(appearance)) return "transparent";
  return COLOR_BLUE_SKY;
};

const bgHover = (appearance: ButtonProps["appearance"]) => {
  if (appearance === "primary") return COLOR_ORANGE_LIGHT;
  if (isTertiary(appearance)) return "rgba(255, 255, 255, 0.15)";
  return COLOR_BLUE_SKY_LIGHT;
};

const bgActive = (appearance: ButtonProps["appearance"]) => {
  if (appearance === "primary") return COLOR_ORANGE_DARK;
  if (isTertiary(appearance)) return "rgba(255, 255, 255, 0.25)";
  return COLOR_BLUE_SKY_DARK;
};

export const style = (props: ButtonProps) => `
  font-size: 1.6rem;
  color: ${isTertiary(props.appearance) ? COLOR_WHITE : COLOR_DARK_BLUE};
  background: ${bgColor(props.appearance)};
  padding: ${props.size === "small" ? "0px 8px" : "8px 16px"};
  border-radius: ${props.size === "small" ? "4px" : "8px"};
  border: ${isTertiary(props.appearance) ? `1.5px solid ${COLOR_WHITE}` : "hsl(0deg, 0%, 0%)"};
  cursor: pointer;

  &:hover {
      background: ${bgHover(props.appearance)};
  }

  &:active {
      background: ${bgActive(props.appearance)};
  }

  &:focus-visible {
      outline: 2px solid grey;
  }

  &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
  }
`;

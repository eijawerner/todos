import {
  COLOR_BLUE_SKY,
  COLOR_BLUE_SKY_DARK,
  COLOR_BLUE_SKY_LIGHT,
  COLOR_DARK_BLUE,
  COLOR_ORANGE,
  COLOR_ORANGE_DARK,
  COLOR_ORANGE_LIGHT,
} from "../../contants/colors";
import { ButtonProps } from "./Button";

export const style = (props: ButtonProps) => `
  font-size: 1.6rem;
  color: ${COLOR_DARK_BLUE};
  background: ${props.appearance === "primary" ? COLOR_ORANGE : COLOR_BLUE_SKY};
  padding: ${props.size === "small" ? "4px 4px" : "8px 16px"};
  border-radius: ${props.size === "small" ? "4px" : "8px"};
  border: hsl(0deg, 0%, 0%);
  cursor: pointer;
  
  &:hover {
      background: ${props.appearance === "primary" ? COLOR_ORANGE_LIGHT : COLOR_BLUE_SKY_LIGHT};
  }
  
  &:active {
      background:  ${props.appearance === "primary" ? COLOR_ORANGE_DARK : COLOR_BLUE_SKY_DARK};
  }

  &:focus-visible {
      outline: 2px solid grey;
  } 
`;

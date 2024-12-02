import React, { ButtonHTMLAttributes } from "react";
import { StyledProps } from "../../types/Models";
import styled from "styled-components";
import { style } from "./Button.style";

export type ButtonProps = ButtonHTMLAttributes<any> &
  StyledProps & {
    text: string;
    onClick?: () => void;
    size?: "regular" | "small";
    appearance?: "primary" | "secondary";
  };
function ButtonBase({ text, onClick, className, appearance = "secondary", size = "regular" }: ButtonProps) {
  return (
    <button className={className} onClick={onClick}>
      {text}
    </button>
  );
}

export const Button = styled(ButtonBase)`
  ${style}
`;

import React, { ButtonHTMLAttributes } from "react";
import styled from "styled-components";
import { COLOR_BLUE_SKY, COLOR_DARK_BLUE } from "../../contants/colors";
import { StyledProps } from "../../types/Models";

const StyledIconButton = styled.button<{ $bgColor: string }>`
  border-radius: 25%;
  border: none;
  margin: 0;
  padding: 0;
  background: ${(props) => props.$bgColor};
  cursor: pointer;

  &:hover {
    filter: brightness(1.15);
  }

  &:active {
    filter: brightness(0.7);
  }

  &:focus-visible {
    outline: 2px solid grey;
  }
`;

const StyledIcon = styled.div<{ $size: "regular" | "small" }>`
  width: ${(props) => (props.$size === "small" ? "24px" : "34px")};
  height: ${(props) => (props.$size === "small" ? "24px" : "34px")};
  color: ${COLOR_DARK_BLUE};
  padding: ${(props) => (props.$size === "small" ? "0.3rem" : "0.5rem")};
`;

type IconButtonProps = ButtonHTMLAttributes<any> &
  StyledProps & {
    onClick?: () => void;
    children: React.ReactNode;
    bgColor?: string;
    size?: "regular" | "small";
  };
export const IconButton = ({
  children,
  bgColor = COLOR_BLUE_SKY,
  size = "regular",
  ...restProps
}: IconButtonProps) => {
  return (
    <StyledIconButton $bgColor={bgColor} {...restProps}>
      <StyledIcon $size={size}>{children}</StyledIcon>
    </StyledIconButton>
  );
};

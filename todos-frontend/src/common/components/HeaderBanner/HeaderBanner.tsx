import React from "react";
import styled from "styled-components";
import { COLOR_RED, COLOR_WHITE } from "../../contants/colors";

const StyledHeaderBanner = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: ${COLOR_RED};
  color: ${COLOR_WHITE};
  text-align: center;
  padding: 0.5rem;
  font-size: 1rem;
  font-weight: bold;
`;

const StyledCloseButton = styled.button`
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: ${COLOR_WHITE};
  font-size: 1.2rem;
  cursor: pointer;
`;

type HeaderBannerProps = {
  message: string;
  onClose?: () => void;
};

export const HeaderBanner = ({ message, onClose }: HeaderBannerProps) => {
  return (
    <StyledHeaderBanner>
      {message}
      {onClose && <StyledCloseButton onClick={onClose}>✕</StyledCloseButton>}
    </StyledHeaderBanner>
  );
};

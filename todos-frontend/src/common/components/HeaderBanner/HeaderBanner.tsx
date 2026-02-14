import React from "react";
import styled from "styled-components";
import { COLOR_GREEN, COLOR_RED, COLOR_WHITE } from "../../contants/colors";
import { Button } from "../Button/Button";

type BannerMode = "danger" | "success";

const BANNER_COLORS: Record<BannerMode, string> = {
  danger: COLOR_RED,
  success: COLOR_GREEN,
};

const StyledHeaderBanner = styled.div<{ $mode: BannerMode }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  background: ${({ $mode }) => BANNER_COLORS[$mode]};
  color: ${COLOR_WHITE};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  font-size: 1.6rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
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
  mode?: BannerMode;
  onClose?: () => void;
  action?: { label: string; onClick: () => void };
};

export const HeaderBanner = ({ message, mode = "danger", onClose, action }: HeaderBannerProps) => {
  return (
    <StyledHeaderBanner $mode={mode}>
      {message}
      {action && (
        <Button
          appearance="tertiary"
          size="small"
          text={action.label}
          onClick={action.onClick}
        />
      )}
      {onClose && <StyledCloseButton onClick={onClose}>✕</StyledCloseButton>}
    </StyledHeaderBanner>
  );
};

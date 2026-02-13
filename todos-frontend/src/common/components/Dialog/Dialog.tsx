import React, { ReactNode } from "react";
import styled from "styled-components";
import { XMarkIcon } from "@heroicons/react/20/solid";

type StyledOverlayProps = {
  $isVisible: boolean;
};
const StyledOverlay = styled.div<StyledOverlayProps>`
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
  background: white;
  border-radius: 1rem;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: absolute;
  top: 2.5rem;
  width: 70vw;
  z-index: 1;
  box-shadow: rgba(100, 100, 111, 0.2) 0 7px 29px 0`;

const StyledCloseButtonContainer = styled.div`
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
`;

const StyledCloseButton = styled.button`
  cursor: pointer;
  border: none;
  border-radius: 50%;
  background: none;
`;

const StyledXMarkIcon = styled(XMarkIcon)`
  height: 20px;
  width: 20px;
`;

const StyledActions = styled.div`
  display: flex;
  flex-direction: row;
  gap: 0.5rem;
  justify-content: end;
  padding-top: 1rem;
`;

type DialogProps = {
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
};

function Dialog({ isVisible, onClose, children }: DialogProps) {
  return (
    <StyledOverlay $isVisible={isVisible}>
      <StyledCloseButtonContainer>
        <StyledCloseButton onClick={onClose}>
          <StyledXMarkIcon />
        </StyledCloseButton>
      </StyledCloseButtonContainer>
      {children}
    </StyledOverlay>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <StyledActions>{children}</StyledActions>;
}

Dialog.Actions = Actions;

export { Dialog };

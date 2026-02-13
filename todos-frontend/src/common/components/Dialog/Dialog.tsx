import React, { ReactNode } from "react";
import styled from "styled-components";
import { XMarkIcon } from "@heroicons/react/24/solid";
import { COLOR_GREY_LIGHT } from "../../contants/colors";

type StyledOverlayProps = {
  $isVisible: boolean;
};
const StyledOverlay = styled.div<StyledOverlayProps>`
  opacity: ${(props) => (props.$isVisible ? 1 : 0)};
  pointer-events: ${(props) => (props.$isVisible ? "auto" : "none")};
  background: ${COLOR_GREY_LIGHT};
  border-radius: 1rem;
  padding: 3rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: absolute;
  top: 10rem;
  width: 80vw;
  max-width: 40rem;
  z-index: 2;
  box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
`;

const StyledBackdrop = styled.div<{ $isVisible: boolean }>`
  display: ${(props) => (props.$isVisible ? "block" : "none")};
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
`;

const StyledCloseButtonContainer = styled.div`
  position: absolute;
  right: 1rem;
  top: 1rem;
`;

const StyledCloseButton = styled.button`
  cursor: pointer;
  border: none;
  border-radius: 50%;
  background: none;
`;

const StyledXMarkIcon = styled(XMarkIcon)`
  height: 24px;
  width: 24px;
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
    <>
      <StyledBackdrop $isVisible={isVisible} onClick={onClose} />
      <StyledOverlay $isVisible={isVisible}>
        <StyledCloseButtonContainer>
          <StyledCloseButton onClick={onClose}>
            <StyledXMarkIcon />
          </StyledCloseButton>
        </StyledCloseButtonContainer>
        {children}
      </StyledOverlay>
    </>
  );
}

function Actions({ children }: { children: ReactNode }) {
  return <StyledActions>{children}</StyledActions>;
}

Dialog.Actions = Actions;

export { Dialog };

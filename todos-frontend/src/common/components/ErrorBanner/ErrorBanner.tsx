import React from "react";
import styled from "styled-components";
import { COLOR_RED, COLOR_WHITE } from "../../contants/colors";
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

const StyledErrorBanner = styled.div`
  display: flex;
  gap: 1rem;
  border-radius: 1rem;
  background: ${COLOR_RED};
  color: ${COLOR_WHITE};
  padding: 1.5rem 2rem;
  font-size: 1.5rem;
`;

type ErrorBannerProps = {
    message: string;
};

export const ErrorBanner = ({ message }: ErrorBannerProps) => {
    return (
        <StyledErrorBanner>
            <ExclamationCircleIcon style={{ height: '24px'}} />
            {message}
        </StyledErrorBanner>
    );
};

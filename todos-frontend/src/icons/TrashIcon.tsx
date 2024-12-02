import React from 'react';
import styled from 'styled-components';

const StyledIconButton = styled.button`
    outline: none;
    border: none;
`;

const StyledIcon = styled.div`
    width: 15px;
`

export const IconButton = ({children}: {children: React.ReactNode}) => {
  return (
    <StyledIconButton>
        <StyledIcon>
        {children}
        </StyledIcon>
    </StyledIconButton>
  )
}
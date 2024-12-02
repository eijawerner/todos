import React, { ButtonHTMLAttributes } from 'react';
import styled from 'styled-components';
import { COLOR_BLUE_SKY, COLOR_BLUE_SKY_LIGHT, COLOR_DARK_BLUE } from '../../contants/colors';
import { StyledProps } from '../../types/Models';

const StyledIconButton = styled.button`
    border-radius: 25%;
    border: none;
    height: 100%;
    margin: 0;
    padding: 0;
    background: ${COLOR_BLUE_SKY};
    cursor: pointer;

    &:hover {
      background: ${COLOR_BLUE_SKY_LIGHT};
    }
  
    &:active {
      background:  ${COLOR_DARK_BLUE};
    }

    &:focus-visible {
      outline: 2px solid grey;
    } 
`;

const StyledIcon = styled.div`
    width: 15px;
    height: 15px;
    color: ${COLOR_DARK_BLUE};
    padding: 0.5rem;
`;


type IconButtonProps = ButtonHTMLAttributes<any> &
  StyledProps & {
    onClick?: () => void;
    children: React.ReactNode
  };
export const IconButton = ({children, ...restProps}: IconButtonProps) => {
  return (
    <StyledIconButton {...restProps}>
        <StyledIcon>
        {children}
        </StyledIcon>
    </StyledIconButton>
  )
}
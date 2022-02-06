import React from 'react';
import { StyledProps } from '../../types/Models';
import styled from 'styled-components';
import { style } from './Button.style';

export type ButtonProps = StyledProps & {
    text: string;
    onClick: () => void;
    size?: 'regular' | 'small'
    type: 'primary' | 'secondary'
}
function ButtonBase({text, onClick, className}: ButtonProps) {
    return <button className={className} onClick={onClick}>{text}</button>
}

export const Button = styled(ButtonBase)`
  ${style}
`
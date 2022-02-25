import {
    COLOR_BLUE_SKY,
    COLOR_DARK_BLUE,
    COLOR_ORANGE,
    COLOR_ORANGE_DARK,
    COLOR_ORANGE_LIGHT
} from '../../contants/colors';
import { ButtonProps } from './Button';

export const style = (props: ButtonProps) => `
    color: ${COLOR_DARK_BLUE};
    background: ${props.appearance === 'primary' ? COLOR_ORANGE : COLOR_BLUE_SKY};
    padding: ${props.size === 'small' ? '4px 4px' : '8px 16px'};
    border-radius: ${props.size === 'small' ? '4px' : '8px'};
    border: hsl(0deg, 0%, 0%);
    
    :hover {
        background: ${COLOR_ORANGE_LIGHT};
        cursor: pointer;
    }
    
    :active {
        background: ${COLOR_ORANGE_DARK};
    }
`;
import React from "react";
import { TodoListSelected } from "./pages/TodoListSelected/TodoListSelected";
import { createGlobalStyle } from "styled-components";
import { COLOR_DARK_BLUE } from "./common/contants/colors";

const GlobalStyles = createGlobalStyle`
html {
    background: ${COLOR_DARK_BLUE};
}
`;

export const App: React.FC = () => {
  return <>
    <GlobalStyles />
    <TodoListSelected />
  </>;
};

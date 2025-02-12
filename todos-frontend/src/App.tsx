import React, { createContext, useState } from "react";
import { TodoListSelected } from "./pages/TodoListSelected/TodoListSelected";
import styled, { createGlobalStyle } from "styled-components";
import { COLOR_DARK_BLUE } from "./common/contants/colors";

export const DebugContext = createContext(false);

const DebugButton = styled.button`
  top: 0;
  left: 0;
  position: absolute;
  opacity: 0;
  font-size: 1.2rem;
  height: 3rem;
  width: 3rem;
`;

const GlobalStyles = createGlobalStyle`
html {
    background: ${COLOR_DARK_BLUE};
}
`;

export const App: React.FC = () => {
  const [debugEnabled, setDebugEnabled] = useState(false);

  return (
    <DebugContext.Provider value={debugEnabled}>
      <DebugButton onDoubleClick={() => setDebugEnabled(!debugEnabled)}>{`${debugEnabled ? '1': '0'}`}</DebugButton>
      <GlobalStyles />
      <TodoListSelected />
    </DebugContext.Provider>
  )
};

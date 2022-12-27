import React, { ChangeEvent, FormEvent, useState } from 'react';
import { Button } from '../../../../common/components/Button/Button';
import styled from 'styled-components';

type StyledOverlayProps = {
    isVisible: boolean
}
const StyledOverlay = styled.div<StyledOverlayProps>`
  opacity: ${ props => props.isVisible? 1 : 0};
  pointer-events: ${ props => props.isVisible? 'auto' : 'none'};
  background: white;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: absolute;
  top: 0.5rem;
  width: 70vw;
  z-index: 1;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const StyledButtonsContainer = styled.div`
  display: flex;
  flex-direction: row; 
  gap: 0.5rem;
  justify-content: end;
  padding-top: 1rem;
`;

const StyledCloseButtonContainer = styled.div`
  position: absolute;
  right: 0.5rem;
  top: 0.5rem;
`;

const StyledCloseButton = styled.button`
  cursor: pointer;
  border: none;
  border-radius: 50%;
  font-size: 14px;
`;

type TodoListCreateFormProps = {
    isVisible: boolean;
    onCreateTodoList: (name: string) => void;
    onCloseOverlayClick: () => void;
}
export function TodoListCreateForm({isVisible, onCreateTodoList, onCloseOverlayClick}: TodoListCreateFormProps) {
    const [listName, setListName] = useState('')
    const handleSubmit = (event: FormEvent) => {
        event.preventDefault();
        onCreateTodoList(listName)
        setListName('')
    }
    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        setListName(name)
    }
    return (
        <StyledOverlay isVisible={isVisible}>
            <StyledCloseButtonContainer>
                <StyledCloseButton onClick={onCloseOverlayClick}>x</StyledCloseButton>
            </StyledCloseButtonContainer>
            <StyledForm onSubmit={handleSubmit}>
                <label htmlFor="formName">List name:</label>
                <input id={"formName"} value={listName} onChange={handleInputChange} placeholder={'Fill in list name'} />
                <StyledButtonsContainer>
                    <Button text={'OK'} type='submit' appearance={'primary'} />
                </StyledButtonsContainer>
            </StyledForm>

        </StyledOverlay>
        )
}
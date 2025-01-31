import React from 'react';
import { TodoNote } from '../../../../../../common/types/Models';
import { Button } from '../../../../../../common/components/Button/Button';
import styled from 'styled-components';
import { COLOR_BLACK, COLOR_DARK_BLUE, COLOR_GREY_LIGHT } from '../../../../../../common/contants/colors';

const StyledTextArea = styled.textarea`
  flex-grow: 1;
  border: none;
  background-color: transparent;
  color: ${COLOR_BLACK};
  font-size: 1.6rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: white;
  &:focus {
    outline: none;
  }
  resize: none;
`;

const NoteContainer = styled.div`
  position: absolute;
  background: ${COLOR_GREY_LIGHT};
  box-shadow: rgba(0, 0, 0, 0.35) 0px 5px 15px;
  font-size: 1.5rem;
  padding: 1rem;
  top: 10rem;
  width: 80vw;
  height: 40vh;
  max-width: 40rem;
  flex-direction: column;
  min-height: 20rem;
  gap: 1rem;
  border-radius: 6px;
  z-index: 2;
`;

const NoteFlexContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  gap: 2rem;
`;

const NotesHeader = styled.h2`
  color: ${COLOR_DARK_BLUE};
  margin: 0;
  padding: 0;
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 1rem;
  justify-content: space-between;
`;

const Backdrop = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1;
`;

type NoteProps = {
    note?: TodoNote;
    editNoteText: (noteText: string) => void;
    onClose: () => void;
};
export const Note = ({note, editNoteText, onClose}: NoteProps) => {
    const [noteText, setNoteText] = React.useState(note?.text ?? '');

    const updateNoteText = (noteText: string) => {
        setNoteText(noteText);
    }

    return (
      <>
      <Backdrop onClick={onClose} />
      <NoteContainer>
        <NoteFlexContainer>
        <NotesHeader>Notes</NotesHeader>
        <StyledTextArea value={noteText} onChange={(e) => updateNoteText(e.target.value)} />
        <ActionButtons>
          <Button onClick={onClose} text='Cancel'  />
          <Button onClick={() => editNoteText(noteText)} text='Save' appearance='primary' />
        </ActionButtons>
        </NoteFlexContainer>
      </NoteContainer>
      </>
    )
};

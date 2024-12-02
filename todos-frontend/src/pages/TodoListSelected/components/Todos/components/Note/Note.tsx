import React from 'react';
import { TodoNote } from '../../../../../../common/types/Models';
import { Button } from '../../../../../../common/components/Button/Button';
import styled from 'styled-components';
import { COLOR_BLACK } from '../../../../../../common/contants/colors';

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
        <div style={{ position: 'absolute',  background: 'grey', fontSize: '1.5rem', padding: '1rem', top: '10rem', width: '20rem', height: '20rem'}}>
          <div style={{display: 'flex', height: '100%', flexDirection: 'column', gap: '2rem'}}>
          {`note: `}
          <StyledTextArea value={noteText} onChange={(e) => updateNoteText(e.target.value)} />
          <Button onClick={onClose} text='Cancel'  />
          <Button onClick={() => editNoteText(noteText)} text='Save' appearance='primary' />
          </div>
       </div>
    )
};

import React, { useCallback, useEffect, useState } from "react";
import { TodoNote } from "../../../../../../common/types/Models";
import { useDebounce } from "../../../../../../common/hooks/useDebounce";
import { Button } from "../../../../../../common/components/Button/Button";
import { Dialog } from "../../../../../../common/components/Dialog/Dialog";
import styled from "styled-components";
import {
  COLOR_BLACK,
  COLOR_DARK_BLUE,
} from "../../../../../../common/contants/colors";

const StyledTextArea = styled.textarea`
  flex-grow: 1;
  min-height: 20vh;
  max-height: 400px;
  border: none;
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

const NotesHeader = styled.h2`
  color: ${COLOR_DARK_BLUE};
  margin: 0;
  padding: 0;
  font-size: 2rem;
`;

type NoteProps = {
  todoId: string;
  note: TodoNote;
  editNoteText: (todoId: string, noteText: string) => void;
  onClose: () => void;
};
export const Note = ({ todoId, note, editNoteText, onClose }: NoteProps) => {
  const [noteText, setNoteText] = useState<string>(note.text);
  const debouncedNoteText = useDebounce(noteText, 500);

  useEffect(() => {
    if (debouncedNoteText === note.text) return;
    editNoteText(todoId, debouncedNoteText);
  }, [debouncedNoteText]);

  const handleClose = useCallback(() => {
    if (noteText !== note.text) {
      editNoteText(todoId, noteText);
    }
    onClose();
  }, [noteText, todoId]);

  return (
    <Dialog isVisible={true} onClose={handleClose}>
      <NotesHeader>Notes</NotesHeader>
      {noteText === undefined && <span>undefined data</span>}
      <StyledTextArea
        autoFocus
        value={noteText}
        onChange={(e) => setNoteText(e.target.value)}
      />
      <Dialog.Actions>
        <Button onClick={handleClose} text="OK" size="small" />
      </Dialog.Actions>
    </Dialog>
  );
};

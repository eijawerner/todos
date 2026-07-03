import React, { ChangeEvent, FormEvent, useState } from "react";
import styled from "styled-components";
import { Dialog } from "../Dialog/Dialog";
import { Button } from "../Button/Button";
import { setDeviceName, skipDeviceName } from "../../identity";
import { COLOR_BLACK, COLOR_DARK_BLUE, COLOR_BEIGE } from "../../contants/colors";

const StyledTitle = styled.h2`
  font-size: 1.8rem;
  color: ${COLOR_DARK_BLUE};
  margin: 0;
`;

const StyledText = styled.p`
  font-size: 1.4rem;
  color: ${COLOR_BLACK};
  margin: 0;
`;

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const StyledInput = styled.input`
  border: 1px solid ${COLOR_BEIGE};
  background: white;
  color: ${COLOR_BLACK};
  /* Minimum 16px (1.6rem) - smaller font sizes make iOS Safari zoom in when the input gets focus */
  font-size: 1.6rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.4rem;

  &:focus {
    outline: 2px solid ${COLOR_BEIGE};
  }
`;

type NamePromptProps = {
  // Called once the user has saved a name or skipped (identity now has a name).
  onDone: () => void;
};

// Asks the user to name this device the first time the app is opened. The name
// is stamped on every edit so shared-list collaborators can tell edits apart.
export function NamePrompt({ onDone }: NamePromptProps) {
  const [name, setName] = useState("");

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim() === "") return;
    setDeviceName(name);
    onDone();
  };

  const handleSkip = () => {
    skipDeviceName();
    onDone();
  };

  return (
    <Dialog isVisible={true} onClose={handleSkip}>
      <StyledTitle>What should we call you?</StyledTitle>
      <StyledText>
        Your name is shown next to edits so others sharing a list can see who
        changed what. You can skip this.
      </StyledText>
      <StyledForm onSubmit={handleSave} autoComplete="off">
        <StyledInput
          value={name}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="Your name..."
          aria-label="Your name"
          autoFocus
        />
        <Dialog.Actions>
          <Button text="Skip" appearance="secondary" onClick={handleSkip} />
          <Button
            text="Save"
            type="submit"
            appearance="primary"
            disabled={name.trim() === ""}
          />
        </Dialog.Actions>
      </StyledForm>
    </Dialog>
  );
}

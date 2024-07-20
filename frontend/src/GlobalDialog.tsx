import { useRef, useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogContentText, TextField, DialogActions, Button } from '@mui/material';

type DialogConfig = {
  message: string;
  title: string;
  isTwoButtons?: boolean;
  isInput?: boolean;
  primaryButtonLabel?: string;
  secondaryButtonLabel?: string;
  label?: string;
  defaultValue?: string;
  isPassword?: boolean;
};

interface GlobalDialogProps {
  isOpen: boolean;
  config: DialogConfig;
  onClose: (value: string | null) => void;
}

export function GlobalDialog({ isOpen, config, onClose }: GlobalDialogProps) {
  const [inputValue, setInputValue] = useState<string>(config.defaultValue || '');

  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(config.defaultValue || '');
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 100);
    }
  }, [isOpen, config.defaultValue]);

  return (
    <Dialog open={isOpen} onClose={() => onClose(null)}>
      <DialogTitle>{config.title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{config.message}</DialogContentText>
        {config.isInput && (
          <TextField
            autoFocus
            inputRef={inputRef}
            margin='dense'
            id={config.isPassword ? 'filled-password-input' : 'filled-basic'}
            variant='outlined'
            label={config.label}
            type={config.isPassword ? 'password' : 'text'}
            value={inputValue}
            spellCheck={false}
            fullWidth
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputValue !== '') {
                e.preventDefault();
                onClose(inputValue);
              }
            }}
          />
        )}
      </DialogContent>
      <DialogActions>
        {(config.isTwoButtons || config.isInput) && (
          <Button variant='outlined' onClick={() => onClose(null)}>
            {config.secondaryButtonLabel || 'Cancel'}
          </Button>
        )}
        <Button variant='contained' onClick={() => onClose(config.isInput ? (inputValue !== '' ? inputValue : null) : 'ok')}>
          {config.primaryButtonLabel || 'OK'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

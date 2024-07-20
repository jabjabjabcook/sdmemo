import { useState } from 'react';

export type DialogConfig = {
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

type UseInputDialogReturn = {
  isDialogVisible: boolean;
  dialogConfig: DialogConfig;
  showDialog: (config: DialogConfig) => Promise<string | null>;
  hideDialog: () => void;
  handleDialogClose: (value: string | null) => void;
};

export const useDialog = (): UseInputDialogReturn => {
  const [isDialogVisible, setDialogVisible] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<DialogConfig>({
    message: '',
    title: '',
  });

  const [resolveDialog, setResolveDialog] = useState<((value: string | null) => void) | null>(null);

  const showDialog = (config: DialogConfig) => {
    setDialogConfig(config);
    setDialogVisible(true);

    return new Promise<string | null>((resolve) => {
      setResolveDialog(() => resolve);
    });
  };

  const hideDialog = () => {
    setDialogVisible(false);
    if (resolveDialog) {
      resolveDialog('');
    }
    setResolveDialog(null);
  };

  const handleDialogClose = (value: string | null) => {
    setDialogVisible(false);
    if (resolveDialog) {
      resolveDialog(value);
    }
    setResolveDialog(null);
  };

  return {
    isDialogVisible,
    dialogConfig,
    showDialog,
    hideDialog,
    handleDialogClose,
  };
};

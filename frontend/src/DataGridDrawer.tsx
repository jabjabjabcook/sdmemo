import { useMemo, useCallback, useState, useEffect } from 'react';
import {
  DataGrid,
  GridRowsProp,
  GridColDef,
  GridRowModel,
  useGridApiRef,
  GridCellModesModel,
  GridCellModes,
  GridCellParams,
} from '@mui/x-data-grid';
import { Box, IconButton, Button, TextField } from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import SaveIcon from '@mui/icons-material/Save';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { Drawer } from '@mui/material';
import {
  updateDictionary,
  createNewDictionary,
  isExistDictionary,
  deleteDictionary,
  getPositiveDictionaries,
  getNegativeDictionaries,
} from './utils/indexedDB';
import { DialogConfig } from './hooks/useDialog';
import { SelectSaveFileUri, ExportLogs, SelectFile, ImportLogs } from '../wailsjs/go/main/App';

interface DataGridDrawerProps {
  currentDictionary: { [key: string]: string[] };
  setCurrentDictionary: (dictionary: { [key: string]: string[] }) => void;
  dictionaryName: string;
  setDictionaryName: (name: string) => void;
  dictionaryType: 'positive' | 'negative';
  dictionaries: string[];
  setDictionaries: (dictionaries: string[]) => void;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  showDialog: (config: DialogConfig) => Promise<string | null>;
}

export const DataGridDrawer = ({
  currentDictionary,
  setCurrentDictionary,
  dictionaryName,
  setDictionaryName,
  dictionaryType,
  dictionaries,
  setDictionaries,
  drawerOpen,
  setDrawerOpen,
  showDialog,
}: DataGridDrawerProps) => {
  const [editedDictionaryName, setEditedDictionaryName] = useState<string>(dictionaryName);
  const [cellModesModel, setCellModesModel] = useState<GridCellModesModel>({});
  const apiRef = useGridApiRef();

  const { rows, columns } = useMemo(() => {
    const maxLength = Math.max(...Object.values(currentDictionary).map((arr) => arr.length));

    const rows: GridRowsProp = Object.entries(currentDictionary).map(([key, values], index) => ({
      id: index,
      key,
      ...values.reduce((acc, value, i) => ({ ...acc, [`value${i}`]: value }), {}),
    }));

    const columns: GridColDef[] = [
      { field: 'key', headerName: 'Index', editable: true, width: 190 },
      {
        field: 'delete',
        headerName: 'Delete',
        width: 60,
        renderCell: (params) => (
          <IconButton onClick={() => handleDelete(params.row.id)} size='small' sx={{ width: 18, height: 18 }}>
            <DeleteForeverIcon sx={{ fontSize: 18 }} />
          </IconButton>
        ),
      },
      ...Array.from({ length: maxLength }, (_, i) => ({
        field: `value${i}`,
        headerName: `Tag ${i + 1}`,
        editable: true,
        width: 150,
      })),
    ];

    return { rows, columns };
  }, [currentDictionary]);

  const processRowUpdate = useCallback(
    (newRow: GridRowModel) => {
      const updatedRow = { ...newRow };
      const newDictionary = { ...currentDictionary };
      newDictionary[newRow.key] = Object.keys(newRow)
        .filter((key) => key.startsWith('value') && newRow[key] !== null && newRow[key] !== undefined)
        .map((key) => newRow[key]);
      // 空白のセルを削除
      newDictionary[newRow.key] = newDictionary[newRow.key].filter(Boolean);
      setCurrentDictionary(newDictionary);
      updateDictionary(dictionaryType, dictionaryName, newDictionary);
      return updatedRow;
    },
    [currentDictionary, setCurrentDictionary]
  );

  const handleProcessRowUpdateError = useCallback((error: Error) => {
    console.error('Error while saving the row:', error);
  }, []);

  const handleDelete = useCallback(
    (id: number) => {
      const newDictionary = { ...currentDictionary };
      delete newDictionary[rows[id].key];
      setCurrentDictionary(newDictionary);
      updateDictionary(dictionaryType, dictionaryName, newDictionary);
    },
    [currentDictionary, setCurrentDictionary]
  );

  const handleCellClick = useCallback((params: GridCellParams, event: React.MouseEvent) => {
    if (!params.isEditable) {
      return;
    }

    // Ignore portal
    if ((event.target as any).nodeType === 1 && !event.currentTarget.contains(event.target as Element)) {
      return;
    }

    setCellModesModel((prevModel) => {
      return {
        // Revert the mode of the other cells from other rows
        ...Object.keys(prevModel).reduce(
          (acc, id) => ({
            ...acc,
            [id]: Object.keys(prevModel[id]).reduce(
              (acc2, field) => ({
                ...acc2,
                [field]: { mode: GridCellModes.View },
              }),
              {}
            ),
          }),
          {}
        ),
        [params.id]: {
          // Revert the mode of other cells in the same row
          ...Object.keys(prevModel[params.id] || {}).reduce(
            (acc, field) => ({ ...acc, [field]: { mode: GridCellModes.View } }),
            {}
          ),
          [params.field]: { mode: GridCellModes.Edit },
        },
      };
    });
  }, []);

  const handleCellModesModelChange = useCallback((newModel: GridCellModesModel) => {
    setCellModesModel(newModel);
  }, []);

  const handleDictionaryNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedDictionaryName(e.target.value);
  }, []);

  const handleDictionaryNameSave = async () => {
    await createNewDictionary(dictionaryType, editedDictionaryName, currentDictionary);
    await deleteDictionary(dictionaryType, dictionaryName);
    if (dictionaryType === 'positive') {
      setDictionaries(await getPositiveDictionaries());
    } else {
      setDictionaries(await getNegativeDictionaries());
    }
    setDictionaryName(editedDictionaryName);
  };

  const handleNewDictionary = async () => {
    const newDictionaryName = await showDialog({
      title: 'New Dictionary',
      message: 'Please enter a name for the new dictionary.',
      isInput: true,
      label: 'Dictionary Name',
    });
    if (newDictionaryName) {
      if (await isExistDictionary(dictionaryType, newDictionaryName)) {
        await showDialog({
          title: 'Dictionary Name Already Exists',
          message: 'Please enter a different name for the new dictionary.',
        });
        await handleNewDictionary();
      } else {
        await createNewDictionary(dictionaryType, newDictionaryName);
        if (dictionaryType === 'positive') {
          setDictionaries(await getPositiveDictionaries());
        } else {
          setDictionaries(await getNegativeDictionaries());
        }
        setDictionaryName(newDictionaryName);
        setEditedDictionaryName(newDictionaryName);
      }
    }
  };

  const handleExportDictionary = async () => {
    const filePath = await SelectSaveFileUri(dictionaryName);
    if (filePath) {
      const data = JSON.stringify({
        name: dictionaryName,
        type: dictionaryType,
        dictionary: currentDictionary,
      });
      await ExportLogs(filePath, data);
    }
  };

  const handleImportDictionary = async () => {
    const filePath = await SelectFile();
    if (filePath) {
      const data = await ImportLogs(filePath);
      if (data) {
        const { name, type, dictionary } = JSON.parse(data);
        if (await isExistDictionary(type, name)) {
          const newName = await showDialog({
            title: 'Dictionary Name Already Exists',
            message: 'Please enter a different name for the new dictionary.',
            isInput: true,
            label: 'Dictionary Name',
          });
          if (newName && newName !== name && !(await isExistDictionary(type, newName))) {
            await createNewDictionary(type, newName, dictionary);
            if (type === 'positive') {
              setDictionaries(await getPositiveDictionaries());
            } else {
              setDictionaries(await getNegativeDictionaries());
            }
            setDictionaryName(newName);
            setEditedDictionaryName(newName);
            return;
          } else {
            return;
          }
        } else {
          await createNewDictionary(type, name, dictionary);
        }

        if (dictionaryType === 'positive') {
          setDictionaries(await getPositiveDictionaries());
        } else {
          setDictionaries(await getNegativeDictionaries());
        }

        setDictionaryName(name);
        setEditedDictionaryName(name);
      }
    }
  };

  const handleDeleteDictionary = async () => {
    if (dictionaryName === 'default') {
      await showDialog({
        title: 'Delete Dictionary',
        message: 'Default dictionary cannot be deleted.',
      });
      return;
    }
    const isConfirmed = await showDialog({
      title: 'Delete Dictionary',
      message: 'Are you sure you want to delete this dictionary?',
      isTwoButtons: true,
    });
    if (isConfirmed) {
      await deleteDictionary(dictionaryType, dictionaryName);
      if (dictionaryType === 'positive') {
        setDictionaries(await getPositiveDictionaries());
      } else {
        setDictionaries(await getNegativeDictionaries());
      }
      setDictionaryName('default');
      setEditedDictionaryName('default');
      setDrawerOpen(false);
    }
  };

  const handleMergeDictionary = async () => {
    const filePath = await SelectFile();
    if (filePath) {
      const data = await ImportLogs(filePath);
      const { name, type, dictionary } = JSON.parse(data);
      if (name && type && dictionary) {
        if (dictionaryType !== type) {
          const confirm = await showDialog({
            title: 'Merge Dictionary',
            message: 'Dictionary type is different. Are you sure you want to merge?',
            isTwoButtons: true,
            primaryButtonLabel: 'Merge',
            secondaryButtonLabel: 'Cancel',
          });
          if (confirm) {
            const newDictionary = { ...currentDictionary, ...dictionary };
            const uniqueDictionary = Object.keys(newDictionary).reduce((acc: { [key: string]: string[] }, key) => {
              if (!acc[key]) {
                acc[key] = newDictionary[key];
              }
              return acc;
            }, {});

            const sortedDictionary = Object.keys(uniqueDictionary)
              .sort()
              .reduce((acc: { [key: string]: string[] }, key) => {
                acc[key] = uniqueDictionary[key];
                return acc;
              }, {});

            setCurrentDictionary(sortedDictionary);
            updateDictionary(dictionaryType, dictionaryName, sortedDictionary);
          }
        } else {
          const newDictionary = { ...currentDictionary, ...dictionary };
          const uniqueDictionary = Object.keys(newDictionary).reduce((acc: { [key: string]: string[] }, key) => {
            if (!acc[key]) {
              acc[key] = newDictionary[key];
            }
            return acc;
          }, {});

          const sortedDictionary = Object.keys(uniqueDictionary)
            .sort()
            .reduce((acc: { [key: string]: string[] }, key) => {
              acc[key] = uniqueDictionary[key];
              return acc;
            }, {});

          setCurrentDictionary(sortedDictionary);
          updateDictionary(dictionaryType, dictionaryName, sortedDictionary);
        }
      }
    }
  };

  const handleCopyDictionary = async () => {
    const newDictionaryName = await showDialog({
      title: 'Copy Dictionary',
      message: 'Please enter a name for the new dictionary.',
      isInput: true,
      label: 'Dictionary Name',
      defaultValue: dictionaryName + '_copy',
    });
    if (newDictionaryName) {
      await createNewDictionary(dictionaryType, newDictionaryName, currentDictionary);
      if (dictionaryType === 'positive') {
        setDictionaries(await getPositiveDictionaries());
      } else {
        setDictionaries(await getNegativeDictionaries());
      }
      setDictionaryName(newDictionaryName);
      setEditedDictionaryName(newDictionaryName);
    }
  };

  useEffect(() => {
    if (drawerOpen) {
      setEditedDictionaryName(dictionaryName);
    }
  }, [drawerOpen]);

  return (
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} anchor='bottom' keepMounted>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            label='Dictionary Name'
            value={editedDictionaryName}
            onChange={handleDictionaryNameChange}
            size='small'
            disabled={dictionaryName === 'default'}
            InputProps={{
              endAdornment: dictionaryName !== 'default' &&
                editedDictionaryName &&
                editedDictionaryName !== dictionaryName &&
                !dictionaries.includes(editedDictionaryName) &&
                editedDictionaryName.trim() !== '' && (
                  <Button size='small' onClick={handleDictionaryNameSave} sx={{ textTransform: 'none' }} startIcon={<SaveIcon />}>
                    Save
                  </Button>
                ),
            }}
          />
          <Button size='small' variant='outlined' sx={{ textTransform: 'none' }} onClick={handleNewDictionary}>
            New
          </Button>
          <Button size='small' variant='outlined' sx={{ textTransform: 'none' }} onClick={handleImportDictionary}>
            Import
          </Button>
          <Button size='small' variant='outlined' sx={{ textTransform: 'none' }} onClick={handleExportDictionary}>
            Export
          </Button>
          <Button size='small' variant='outlined' sx={{ textTransform: 'none' }} onClick={handleMergeDictionary}>
            Merge
          </Button>
          <Button size='small' variant='outlined' sx={{ textTransform: 'none' }} onClick={handleCopyDictionary}>
            Copy
          </Button>
          <Button size='small' variant='outlined' sx={{ textTransform: 'none' }} color='error' onClick={handleDeleteDictionary}>
            Delete
          </Button>
        </Box>
        <IconButton onClick={() => setDrawerOpen(false)}>
          <ClearIcon />
        </IconButton>
      </Box>
      <Box sx={{ height: 'calc(100vh - 72px)', width: '100%' }}>
        <DataGrid
          apiRef={apiRef}
          rows={rows}
          columns={columns}
          processRowUpdate={processRowUpdate}
          onProcessRowUpdateError={handleProcessRowUpdateError}
          autoHeight
          density='compact'
          getRowHeight={() => 'auto'}
          sx={{ wordWrap: 'break-word' }}
          cellModesModel={cellModesModel}
          onCellModesModelChange={handleCellModesModelChange}
          onCellClick={handleCellClick}
        />
      </Box>
    </Drawer>
  );
};

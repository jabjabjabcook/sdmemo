import { useState, useEffect, useRef, useCallback } from 'react';
import { DarkModeSwitch } from './DarkModeSwitch';
import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Button,
  Select,
  MenuItem,
  SelectChangeEvent,
  Box,
  FormControl,
  InputLabel,
  Typography,
  Tooltip,
  Chip,
  IconButton,
  TextField,
  Divider,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import SaveIcon from '@mui/icons-material/Save';
import debounce from 'lodash/debounce';
import { EventsOn, WindowSetLightTheme, WindowSetDarkTheme, BrowserOpenURL, ClipboardSetText } from '../wailsjs/runtime/runtime';
import { CustomAutocomplete } from './CustomAutocomplete';
import { SelectSaveFileUri, ExportLogs, SelectFile, ImportLogs } from '../wailsjs/go/main/App';
import { DataGridDrawer } from './DataGridDrawer';
import { GlobalDialog } from './GlobalDialog';
import { useDialog } from './hooks/useDialog';
import '@fontsource/roboto';
import '@fontsource/m-plus-1p';
import { checkAndInitializeDB, getDictionary, getPositiveDictionaries, getNegativeDictionaries } from './utils/indexedDB';

type PromptSet = {
  title?: string;
  timestamp: string;
  positive: string[];
  negative: string[];
};

function App() {
  const [isDarkMode, setIsDarkMode] = useState<boolean>(localStorage.getItem('isDarkMode') === 'true' || false);
  const [allPositiveTagList, setAllPositiveTagList] = useState<string[]>(
    JSON.parse(localStorage.getItem('allPositiveTagList') || '[]')
  );
  const [allNegativeTagList, setAllNegativeTagList] = useState<string[]>(
    JSON.parse(localStorage.getItem('allNegativeTagList') || '[]')
  );
  const [selectedPositiveTags, setSelectedPositiveTags] = useState<string[]>([]);
  const [selectedNegativeTags, setSelectedNegativeTags] = useState<string[]>([]);
  const [selectedPositiveDictTags, setSelectedPositiveDictTags] = useState<string[]>([]);
  const [selectedNegativeDictTags, setSelectedNegativeDictTags] = useState<string[]>([]);
  const [promptHistory, setPromptHistory] = useState<PromptSet[]>(JSON.parse(localStorage.getItem('promptHistory') || '[]'));
  const [selectedPromptSet, setSelectedPromptSet] = useState<PromptSet | null>(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<number | null>(null);
  const [positiveDictionaries, setPositiveDictionaries] = useState<string[]>([]);
  const [negativeDictionaries, setNegativeDictionaries] = useState<string[]>([]);
  const [currentPositiveDictName, setCurrentPositiveDictName] = useState<string | null>(null);
  const [currentNegativeDictName, setCurrentNegativeDictName] = useState<string | null>(null);
  const [positiveDictionary, setPositiveDictionary] = useState<{ [key: string]: string[] }>({});
  const [negativeDictionary, setNegativeDictionary] = useState<{ [key: string]: string[] }>({});
  const [positiveDictDrawerOpen, setPositiveDictDrawerOpen] = useState<boolean>(false);
  const [negativeDictDrawerOpen, setNegativeDictDrawerOpen] = useState<boolean>(false);
  const [quickMemo, setQuickMemo] = useState<string>(localStorage.getItem('quickMemo') || '');
  const [title, setTitle] = useState<string>('');

  const copyButtonRef = useRef<HTMLButtonElement>(null);
  const saveButtonRef = useRef<HTMLButtonElement>(null);

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
    typography: {
      fontFamily: ['Roboto', 'sans-serif'].join(','),
    },
  });

  const { isDialogVisible, dialogConfig, showDialog, handleDialogClose } = useDialog();

  useEffect(() => {
    checkAndInitializeDB()
      .catch((error) => {
        console.error('Failed to initialize IndexedDB:', error);
      })
      .then(() => {
        getPositiveDictionaries().then((dicts) => {
          setPositiveDictionaries(dicts ?? []);
          setCurrentPositiveDictName(localStorage.getItem('currentPositiveDictName') || 'default');
        });
        getNegativeDictionaries().then((dicts) => {
          setNegativeDictionaries(dicts ?? []);
          setCurrentNegativeDictName(localStorage.getItem('currentNegativeDictName') || 'default');
        });
      });
  }, []);

  useEffect(() => {
    if (currentPositiveDictName) {
      getDictionary('positive', currentPositiveDictName)
        .then((dict) => setPositiveDictionary(dict))
        .catch((error) => {
          console.error('Failed to get positive dictionary:', error);
        });
      localStorage.setItem('currentPositiveDictName', currentPositiveDictName);
    }
  }, [currentPositiveDictName]);

  useEffect(() => {
    if (currentNegativeDictName) {
      getDictionary('negative', currentNegativeDictName)
        .then((dict) => setNegativeDictionary(dict))
        .catch((error) => {
          console.error('Failed to get negative dictionary:', error);
        });
      localStorage.setItem('currentNegativeDictName', currentNegativeDictName);
    }
  }, [currentNegativeDictName]);

  const handleDarkMode = () => {
    if (!isDarkMode) {
      WindowSetDarkTheme();
    } else {
      WindowSetLightTheme();
    }
    localStorage.setItem('isDarkMode', (!isDarkMode).toString());
    setIsDarkMode(!isDarkMode);
  };

  const handleCopy = async () => {
    await ClipboardSetText(selectedNegativeTags.join(', '));
    await new Promise((resolve) => setTimeout(resolve, 500));
    await ClipboardSetText(selectedPositiveTags.join(', '));

    const sortAndRemoveDuplicates = (arr: string[]) => {
      return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
    };

    const newPositiveTagList = sortAndRemoveDuplicates([...allPositiveTagList, ...selectedPositiveTags]);
    const newNegativeTagList = sortAndRemoveDuplicates([...allNegativeTagList, ...selectedNegativeTags]);

    setAllPositiveTagList(newPositiveTagList);
    setAllNegativeTagList(newNegativeTagList);

    const newPromptSet: PromptSet = {
      title,
      timestamp: new Date().toLocaleString('ja-JP', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      positive: selectedPositiveTags,
      negative: selectedNegativeTags,
    };
  };

  const handleSave = async () => {
    if (selectedPositiveTags.length === 0 && selectedNegativeTags.length === 0) {
      return;
    }

    const sortAndRemoveDuplicates = (arr: string[]) => {
      return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
    };

    const newPositiveTagList = sortAndRemoveDuplicates([...allPositiveTagList, ...selectedPositiveTags]);
    const newNegativeTagList = sortAndRemoveDuplicates([...allNegativeTagList, ...selectedNegativeTags]);

    setAllPositiveTagList(newPositiveTagList);
    setAllNegativeTagList(newNegativeTagList);

    const newPromptSet: PromptSet = {
      title,
      timestamp: new Date().toLocaleString('ja-JP', {
        year: '2-digit',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }),
      positive: selectedPositiveTags,
      negative: selectedNegativeTags,
    };

    const updatedHistory = [newPromptSet, ...promptHistory].slice(0, 1000);
    setPromptHistory(updatedHistory);

    localStorage.setItem('allPositiveTagList', JSON.stringify(newPositiveTagList));
    localStorage.setItem('allNegativeTagList', JSON.stringify(newNegativeTagList));
    localStorage.setItem('promptHistory', JSON.stringify(updatedHistory));
  };

  const handleExport = async () => {
    const fileUri = await SelectSaveFileUri('logs');
    if (fileUri) {
      const data = JSON.stringify({
        allPositiveTagList,
        allNegativeTagList,
        promptHistory,
      });
      await ExportLogs(fileUri, data);
    }
  };

  const handleImport = async () => {
    const file = await SelectFile();
    if (file) {
      const data = await ImportLogs(file);
      const importedData = JSON.parse(data);

      // マージ関数を呼び出す
      mergeImportedData(importedData);
    }
  };

  const mergeImportedData = (importedData: any) => {
    const newPositiveTagList = Array.from(new Set([...allPositiveTagList, ...importedData.allPositiveTagList]));
    const newNegativeTagList = Array.from(new Set([...allNegativeTagList, ...importedData.allNegativeTagList]));
    const newPromptHistory = [...promptHistory, ...importedData.promptHistory];

    setAllPositiveTagList(newPositiveTagList);
    setAllNegativeTagList(newNegativeTagList);
    setPromptHistory(newPromptHistory);

    localStorage.setItem('allPositiveTagList', JSON.stringify(newPositiveTagList));
    localStorage.setItem('allNegativeTagList', JSON.stringify(newNegativeTagList));
    localStorage.setItem('promptHistory', JSON.stringify(newPromptHistory));
  };

  const handleSelectPromptSet = (event: SelectChangeEvent<number>) => {
    const selectedIndex = event.target.value as number;
    const selected = promptHistory[selectedIndex];
    setSelectedPromptSet(selected);
    setSelectedPositiveTags(selected.positive);
    setSelectedNegativeTags(selected.negative);
    setSelectedPositiveDictTags([]);
    setSelectedNegativeDictTags([]);
    setTitle(selected.title || '');
  };

  const handleDeletePromptSet = (index: number) => {
    const updatedHistory = promptHistory.filter((_, i) => i !== index);
    setPromptHistory(updatedHistory);
    localStorage.setItem('promptHistory', JSON.stringify(updatedHistory));
    if (selectedPromptSet === promptHistory[index]) {
      setSelectedPromptSet(null);
      setSelectedPositiveTags([]);
      setSelectedNegativeTags([]);
      setTitle('');
    }
  };

  const handleDeleteTagPositive = (tag: string) => {
    const newList = allPositiveTagList.filter((t) => t !== tag);
    setAllPositiveTagList(newList);
    localStorage.setItem('allPositiveTagList', JSON.stringify(newList));
  };

  const handleDeleteTagNegative = (tag: string) => {
    const newList = allNegativeTagList.filter((t) => t !== tag);
    setAllNegativeTagList(newList);
    localStorage.setItem('allNegativeTagList', JSON.stringify(newList));
  };

  const renderMenuItem = (promptSet: PromptSet, index: number) => (
    <MenuItem
      key={index}
      value={index}
      sx={{
        flexDirection: 'column',
        alignItems: 'flex-start',
        position: 'relative',
      }}
      onMouseEnter={() => setHoveredMenuItem(index)}
      onMouseLeave={() => setHoveredMenuItem(null)}
    >
      <Typography variant='body2' sx={{ mb: 1 }}>
        {promptSet.timestamp} {promptSet.title ? `[${promptSet.title}]` : ''}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {promptSet.positive.map((tag, i) => (
          <Chip
            key={`p-${i}`}
            label={tag}
            size='small'
            color='primary'
            sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
          />
        ))}
      </Box>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
        {promptSet.negative.map((tag, i) => (
          <Chip
            key={`n-${i}`}
            label={tag}
            size='small'
            color='error'
            sx={{ maxWidth: '100%', height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal' } }}
          />
        ))}
      </Box>
      {hoveredMenuItem === index && (
        <IconButton
          size='small'
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleDeletePromptSet(index);
          }}
        >
          <ClearIcon fontSize='small' />
        </IconButton>
      )}
    </MenuItem>
  );

  const debouncedSaveQuickMemo = useCallback(
    debounce((value: string) => {
      localStorage.setItem('quickMemo', value);
    }, 300), // 300msのデバウンス
    []
  );

  const handleQuickMemoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuickMemo(e.target.value);
    debouncedSaveQuickMemo(e.target.value);
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === 'c') {
        event.preventDefault();
        copyButtonRef.current?.focus();
        copyButtonRef.current?.click();
        copyButtonRef.current?.style.setProperty('background-color', theme.palette.secondary.main);
        setTimeout(() => {
          copyButtonRef.current?.style.setProperty('background-color', theme.palette.primary.main);
        }, 500);
      } else if (event.ctrlKey && event.key === 's') {
        event.preventDefault();
        saveButtonRef.current?.focus();
        saveButtonRef.current?.click();
        saveButtonRef.current?.style.setProperty('background-color', theme.palette.secondary.main);
        setTimeout(() => {
          saveButtonRef.current?.style.setProperty('background-color', theme.palette.primary.main);
        }, 500);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <GlobalDialog isOpen={isDialogVisible} config={dialogConfig} onClose={handleDialogClose} />
      <DataGridDrawer
        currentDictionary={positiveDictionary}
        setCurrentDictionary={setPositiveDictionary}
        dictionaryName={currentPositiveDictName ?? ''}
        setDictionaryName={setCurrentPositiveDictName}
        dictionaryType='positive'
        dictionaries={positiveDictionaries}
        setDictionaries={setPositiveDictionaries}
        drawerOpen={positiveDictDrawerOpen}
        setDrawerOpen={setPositiveDictDrawerOpen}
        showDialog={showDialog}
      />
      <DataGridDrawer
        currentDictionary={negativeDictionary}
        setCurrentDictionary={setNegativeDictionary}
        dictionaryName={currentNegativeDictName ?? ''}
        setDictionaryName={setCurrentNegativeDictName}
        dictionaries={negativeDictionaries}
        setDictionaries={setNegativeDictionaries}
        dictionaryType='negative'
        drawerOpen={negativeDictDrawerOpen}
        setDrawerOpen={setNegativeDictDrawerOpen}
        showDialog={showDialog}
      />
      <Box sx={{ p: 2 }}>
        <FormControl fullWidth>
          <InputLabel id='prompt-logs-label' size='small'>
            Prompt set history
          </InputLabel>
          <Select
            labelId='prompt-logs-label'
            id='prompt-logs'
            label='Prompt set history'
            value={selectedPromptSet ? promptHistory.findIndex((p) => p === selectedPromptSet) : ''}
            onChange={handleSelectPromptSet}
            fullWidth
            size='small'
            renderValue={(index) => {
              if (index === -1 || typeof index !== 'number') return '';
              const promptSet = promptHistory[index];
              return `${promptSet.timestamp} ${promptSet.title ? `[${promptSet.title}]` : ''} [P: ${
                promptSet.positive.length
              }] [N: ${promptSet.negative.length}]`;
            }}
          >
            {promptHistory.map((promptSet, index) => renderMenuItem(promptSet, index))}
          </Select>
        </FormControl>
      </Box>
      <Divider />
      <Box sx={{ p: 2, mt: -3 }}>
        <CustomAutocomplete
          tagLabel='Positive'
          allTagList={allPositiveTagList}
          setAllTagList={setAllPositiveTagList}
          selectedTags={selectedPositiveTags}
          handleSelectedTagChange={setSelectedPositiveTags}
          onDeleteTag={handleDeleteTagPositive}
          onClear={() => {
            setSelectedPositiveTags([]);
            setSelectedPromptSet(null);
          }}
          selectedDictTags={selectedPositiveDictTags}
          setSelectedDictTags={setSelectedPositiveDictTags}
          dictionaries={positiveDictionaries}
          currentDictName={currentPositiveDictName ?? ''}
          setCurrentDictName={setCurrentPositiveDictName}
          dictionary={positiveDictionary}
          setDictionary={setPositiveDictionary}
          setDrawerOpen={setPositiveDictDrawerOpen}
          setSelectedPromptSet={setSelectedPromptSet}
        />
      </Box>
      <Divider />
      <Box sx={{ p: 2, mt: -3 }}>
        <CustomAutocomplete
          tagLabel='Negative'
          allTagList={allNegativeTagList}
          setAllTagList={setAllNegativeTagList}
          selectedTags={selectedNegativeTags}
          handleSelectedTagChange={setSelectedNegativeTags}
          onDeleteTag={handleDeleteTagNegative}
          onClear={() => {
            setSelectedNegativeTags([]);
            setSelectedPromptSet(null);
          }}
          selectedDictTags={selectedNegativeDictTags}
          setSelectedDictTags={setSelectedNegativeDictTags}
          dictionaries={negativeDictionaries}
          currentDictName={currentNegativeDictName ?? ''}
          setCurrentDictName={setCurrentNegativeDictName}
          dictionary={negativeDictionary}
          setDictionary={setNegativeDictionary}
          setDrawerOpen={setNegativeDictDrawerOpen}
          setSelectedPromptSet={setSelectedPromptSet}
        />
      </Box>
      <Divider />
      <Box sx={{ p: 2, pt: 0 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mt: 2 }}>
          <Tooltip title='Ctrl + C' arrow>
            <Button
              ref={copyButtonRef}
              onClick={handleCopy}
              variant='contained'
              color='primary'
              startIcon={<ContentPasteIcon />}
              sx={{ mr: 2, textTransform: 'none' }}
            >
              Copy
            </Button>
          </Tooltip>
          <Tooltip title='Ctrl + S' arrow>
            <Button
              ref={saveButtonRef}
              onClick={handleSave}
              variant='contained'
              startIcon={<SaveIcon />}
              color='primary'
              sx={{ mr: 2, textTransform: 'none' }}
            >
              Save
            </Button>
          </Tooltip>
          <TextField
            label='Prompt set title (optional)'
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mr: 1, width: '50%', maxWidth: '300px', '& .MuiInputLabel-formControl': { zIndex: -1 } }}
            size='small'
            InputProps={{
              endAdornment: title && (
                <IconButton size='small' onClick={() => setTitle('')}>
                  <ClearIcon fontSize='small' />
                </IconButton>
              ),
            }}
          />
          <DarkModeSwitch checked={isDarkMode} onChange={handleDarkMode} sx={{ mr: 2 }} />
          <Button onClick={handleImport} variant='outlined' color='info' sx={{ mr: 2, textTransform: 'none' }}>
            Import logs
          </Button>
          <Button onClick={handleExport} variant='outlined' color='info' sx={{ textTransform: 'none' }}>
            Export logs
          </Button>
        </Box>
      </Box>
      <Divider />
      <Box sx={{ p: 2 }}>
        <TextField
          label='Quick Memo'
          sx={{ height: '100%' }}
          value={quickMemo}
          onChange={handleQuickMemoChange}
          fullWidth
          multiline
          rows={8}
        />
      </Box>
    </ThemeProvider>
  );
}

export default App;

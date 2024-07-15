import { useState, useEffect } from 'react';
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
  Chip,
  IconButton,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import { EventsOn, WindowSetLightTheme, WindowSetDarkTheme, BrowserOpenURL, ClipboardSetText } from '../wailsjs/runtime/runtime';
import { CustomAutocomplete } from './CustomAutocomplete';
import { SelectSaveFileUri, ExportLogs, SelectFile, ImportLogs } from '../wailsjs/go/main/App';

interface PromptSet {
  timestamp: string;
  positive: string[];
  negative: string[];
}

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
  const [promptHistory, setPromptHistory] = useState<PromptSet[]>(JSON.parse(localStorage.getItem('promptHistory') || '[]'));
  const [selectedPromptSet, setSelectedPromptSet] = useState<PromptSet | null>(null);
  const [hoveredMenuItem, setHoveredMenuItem] = useState<number | null>(null);

  const theme = createTheme({
    palette: {
      mode: isDarkMode ? 'dark' : 'light',
    },
  });

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
    await ClipboardSetText(selectedPositiveTags.join(', '));

    const sortAndRemoveDuplicates = (arr: string[]) => {
      return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
    };

    const newPositiveTagList = sortAndRemoveDuplicates([...allPositiveTagList, ...selectedPositiveTags]);
    const newNegativeTagList = sortAndRemoveDuplicates([...allNegativeTagList, ...selectedNegativeTags]);

    setAllPositiveTagList(newPositiveTagList);
    setAllNegativeTagList(newNegativeTagList);

    const newPromptSet: PromptSet = {
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
    const fileUri = await SelectSaveFileUri();
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
  };

  const handleDeletePromptSet = (index: number) => {
    const updatedHistory = promptHistory.filter((_, i) => i !== index);
    setPromptHistory(updatedHistory);
    localStorage.setItem('promptHistory', JSON.stringify(updatedHistory));
    if (selectedPromptSet === promptHistory[index]) {
      setSelectedPromptSet(null);
      setSelectedPositiveTags([]);
      setSelectedNegativeTags([]);
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
        {promptSet.timestamp}
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
        {promptSet.positive.map((tag, i) => (
          <Chip
            key={`p-${i}`}
            label={tag}
            size='small'
            color='success'
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

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ p: 2 }}>
        <FormControl fullWidth>
          <InputLabel id='prompt-logs-label'>Prompt History</InputLabel>
          <Select
            labelId='prompt-logs-label'
            id='prompt-logs'
            label='Prompt History'
            value={promptHistory.findIndex((p) => p === selectedPromptSet)}
            onChange={handleSelectPromptSet}
            displayEmpty
            fullWidth
            size='small'
            renderValue={(index) => {
              if (index === -1) return 'Select a prompt set';
              const promptSet = promptHistory[index as number];
              return `${promptSet.timestamp} [P: ${promptSet.positive.length}] [N: ${promptSet.negative.length}]`;
            }}
          >
            {promptHistory.map((promptSet, index) => renderMenuItem(promptSet, index))}
          </Select>
        </FormControl>
        <CustomAutocomplete
          tagList={allPositiveTagList}
          tagLabel='Positive Prompts'
          onChange={setSelectedPositiveTags}
          initialValue={selectedPositiveTags}
          onDeleteTag={handleDeleteTagPositive}
        />
        <CustomAutocomplete
          tagList={allNegativeTagList}
          tagLabel='Negative Prompts'
          onChange={setSelectedNegativeTags}
          initialValue={selectedNegativeTags}
          onDeleteTag={handleDeleteTagNegative}
        />
        <Box sx={{ display: 'flex', justifyContent: 'right', alignItems: 'center', mt: 2 }}>
          <Button onClick={handleCopy} variant='contained' color='primary' sx={{ mr: 2, textTransform: 'none' }}>
            Copy & Save
          </Button>
          <DarkModeSwitch checked={isDarkMode} onChange={handleDarkMode} sx={{ mr: 2 }} />
          <Button onClick={handleImport} variant='outlined' color='inherit' sx={{ mr: 2, textTransform: 'none' }}>
            Import
          </Button>
          <Button onClick={handleExport} variant='outlined' color='inherit' sx={{ textTransform: 'none' }}>
            Export
          </Button>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;

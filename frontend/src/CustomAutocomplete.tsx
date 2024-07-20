import { useState } from 'react';
import { useAutocomplete, AutocompleteGetTagProps } from '@mui/base/useAutocomplete';
import { Check, Close, Clear, Settings } from '@mui/icons-material';
import { styled } from '@mui/material/styles';
import {
  autocompleteClasses,
  Autocomplete,
  IconButton,
  Box,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  DndContext,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverEvent,
  DragOverlay,
  DraggableAttributes,
  DraggableSyntheticListeners,
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { addToDictionary, getDictionary } from './utils/indexedDB';
import '@fontsource-variable/roboto-mono';

const Root = styled('div')(
  ({ theme }) => `
  width: 100%;
  margin-top: 10px;
  color: ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,.85)'};
  font-size: 14px;
`
);

const Label = styled('label')`
  padding: 0 0 4px;
  line-height: 1.5;
  display: block;
`;

const InputWrapper = styled('div')(
  ({ theme }) => `
  width: 100%;
  border: 1px solid ${theme.palette.mode === 'dark' ? '#434343' : '#d9d9d9'};
  background-color: ${theme.palette.mode === 'dark' ? '#141414' : '#fff'};
  border-radius: 4px;
  padding: 1px;
  display: flex;
  flex-wrap: wrap;

  &:hover {
    border-color: ${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'};
  }

  &.focused {
    border: 1px solid ${theme.palette.primary.main};
    box-shadow: 0 0 0 2px rgba(156, 39, 176, 0.2);
  }

  & input {
    background-color: ${theme.palette.mode === 'dark' ? '#141414' : '#fff'};
    color: ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.65)' : 'rgba(0,0,0,.85)'};
    height: 30px;
    box-sizing: border-box;
    padding: 4px 6px;
    width: 0;
    min-width: 30px;
    flex-grow: 1;
    border: 0;
    margin: 0;
    outline: 0;
  }
`
);

interface TagProps extends ReturnType<AutocompleteGetTagProps> {
  id?: string;
  label: string;
  handlerProps?: {
    ref: (element: HTMLElement | null) => void;
    attributes: DraggableAttributes;
    listeners: DraggableSyntheticListeners;
  };
}

function Tag(props: TagProps) {
  const { label, onDelete, handlerProps, ...other } = props;
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div {...other}>
      <span {...handlerProps?.attributes} {...handlerProps?.listeners} style={{ cursor: handlerProps ? 'grab' : 'grabbing' }}>
        {label}
      </span>
      <Close
        onClick={onDelete}
        sx={{ color: isHovered ? theme.palette.error.main : 'inherit' }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
    </div>
  );
}

const StyledTag = styled(Tag)<TagProps>(
  ({ theme }) => `
  display: flex;
  align-items: center;
  height: 24px;
  margin: 2px;
  line-height: 22px;
  background-color: ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.08)' : '#fafafa'};
  border: 1px solid ${theme.palette.mode === 'dark' ? '#303030' : '#e8e8e8'};
  border-radius: 2px;
  box-sizing: content-box;
  padding: 0 4px 0 10px;
  outline: 0;
  overflow: hidden;
  font-family: 'Roboto Mono Variable', monospace;

  &:focus {
    border-color: ${theme.palette.mode === 'dark' ? '#177ddc' : '#40a9ff'};
    background-color: ${theme.palette.mode === 'dark' ? '#003b57' : '#e6f7ff'};
  }

  & span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  & svg {
    font-size: 12px;
    cursor: pointer;
    padding: 4px;
  }

  &:hover {
    border-color: ${theme.palette.primary.main};
  }
`
);

const Listbox = styled('ul')(
  ({ theme }) => `
  width: calc(100% - 30px);
  margin: 2px 0 0;
  padding: 0;
  position: absolute;
  list-style: none;
  background-color: ${theme.palette.mode === 'dark' ? '#141414' : '#fff'};
  overflow: auto;
  max-height: 250px;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  z-index: 1;

  & li {
    padding: 5px 12px;
    display: flex;

    & span {
      flex-grow: 1;
    }

    & svg {
      color: transparent;
    }
  }

  & li[aria-selected='true'] {
    background-color: ${theme.palette.mode === 'dark' ? '#2b2b2b' : '#fafafa'};
    font-weight: 600;

    & svg {
      color: #1890ff;
    }
  }

  & li.${autocompleteClasses.focused} {
    background-color: ${theme.palette.mode === 'dark' ? '#003b57' : '#e6f7ff'};
    cursor: pointer;

    & svg {
      color: currentColor;
    }
  }
`
);

const SortableTag = (props: TagProps & { id: string; isSelected: boolean }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

  const theme = useTheme();
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
    backgroundColor: props.isSelected ? (theme.palette.mode === 'dark' ? '#303030' : '#909090') : 'transparent',
  };

  const { isSelected, ...tagProps } = props;

  return (
    <div ref={setNodeRef} style={style}>
      <StyledTag
        {...tagProps}
        handlerProps={{
          ref: setNodeRef,
          attributes,
          listeners,
        }}
        onDelete={(e) => {
          const deleteTag = props.id;
          e.preventDefault();
          e.stopPropagation();
          props.onDelete(deleteTag);
        }}
      />
    </div>
  );
};

type PromptSet = {
  title?: string;
  timestamp: string;
  positive: string[];
  negative: string[];
};

interface CustomAutocompleteProps {
  tagLabel: string;
  allTagList: string[];
  setAllTagList: (allTagList: string[]) => void;
  selectedTags: string[];
  handleSelectedTagChange: (selectedTags: string[] | ((prev: string[]) => string[])) => void;
  onDeleteTag: (tag: string) => void;
  onClear: () => void;
  selectedDictTags: string[];
  setSelectedDictTags: (selectedTags: string[]) => void;
  dictionaries: string[];
  currentDictName: string;
  setCurrentDictName: (dictName: string) => void;
  dictionary: { [key: string]: string[] };
  setDictionary: (dict: { [key: string]: string[] }) => void;
  setDrawerOpen: (open: boolean) => void;
  setSelectedPromptSet: (promptSet: PromptSet | null) => void;
}

export const CustomAutocomplete = ({
  tagLabel,
  allTagList,
  setAllTagList,
  selectedTags,
  handleSelectedTagChange,
  onDeleteTag,
  onClear,
  selectedDictTags,
  setSelectedDictTags,
  dictionaries,
  currentDictName,
  setCurrentDictName,
  dictionary,
  setDictionary,
  setDrawerOpen,
  setSelectedPromptSet,
}: CustomAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [autoCompleteKey, setAutoCompleteKey] = useState<string>(new Date().toISOString());
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [startIndex, setStartIndex] = useState<number | null>(null);
  const [dictionaryIndex, setDictionaryIndex] = useState<string>('');

  const {
    getRootProps,
    getInputLabelProps,
    getInputProps,
    getTagProps,
    getListboxProps,
    getOptionProps,
    groupedOptions,
    value,
    focused,
    setAnchorEl,
  } = useAutocomplete({
    id: 'customized-hook-' + tagLabel,
    multiple: true,
    options: allTagList,
    value: selectedTags,
    onChange: (_, newValue) => {
      handleSelectedTagChange(newValue);
      const newUniqueTags = sortAndRemoveDuplicates([...allTagList, ...newValue]);
      setAllTagList(newUniqueTags);
      localStorage.setItem(`all${tagLabel}TagList`, JSON.stringify(newUniqueTags));
      setSelectedPromptSet(null);
    },
    inputValue: inputValue,
    onInputChange: (_, newInputValue) => {
      setInputValue(newInputValue);
    },
    getOptionLabel: (option) => option,
    isOptionEqualToValue: (option, value) =>
      option === value || (typeof value === 'string' && option.toLowerCase().includes(value.toLowerCase())),
  });

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTags = inputValue
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag !== '');
      if (newTags.length > 0) {
        const uniqueNewTags = newTags.filter((tag) => !value.includes(tag));
        if (uniqueNewTags.length > 0) {
          handleSelectedTagChange([...selectedTags, ...uniqueNewTags]);
          const newUniqueTags = sortAndRemoveDuplicates([...allTagList, ...newTags]);
          setAllTagList(newUniqueTags);
          localStorage.setItem(`all${tagLabel}TagList`, JSON.stringify(newUniqueTags));
          setSelectedPromptSet(null);
          setInputValue('');
        }
      }
    }
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
    setStartIndex(value.indexOf(event.active.id as string));
  };

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      handleSelectedTagChange((items: string[]) => {
        const oldIndex = items.indexOf(active.id.toString());
        const newIndex = items.indexOf(over.id.toString());

        return arrayMove(items, oldIndex, newIndex);
      });
      setSelectedPromptSet(null);
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(active.id.toString());
      const newIndex = value.indexOf(over.id.toString());
      const newValue = arrayMove(value, oldIndex, newIndex);
      handleSelectedTagChange(newValue);
      setSelectedPromptSet(null);
    } else if (over && active.id === over.id && startIndex === value.indexOf(active.id.toString())) {
      const clickedTag = active.id.toString();
      const updateSelectedDictTags = selectedDictTags.includes(clickedTag)
        ? selectedDictTags.filter((tag) => tag !== clickedTag)
        : [...selectedDictTags, clickedTag];
      setSelectedDictTags(updateSelectedDictTags);
    }

    setActiveId(null);
  };

  const handleAddFromDictionary = (selectedIndex: string) => {
    const newTags = dictionary[selectedIndex];
    const uniqueNewTags = newTags.filter((tag) => !value.includes(tag));
    handleSelectedTagChange([...selectedTags, ...uniqueNewTags]);
    const newUniqueTags = sortAndRemoveDuplicates([...allTagList, ...newTags]);
    setAllTagList(newUniqueTags);
    localStorage.setItem(`all${tagLabel}TagList`, JSON.stringify(newUniqueTags));
    setSelectedPromptSet(null);
  };

  const sortAndRemoveDuplicates = (arr: string[]) => {
    return Array.from(new Set(arr)).sort((a, b) => a.localeCompare(b));
  };

  return (
    <Root>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', mt: 2 }}>
        <Label {...getInputLabelProps()} sx={{ color: tagLabel === 'Positive' ? 'primary.main' : 'error.main' }}>
          {tagLabel}
        </Label>
        <IconButton onClick={onClear} size='small'>
          <Clear fontSize='small' />
        </IconButton>
      </Box>
      <div {...getRootProps()}>
        <InputWrapper ref={setAnchorEl} className={focused ? 'focused' : ''}>
          <DndContext
            sensors={sensors}
            collisionDetection={rectIntersection}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={value}>
              {value.map((option: string, index: number) => {
                const { key, ...tagProps } = getTagProps({ index });
                return (
                  <SortableTag
                    key={key}
                    id={option}
                    {...tagProps}
                    label={option}
                    onDelete={() => {
                      const newValue = value.filter((item) => item !== option);
                      handleSelectedTagChange(newValue);
                      setSelectedPromptSet(null);
                      if (selectedDictTags.includes(option)) {
                        setSelectedDictTags(selectedDictTags.filter((tag) => tag !== option));
                      }
                    }}
                    isSelected={selectedDictTags.includes(option)}
                  />
                );
              })}
            </SortableContext>
            <DragOverlay>
              {activeId
                ? (() => {
                    const { key, ...tagPropsWithoutKey } = getTagProps({ index: 0 });
                    return <StyledTag key={parseInt(activeId)} label={activeId} {...tagPropsWithoutKey} />;
                  })()
                : null}
            </DragOverlay>
          </DndContext>
          <input {...getInputProps()} onKeyDown={handleKeyDown} />
        </InputWrapper>
      </div>
      {groupedOptions.length > 0 ? (
        <Listbox {...getListboxProps()} sx={{ zIndex: 100 }}>
          {(groupedOptions as string[]).map((option, index) => {
            const { key, ...optionProps } = getOptionProps({ option, index }) as {
              key: string;
            } & React.HTMLAttributes<HTMLLIElement>;
            return (
              <li
                key={key}
                {...optionProps}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <span>{option}</span>
                <div>
                  {hoveredIndex === index && (
                    <IconButton
                      size='small'
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteTag(option);
                      }}
                    >
                      <Clear fontSize='small' />
                    </IconButton>
                  )}
                  <IconButton size='small'>
                    <Check fontSize='small' />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </Listbox>
      ) : null}
      <Grid container sx={{ mt: 1 }}>
        <Grid item xs={3}>
          <FormControl fullWidth>
            <InputLabel id={`select-dict-${tagLabel}`}>Dictionary</InputLabel>
            <Select
              size='small'
              labelId={`select-dict-${tagLabel}`}
              id={`select-dict-${tagLabel}`}
              value={currentDictName}
              label='Dictionary'
              onChange={(e) => setCurrentDictName(e.target.value)}
              sx={{ mr: 1 }}
            >
              {dictionaries.map((dictName) => (
                <MenuItem key={dictName} value={dictName}>
                  {dictName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={4.5}>
          <Autocomplete
            key={autoCompleteKey}
            id={`prompt-logs-${tagLabel}`}
            options={Object.keys(dictionary)}
            autoComplete
            disableClearable
            size='small'
            sx={{ mr: 1 }}
            onChange={(_, newValue) => {
              handleAddFromDictionary(newValue as string);
              setAutoCompleteKey(new Date().toISOString());
            }}
            renderInput={(params) => <TextField {...params} label='▲ Put tags from Dict' />}
          />
        </Grid>
        <Grid item xs={4.5} sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            type='text'
            value={dictionaryIndex}
            onChange={(e) => setDictionaryIndex(e.target.value)}
            size='small'
            label='▼ Add tags to Dict'
            placeholder='Enter a index title'
            sx={{ width: 'calc(100% - 36px)' }}
            InputProps={{
              endAdornment: (
                <Button
                  variant='outlined'
                  disabled={selectedDictTags.length === 0 || dictionaryIndex.trim() === ''}
                  size='small'
                  sx={{ textTransform: 'none' }}
                  onClick={async () => {
                    try {
                      await addToDictionary(
                        tagLabel === 'Positive' ? 'positive' : 'negative',
                        currentDictName,
                        dictionaryIndex,
                        selectedDictTags
                      );
                      const newDictionary = { ...dictionary, [dictionaryIndex]: selectedDictTags };
                      const sortedKeys = Object.keys(newDictionary).sort((a, b) => a.localeCompare(b, 'ja'));
                      const sortedDictionary = sortedKeys.reduce((acc, key) => {
                        acc[key] = newDictionary[key];
                        return acc;
                      }, {} as typeof newDictionary);
                      setDictionary(sortedDictionary);
                      setSelectedDictTags([]);
                      setDictionaryIndex('');
                    } catch (error) {
                      console.error('Error adding tags to dictionary:', error);
                    }
                  }}
                >
                  Add
                </Button>
              ),
            }}
          />
          <Tooltip title='Manage Dictionary' arrow>
            <IconButton onClick={() => setDrawerOpen(true)}>
              <Settings fontSize='small' />
            </IconButton>
          </Tooltip>
        </Grid>
      </Grid>
    </Root>
  );
};

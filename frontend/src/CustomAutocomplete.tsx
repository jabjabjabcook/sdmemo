import { useState } from 'react';
import { useAutocomplete, AutocompleteGetTagProps } from '@mui/base/useAutocomplete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import { styled } from '@mui/material/styles';
import { autocompleteClasses, IconButton, Box } from '@mui/material';
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
    border-color: ${theme.palette.mode === 'dark' ? '#177ddc' : '#40a9ff'};
  }

  &.focused {
    border-color: ${theme.palette.mode === 'dark' ? '#177ddc' : '#40a9ff'};
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.2);
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
  return (
    <div {...other}>
      <span {...handlerProps?.attributes} {...handlerProps?.listeners} style={{ cursor: handlerProps ? 'grab' : 'grabbing' }}>
        {label}
      </span>
      <CloseIcon onClick={onDelete} />
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

const SortableTag = (props: TagProps & { id: string }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1,
    touchAction: 'none',
  };

  return (
    <div ref={setNodeRef} style={style}>
      <StyledTag
        {...props}
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

interface CustomAutocompleteProps {
  tagList: string[];
  tagLabel: string;
  onChange: (selectedTags: string[] | ((prev: string[]) => string[])) => void;
  initialValue?: string[];
  onDeleteTag: (tag: string) => void;
  onClear: () => void;
}

export const CustomAutocomplete = ({
  tagList,
  tagLabel,
  onChange,
  initialValue,
  onDeleteTag,
  onClear,
}: CustomAutocompleteProps) => {
  const [inputValue, setInputValue] = useState('');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

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
    options: tagList,
    value: initialValue,
    onChange: (_, newValue) => {
      onChange(newValue);
    },
    inputValue: inputValue,
    onInputChange: (_, newInputValue) => {
      setInputValue(newInputValue);
    },
    getOptionLabel: (option) => option,
    isOptionEqualToValue: (option, value) => option === value,
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
          onChange([...value, ...uniqueNewTags]);
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
  };

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      onChange((items: string[]) => {
        const oldIndex = items.indexOf(active.id.toString());
        const newIndex = items.indexOf(over.id.toString());

        return arrayMove(items, oldIndex, newIndex);
      });
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = value.indexOf(active.id.toString());
      const newIndex = value.indexOf(over.id.toString());
      const newValue = arrayMove(value, oldIndex, newIndex);
      onChange(newValue);
    }

    setActiveId(null);
  };

  return (
    <Root>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Label {...getInputLabelProps()} sx={{ color: tagLabel === 'Positive' ? 'primary.main' : 'error.main' }}>
          {tagLabel}
        </Label>
        <IconButton onClick={onClear} size='small'>
          <ClearIcon fontSize='small' />
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
                      onChange(newValue);
                    }}
                  />
                );
              })}
            </SortableContext>
            <DragOverlay>{activeId ? <StyledTag label={activeId} {...getTagProps({ index: 0 })} /> : null}</DragOverlay>
          </DndContext>
          <input {...getInputProps()} onKeyDown={handleKeyDown} />
        </InputWrapper>
      </div>
      {groupedOptions.length > 0 ? (
        <Listbox {...getListboxProps()}>
          {(groupedOptions as string[]).map((option, index) => {
            const optionProps = getOptionProps({ option, index });
            return (
              <li
                key={index}
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
                      <ClearIcon fontSize='small' />
                    </IconButton>
                  )}
                  <IconButton size='small'>
                    <CheckIcon fontSize='small' />
                  </IconButton>
                </div>
              </li>
            );
          })}
        </Listbox>
      ) : null}
    </Root>
  );
};

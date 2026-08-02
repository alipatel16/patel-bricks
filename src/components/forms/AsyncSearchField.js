import React, { useEffect, useMemo, useState } from 'react';
import { Autocomplete, CircularProgress, TextField } from '@mui/material';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';

const AsyncSearchField = ({
  label,
  placeholder = 'Type at least 2 characters',
  value,
  onChange,
  search,
  getOptionLabel = (option) => option?.name || '',
  renderOption,
  required = false,
  disabled = false,
  helperText = 'Search starts after 2 characters.',
  sx,
}) => {
  const [inputValue, setInputValue] = useState(value ? getOptionLabel(value) : '');
  const [options, setOptions] = useState(value ? [value] : []);
  const [loading, setLoading] = useState(false);
  const [highlightedOption, setHighlightedOption] = useState(null);
  const debounced = useDebouncedValue(inputValue, 350);
  const normalized = useMemo(() => debounced.trim(), [debounced]);

  useEffect(() => {
    const selectedLabel = value ? getOptionLabel(value) : '';
    if (selectedLabel && selectedLabel !== inputValue) setInputValue(selectedLabel);
    if (!value && inputValue && normalized.length < 2) setOptions([]);
    // getOptionLabel is intentionally omitted because callers often pass an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  useEffect(() => {
    let active = true;
    if (value && inputValue === getOptionLabel(value)) {
      setOptions([value]);
      setLoading(false);
      return () => { active = false; };
    }
    if (normalized.length < 2) {
      setOptions(value ? [value] : []);
      setLoading(false);
      return () => { active = false; };
    }
    setLoading(true);
    search(normalized)
      .then((result) => {
        if (!active) return;
        setOptions(result.success ? result.data || [] : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  // getOptionLabel is omitted because callers commonly pass an inline function.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalized, search, value, inputValue]);

  return (
    <Autocomplete
      autoHighlight
      fullWidth
      sx={sx}
      autoSelect
      selectOnFocus
      value={value || null}
      onChange={(_, next) => {
        onChange(next);
        setHighlightedOption(null);
        setInputValue(next ? getOptionLabel(next) : '');
        setOptions(next ? [next] : []);
      }}
      onHighlightChange={(_, option) => setHighlightedOption(option || null)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' || value || options.length === 0) return;
        const next = highlightedOption || options[0];
        if (!next) return;
        // Stop MUI from applying the raw typed text after our explicit selection.
        event.defaultMuiPrevented = true;
        event.preventDefault();
        onChange(next);
        setHighlightedOption(null);
        setInputValue(getOptionLabel(next));
        setOptions([next]);
      }}
      inputValue={inputValue}
      onInputChange={(_, next, reason) => {
        if (reason === 'reset') {
          setInputValue(value ? getOptionLabel(value) : next);
          return;
        }
        if (reason === 'input' && value && next !== getOptionLabel(value)) {
          // Typing after a prior selection starts a fresh server-side search.
          onChange(null);
          setHighlightedOption(null);
        }
        setInputValue(next);
        if (reason === 'clear') {
          onChange(null);
          setHighlightedOption(null);
          setOptions([]);
        }
      }}
      options={options}
      loading={loading}
      disabled={disabled}
      filterOptions={(items) => items}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={(option, selected) => option?.id === selected?.id}
      noOptionsText={inputValue.trim().length < 2 ? 'Type 2 characters to search' : 'No matching records'}
      renderOption={renderOption}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={18} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
    />
  );
};

export default AsyncSearchField;

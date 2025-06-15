'use client';

import AsyncSelect from 'react-select/async';

interface AddressAutocompleteProps {
  state?: string;
  suburb?: string;
  value?: { value: string; label: string } | null;
  onChange: (value: { value: string; label: string } | null) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ state, suburb, value, onChange }) => {
  const loadOptions = async (inputValue: string) => {
    if (!inputValue || !state || !suburb) {
      return [];
    }
    try {
      const query = new URLSearchParams({
        input: inputValue,
        state,
        suburb,
      });
      const res = await fetch(`/api/places?${query.toString()}`);
      const data = await res.json();
      return data.map((place: { description: string }) => ({
        value: place.description,
        label: place.description,
      }));
    } catch (error) {
      console.error('Error fetching address options:', error);
      return [];
    }
  };

  return (
    <AsyncSelect
      cacheOptions
      loadOptions={loadOptions}
      defaultOptions={false}
      placeholder="Search address"
      value={value}
      isClearable
      onChange={(option) => onChange(option as { value: string; label: string } | null)}
      isDisabled={!state || !suburb}
      classNames={{
        control: () => 'p-3 border-2',
        input: () => 'text-lg',
        option: () => 'text-lg',
      }}
      theme={(theme) => ({
        ...theme,
        borderRadius: 6,
        colors: {
          ...theme.colors,
          primary: 'black',
          primary25: '#e3fcf9',
        },
      })}
    />
  );
};

export default AddressAutocomplete;

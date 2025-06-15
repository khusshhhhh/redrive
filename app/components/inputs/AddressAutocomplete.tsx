'use client';

import AsyncSelect from 'react-select/async';
import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/app/libs/GoogleMapLoader';

interface AddressAutocompleteProps {
  state?: string;
  suburb?: string;
  value?: { value: string; label: string } | null;
  onChange: (value: { value: string; label: string } | null) => void;
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ state, suburb, value, onChange }) => {
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);

  useEffect(() => {
    loadGoogleMaps().then((google) => {
      serviceRef.current = new google.maps.places.AutocompleteService();
    });
  }, []);

  const loadOptions = async (inputValue: string) => {
    if (!inputValue || !state || !suburb || !serviceRef.current) {
      return [];
    }

    return new Promise<{ value: string; label: string }[]>((resolve) => {
      serviceRef.current!.getPlacePredictions(
        {
          input: inputValue,
          types: ['address'],
          componentRestrictions: { country: 'au' },
        },
        (predictions) => {
          const results =
            predictions?.filter((p) => {
              const desc = p.description.toLowerCase();
              const matchSuburb = suburb ? desc.includes(suburb.toLowerCase()) : true;
              const matchState = state ? desc.includes(state.toLowerCase()) : true;
              return matchSuburb && matchState;
            }) || [];

          resolve(
            results.map((p) => ({
              value: p.description,
              label: p.description,
            }))
          );
        }
      );
    });
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

"use client";

import { useState } from "react";
import Select from "react-select";
import { selectClassNames, selectStyles } from "./selectStyles";
import {
  OTHER_OPTION,
  VEHICLE_MAKE_NAMES,
  modelsForMake,
} from "@/app/libs/vehicleData";

interface Option {
  value: string;
  label: string;
}

interface VehicleMakeModelSelectProps {
  make: string;
  model: string;
  onChange: (make: string, model: string) => void;
  disabled?: boolean;
  /** Portal the menus to <body>. Off inside the host flow (no clipping modal). */
  portalMenu?: boolean;
}

const OTHER: Option = { value: OTHER_OPTION, label: "Other (not listed)" };

const toOption = (value: string): Option => ({ value, label: value });

const VehicleMakeModelSelect: React.FC<VehicleMakeModelSelectProps> = ({
  make,
  model,
  onChange,
  disabled,
  portalMenu = false,
}) => {
  const [makeIsOther, setMakeIsOther] = useState(
    () => make.trim() !== "" && !VEHICLE_MAKE_NAMES.includes(make),
  );
  const knownModels = makeIsOther ? [] : modelsForMake(make);
  const [modelIsOther, setModelIsOther] = useState(
    () => model.trim() !== "" && !modelsForMake(make).includes(model),
  );

  const portalProps = portalMenu
    ? { menuPortalTarget: typeof window !== "undefined" ? document.body : undefined }
    : {};

  const makeOptions = [...VEHICLE_MAKE_NAMES.map(toOption), OTHER];
  const modelOptions = [...knownModels.map(toOption), OTHER];

  const makeValue: Option | null = makeIsOther
    ? OTHER
    : make
    ? toOption(make)
    : null;
  const modelValue: Option | null = modelIsOther
    ? OTHER
    : model
    ? toOption(model)
    : null;

  const handleMakeChange = (option: Option | null) => {
    if (!option) {
      setMakeIsOther(false);
      setModelIsOther(false);
      onChange("", "");
      return;
    }
    if (option.value === OTHER_OPTION) {
      setMakeIsOther(true);
      setModelIsOther(true);
      onChange("", "");
      return;
    }
    setMakeIsOther(false);
    setModelIsOther(false);
    // Changing the make invalidates any previously chosen model.
    onChange(option.value, "");
  };

  const handleModelChange = (option: Option | null) => {
    if (!option) {
      setModelIsOther(false);
      onChange(make, "");
      return;
    }
    if (option.value === OTHER_OPTION) {
      setModelIsOther(true);
      onChange(make, "");
      return;
    }
    setModelIsOther(false);
    onChange(make, option.value);
  };

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Make</label>
        <Select
          unstyled
          isClearable
          isDisabled={disabled}
          placeholder="Select a make"
          options={makeOptions}
          value={makeValue}
          onChange={(option) => handleMakeChange(option as Option | null)}
          classNames={selectClassNames}
          styles={selectStyles}
          {...portalProps}
        />
        {makeIsOther && (
          <input
            type="text"
            autoFocus
            disabled={disabled}
            value={make}
            onChange={(event) => onChange(event.target.value, model)}
            placeholder="Enter the make"
            className="mt-2 h-12 w-full rounded-sm border border-hairline bg-white px-4 text-base text-ink outline-none transition placeholder:text-sm placeholder:text-muted-soft focus:border-ink focus:ring-1 focus:ring-ink"
          />
        )}
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-medium text-muted">Model</label>
        {makeIsOther || modelIsOther ? (
          <input
            type="text"
            disabled={disabled}
            value={model}
            onChange={(event) => onChange(make, event.target.value)}
            placeholder="Enter the model"
            className="h-12 w-full rounded-sm border border-hairline bg-white px-4 text-base text-ink outline-none transition placeholder:text-sm placeholder:text-muted-soft focus:border-ink focus:ring-1 focus:ring-ink"
          />
        ) : (
          <Select
            unstyled
            isClearable
            isDisabled={disabled || !make}
            placeholder={make ? "Select a model" : "Choose a make first"}
            options={modelOptions}
            value={modelValue}
            onChange={(option) => handleModelChange(option as Option | null)}
            classNames={selectClassNames}
            styles={selectStyles}
            {...portalProps}
          />
        )}
        {modelIsOther && !makeIsOther && (
          <button
            type="button"
            onClick={() => {
              setModelIsOther(false);
              onChange(make, "");
            }}
            className="mt-2 text-xs font-semibold text-primary underline-offset-4 hover:underline"
          >
            Pick from the list instead
          </button>
        )}
      </div>
    </div>
  );
};

export default VehicleMakeModelSelect;

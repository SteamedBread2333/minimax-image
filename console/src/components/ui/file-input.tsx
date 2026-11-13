import { Upload } from "lucide-react";
import * as React from "react";
import { useFormFieldId } from "../FormField";
import { Button } from "./button";
import { cn } from "../../lib/utils";

type FileInputProps = {
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: FileList | null) => void;
  buttonLabel?: string;
  className?: string;
  id?: string;
};

export function FileInput({
  accept = "image/*",
  multiple,
  disabled,
  onFiles,
  buttonLabel = "选择图片",
  className,
  id: idProp,
}: FileInputProps) {
  const fieldId = useFormFieldId();
  const id = idProp ?? fieldId;
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        className="h-10"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-4 w-4" />
        {buttonLabel}
      </Button>
    </div>
  );
}

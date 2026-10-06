"use client";

import { useId, useState } from "react";
import { UploadIcon } from "./icons";

type Props = {
  accept?: string;
  onFile: (file: File) => void;
  title?: string;
  description?: string;
};

export function DropZone({ accept = "image/png,image/jpeg,image/webp", onFile, title = "Drop an image here", description = "PNG, JPEG or WebP · processed locally" }: Props) {
  const id = useId();
  const [dragging, setDragging] = useState(false);

  const receive = (files: FileList | null) => {
    const file = files?.[0];
    if (file) onFile(file);
  };

  return (
    <label
      className={dragging ? "drop-zone is-dragging" : "drop-zone"}
      htmlFor={id}
      onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => { event.preventDefault(); setDragging(false); }}
      onDrop={(event) => { event.preventDefault(); setDragging(false); receive(event.dataTransfer.files); }}
    >
      <input id={id} type="file" accept={accept} onChange={(event) => { receive(event.target.files); event.target.value = ""; }} />
      <span className="upload-icon"><UploadIcon /></span>
      <strong>{title}</strong>
      <span>{description}</span>
      <b>Choose file</b>
    </label>
  );
}

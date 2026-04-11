import { Button, Input, Textarea } from "@heroui/react";
import { ImagePlus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  buildEventPayload,
  EVENT_IMAGE_ACCEPT,
  EVENT_IMAGE_ERROR_MESSAGE,
  toEventFormValues,
  validateEventImageFile,
} from "../../utils/eventUtils";
import CityAutocomplete from "./CityAutocomplete";
import EventCoverImage from "./EventCoverImage";

const EMPTY_EVENT_VALUES = toEventFormValues();

function validateEventForm(values, isCitySelected) {
  if (
    !values.title.trim() ||
    !values.description.trim() ||
    !values.category.trim() ||
    !values.address.trim() ||
    !values.city.trim() ||
    !values.event_date ||
    values.capacity === "" ||
    values.price === ""
  ) {
    return "All event fields are required";
  }

  if (!isCitySelected) {
    return "Please select a supported French city";
  }

  const capacity = Number(values.capacity);
  const price = Number(values.price);
  const parsedDate = new Date(values.event_date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Please provide a valid event date and time";
  }

  if (Number.isNaN(capacity) || capacity <= 0) {
    return "Capacity must be a positive number";
  }

  if (!Number.isInteger(capacity)) {
    return "Capacity must be a whole number";
  }

  if (Number.isNaN(price) || price < 0) {
    return "Price must be a valid number greater than or equal to 0";
  }

  return "";
}

export default function EventForm({
  initialValues,
  title,
  description,
  submitLabel,
  cancelTo = "/dashboard",
  isSubmitting = false,
  errorMessage = "",
  onSubmit,
}) {
  const [values, setValues] = useState(EMPTY_EVENT_VALUES);
  const [validationMessage, setValidationMessage] = useState("");
  const [isCitySelected, setIsCitySelected] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverImagePreviewUrl, setCoverImagePreviewUrl] = useState("");
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    setValues(initialValues ? toEventFormValues(initialValues) : EMPTY_EVENT_VALUES);
    setIsCitySelected(Boolean(initialValues?.city));
    setCoverImageFile(null);
    setCoverImagePreviewUrl(initialValues?.image_url || "");
    setRemoveExistingImage(false);
    setValidationMessage("");
  }, [initialValues]);

  useEffect(() => {
    if (!coverImageFile) {
      return undefined;
    }

    const objectUrl = URL.createObjectURL(coverImageFile);
    setCoverImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [coverImageFile]);

  function handleChange(field) {
    return (event) => {
      const nextValue = event.target.value;

      setValues((currentValues) => ({
        ...currentValues,
        [field]: nextValue,
      }));
    };
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const nextValidationMessage = validateEventForm(values, isCitySelected);

    if (nextValidationMessage) {
      setValidationMessage(nextValidationMessage);
      return;
    }

    const imageValidationMessage = validateEventImageFile(coverImageFile);

    if (imageValidationMessage) {
      setValidationMessage(imageValidationMessage);
      return;
    }

    setValidationMessage("");
    await onSubmit(
      buildEventPayload(values, {
        coverImageFile,
        removeImage: removeExistingImage && !coverImageFile,
      }),
    );
  }

  function handleImageChange(event) {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    const imageValidationMessage = validateEventImageFile(file);

    if (imageValidationMessage) {
      setValidationMessage(imageValidationMessage);
      event.target.value = "";
      return;
    }

    setCoverImageFile(file);
    setRemoveExistingImage(false);
    setValidationMessage("");
  }

  function handleRemoveImage() {
    setCoverImageFile(null);
    setCoverImagePreviewUrl("");
    setRemoveExistingImage(Boolean(initialValues?.image_url));
    setValidationMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  const displayError = validationMessage || errorMessage;
  const hasCoverImage = Boolean(coverImagePreviewUrl);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
          {title}
        </h1>
        <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
      </div>

      {displayError ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
          {displayError}
        </div>
      ) : null}

      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Cover image
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Optional. Upload a JPEG, PNG, or WebP image under 5MB.
          </p>
        </div>

        <EventCoverImage
          src={coverImagePreviewUrl}
          alt="Event cover preview"
          className="h-56 rounded-[1.5rem] border border-zinc-200/80 dark:border-white/10"
          fallbackClassName="px-6 text-center"
        >
          <div>
            <ImagePlus className="mx-auto h-8 w-8" />
            <p className="mt-3 text-sm font-medium">No cover image selected</p>
          </div>
        </EventCoverImage>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept={EVENT_IMAGE_ACCEPT}
            onChange={handleImageChange}
            className="sr-only"
            id="event-cover-image"
          />
          <label
            htmlFor="event-cover-image"
            className="inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-full border border-zinc-200 bg-white/70 px-4 text-sm font-medium text-zinc-950 transition-colors hover:bg-white focus-within:ring-2 focus-within:ring-sky-400/30 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10"
          >
            <ImagePlus size={15} />
            {hasCoverImage ? "Replace image" : "Upload image"}
          </label>

          {hasCoverImage ? (
            <Button
              type="button"
              radius="full"
              color="danger"
              variant="flat"
              startContent={<Trash2 size={15} />}
              onPress={handleRemoveImage}
              className="bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300"
            >
              Remove image
            </Button>
          ) : null}

          {coverImageFile ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {coverImageFile.name}
            </span>
          ) : removeExistingImage ? (
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Existing image will be removed.
            </span>
          ) : null}
        </div>

        <p className="sr-only">{EVENT_IMAGE_ERROR_MESSAGE}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <Input
          label="Event Title"
          labelPlacement="outside"
          placeholder="AI Workshop"
          value={values.title}
          onChange={handleChange("title")}
          radius="lg"
          classNames={{
            inputWrapper:
              "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
          }}
        />

        <Input
          label="Category"
          labelPlacement="outside"
          placeholder="Technology"
          value={values.category}
          onChange={handleChange("category")}
          radius="lg"
          classNames={{
            inputWrapper:
              "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
          }}
        />

        <Input
          label="Address"
          labelPlacement="outside"
          placeholder="28 Rue Notre Dame des Champs"
          value={values.address}
          onChange={handleChange("address")}
          radius="lg"
          classNames={{
            inputWrapper:
              "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
          }}
        />

        <CityAutocomplete
          value={values.city}
          onChange={(nextCity) => {
            setValues((currentValues) => ({
              ...currentValues,
              city: nextCity,
            }));
          }}
          onSelectionChange={setIsCitySelected}
          isSelected={isCitySelected}
        />

        <Input
          label="Date and Time"
          labelPlacement="outside"
          type="datetime-local"
          value={values.event_date}
          onChange={handleChange("event_date")}
          radius="lg"
          classNames={{
            inputWrapper:
              "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
          }}
        />

        <Input
          label="Capacity"
          labelPlacement="outside"
          type="number"
          min="1"
          step="1"
          placeholder="100"
          value={values.capacity}
          onChange={handleChange("capacity")}
          radius="lg"
          classNames={{
            inputWrapper:
              "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
          }}
        />

        <Input
          label="Price (EUR)"
          labelPlacement="outside"
          type="number"
          min="0"
          step="0.01"
          placeholder="0.00"
          value={values.price}
          onChange={handleChange("price")}
          radius="lg"
          classNames={{
            inputWrapper:
              "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
          }}
        />
      </div>

      <Textarea
        label="Description"
        labelPlacement="outside"
        minRows={6}
        placeholder="Describe the event agenda, audience, and key details."
        value={values.description}
        onChange={handleChange("description")}
        radius="lg"
        classNames={{
          inputWrapper:
            "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
        }}
      />

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button
          as={RouterLink}
          to={cancelTo}
          variant="bordered"
          radius="full"
          className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          radius="full"
          isLoading={isSubmitting}
          className="bg-zinc-950 font-medium text-white dark:bg-white dark:text-zinc-950"
        >
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

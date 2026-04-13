import { Button, Checkbox, DatePicker, Input, Select, SelectItem, Textarea } from "@heroui/react";
import { parseDateTime } from "@internationalized/date";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import {
  buildEventPayload,
  calculateTicketTierTotal,
  EVENT_IMAGE_ACCEPT,
  EVENT_IMAGE_ERROR_MESSAGE,
  normalizeTicketTiers,
  toEventFormValues,
  validateEventImageFile,
} from "../../utils/eventUtils";
import CityAutocomplete from "./CityAutocomplete";
import EventCoverImage from "./EventCoverImage";

const EMPTY_EVENT_VALUES = toEventFormValues();
const EVENT_CATEGORY_OPTIONS = [
  "Technology",
  "Business",
  "Design",
  "Music",
  "Engineering",
  "Data",
  "Robotics",
  "Aerospace",
  "Education",
  "Networking",
  "Workshop",
  "Conference",
  "Festival",
  "Sports",
  "Health",
  "Arts",
  "Community",
];

function getDatePickerValue(dateValue) {
  if (!dateValue) {
    return null;
  }

  try {
    return parseDateTime(dateValue);
  } catch {
    return null;
  }
}

function validateEventForm(values, isCitySelected) {
  if (
    !values.title.trim() ||
    !values.description.trim() ||
    !values.category.trim() ||
    !values.address.trim() ||
    !values.city.trim() ||
    !values.event_date ||
    values.capacity === ""
  ) {
    return "All event fields are required";
  }

  if (!isCitySelected) {
    return "Please select a supported French city";
  }

  const capacity = Number(values.capacity);
  const parsedDate = new Date(values.event_date);
  const ticketTiers = normalizeTicketTiers(values.ticket_tiers);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Please provide a valid event date and time";
  }

  if (Number.isNaN(capacity) || capacity <= 0) {
    return "Capacity must be a positive number";
  }

  if (!Number.isInteger(capacity)) {
    return "Capacity must be a whole number";
  }

  if (ticketTiers.length < 1 || ticketTiers.length > 10) {
    return "Event must have between 1 and 10 ticket tiers";
  }

  for (const tier of ticketTiers) {
    const tierPrice = Number(tier.price);
    const tierCapacity = Number(tier.capacity);

    if (
      !tier.name.trim() ||
      Number.isNaN(tierPrice) ||
      tierPrice < 0 ||
      Number.isNaN(tierCapacity) ||
      tierCapacity <= 0 ||
      !Number.isInteger(tierCapacity)
    ) {
      return "Each ticket tier requires name, price >= 0, and capacity > 0";
    }

    if (tier.sold_quantity && tierCapacity < Number(tier.sold_quantity)) {
      return "Ticket tier capacity cannot be lower than sold quantity";
    }
  }

  if (calculateTicketTierTotal(ticketTiers) > capacity) {
    return "Ticket tier capacities cannot exceed event capacity";
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

  function handleDateChange(nextDate) {
    setValues((currentValues) => ({
      ...currentValues,
      event_date: nextDate ? nextDate.toString() : "",
    }));
  }

  function handleCategoryChange(keys) {
    const selectedCategory = Array.from(keys)[0];

    if (selectedCategory) {
      setValues((currentValues) => ({
        ...currentValues,
        category: selectedCategory,
      }));
    }
  }

  function handleTicketTierChange(index, field, nextValue) {
    setValues((currentValues) => ({
      ...currentValues,
      ticket_tiers: normalizeTicketTiers(currentValues.ticket_tiers).map((tier, tierIndex) =>
        tierIndex === index
          ? {
              ...tier,
              [field]: nextValue,
            }
          : tier,
      ),
    }));
  }

  function handleAddTicketTier() {
    setValues((currentValues) => ({
      ...currentValues,
      ticket_tiers: [
        ...normalizeTicketTiers(currentValues.ticket_tiers),
        {
          name: "",
          description: "",
          price: "0",
          capacity: "1",
          is_active: true,
          sort_order: normalizeTicketTiers(currentValues.ticket_tiers).length,
        },
      ],
    }));
  }

  function handleRemoveTicketTier(index) {
    setValues((currentValues) => ({
      ...currentValues,
      ticket_tiers: normalizeTicketTiers(currentValues.ticket_tiers).filter((_, tierIndex) => tierIndex !== index),
    }));
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
  const ticketTiers = normalizeTicketTiers(values.ticket_tiers);
  const ticketTierCapacityTotal = calculateTicketTierTotal(ticketTiers);
  const eventCapacity = Number(values.capacity);
  const isTierCapacityOverLimit =
    Number.isFinite(eventCapacity) && eventCapacity > 0 && ticketTierCapacityTotal > eventCapacity;
  const categoryOptions = useMemo(() => {
    const options = new Set(EVENT_CATEGORY_OPTIONS);

    if (values.category) {
      options.add(values.category);
    }

    return Array.from(options);
  }, [values.category]);

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
          <Button
            as="label"
            htmlFor="event-cover-image"
            radius="full"
            variant="bordered"
            startContent={<ImagePlus size={15} />}
            className="cursor-pointer border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            {hasCoverImage ? "Replace image" : "Upload image"}
          </Button>

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

        <Select
          label="Category"
          labelPlacement="outside"
          placeholder="Select category"
          selectedKeys={values.category ? [values.category] : []}
          onSelectionChange={handleCategoryChange}
          radius="lg"
          variant="bordered"
          classNames={{
            trigger:
              "h-10 border border-zinc-200 bg-white/80 shadow-none data-[hover=true]:bg-white dark:border-white/10 dark:bg-white/5 dark:data-[hover=true]:bg-white/[0.08]",
            label: "font-medium !text-zinc-700 dark:!text-zinc-300",
            value: "text-zinc-900 dark:text-white",
            selectorIcon: "text-zinc-500 dark:text-zinc-400",
            popoverContent:
              "rounded-2xl border border-zinc-200 bg-white/95 p-1 shadow-xl shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-black/30",
            listbox: "gap-1",
          }}
        >
          {categoryOptions.map((category) => (
            <SelectItem
              key={category}
              textValue={category}
              className="rounded-xl text-zinc-800 data-[hover=true]:bg-zinc-100 data-[selectable=true]:focus:bg-zinc-100 data-[selected=true]:bg-zinc-950 data-[selected=true]:text-white dark:text-zinc-100 dark:data-[hover=true]:bg-white/10 dark:data-[selectable=true]:focus:bg-white/10 dark:data-[selected=true]:bg-white dark:data-[selected=true]:text-zinc-950"
            >
              {category}
            </SelectItem>
          ))}
        </Select>

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

        <DatePicker
          label="Date and Time"
          labelPlacement="outside"
          value={getDatePickerValue(values.event_date)}
          onChange={handleDateChange}
          granularity="minute"
          hourCycle={24}
          showMonthAndYearPickers
          radius="lg"
          variant="bordered"
          classNames={{
            inputWrapper:
              "h-10 border border-zinc-200 bg-white/80 shadow-none data-[hover=true]:bg-white dark:border-white/10 dark:bg-white/5 dark:data-[hover=true]:bg-white/[0.08]",
            label: "font-medium !text-zinc-700 dark:!text-zinc-300",
            input: "!text-zinc-900 dark:!text-white",
            segment:
              "text-zinc-900 data-[editable=true]:hover:bg-zinc-100 dark:text-white dark:data-[editable=true]:hover:bg-white/10",
            selectorButton: "text-zinc-500 dark:text-zinc-400",
            popoverContent:
              "rounded-2xl border border-zinc-200 bg-white/95 shadow-xl shadow-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 dark:shadow-black/30",
            calendar: "bg-transparent",
            calendarContent: "bg-transparent",
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

      <div className="space-y-4 rounded-[1.5rem] border border-zinc-200/80 bg-white/60 p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
          <div>
            <h2 className="text-lg font-semibold tracking-[-0.03em] text-zinc-950 dark:text-white">
              Ticket tiers
            </h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Add 1 to 10 custom tiers. Total tier capacity must stay within event capacity.
            </p>
            <p
              className={`mt-2 text-xs font-semibold ${
                isTierCapacityOverLimit
                  ? "text-red-600 dark:text-red-300"
                  : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              Tier capacity total: {ticketTierCapacityTotal}
              {values.capacity ? ` / ${values.capacity}` : ""}
            </p>
          </div>

          <Button
            type="button"
            radius="full"
            variant="bordered"
            startContent={<Plus size={15} />}
            onPress={handleAddTicketTier}
            isDisabled={ticketTiers.length >= 10}
            className="border-zinc-200 bg-white/70 font-medium text-zinc-950 dark:border-white/10 dark:bg-white/5 dark:text-white"
          >
            Add tier
          </Button>
        </div>

        <div className="space-y-4">
          {ticketTiers.map((tier, index) => {
            const soldQuantity = Number(tier.sold_quantity) || 0;
            const canRemoveTier = ticketTiers.length > 1 && soldQuantity === 0;

            return (
              <div
                key={tier.id || `ticket-tier-${index}`}
                className="rounded-2xl border border-zinc-200/80 bg-white/80 p-4 dark:border-white/10 dark:bg-white/[0.04]"
              >
                <div className="flex flex-col gap-4">
                  <div className="grid gap-4 md:grid-cols-[1fr_1fr_8rem_8rem]">
                    <Input
                      label="Tier name"
                      labelPlacement="outside"
                      placeholder="VIP"
                      value={tier.name}
                      onChange={(event) => handleTicketTierChange(index, "name", event.target.value)}
                      radius="lg"
                      classNames={{
                        inputWrapper:
                          "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
                      }}
                    />

                    <Input
                      label="Description"
                      labelPlacement="outside"
                      placeholder="Premium access"
                      value={tier.description}
                      onChange={(event) => handleTicketTierChange(index, "description", event.target.value)}
                      radius="lg"
                      classNames={{
                        inputWrapper:
                          "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
                      }}
                    />

                    <Input
                      label="Price"
                      labelPlacement="outside"
                      type="number"
                      min="0"
                      step="0.01"
                      value={tier.price}
                      onChange={(event) => handleTicketTierChange(index, "price", event.target.value)}
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
                      min={Math.max(1, soldQuantity)}
                      step="1"
                      value={tier.capacity}
                      onChange={(event) => handleTicketTierChange(index, "capacity", event.target.value)}
                      radius="lg"
                      classNames={{
                        inputWrapper:
                          "bg-white/80 dark:bg-white/5 border border-zinc-200 dark:border-white/10 shadow-none",
                      }}
                    />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <Checkbox
                      isSelected={tier.is_active !== false}
                      onValueChange={(isSelected) =>
                        handleTicketTierChange(index, "is_active", isSelected)
                      }
                      classNames={{
                        label: "text-sm font-medium text-zinc-700 dark:text-zinc-300",
                        wrapper:
                          "border-zinc-300 before:border-zinc-300 dark:border-white/20 dark:before:border-white/20",
                      }}
                    >
                      Active tier
                    </Checkbox>

                    <div className="flex flex-wrap items-center gap-3">
                      {soldQuantity > 0 ? (
                        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                          {soldQuantity} sold
                        </span>
                      ) : null}

                      <Button
                        type="button"
                        radius="full"
                        color="danger"
                        variant="flat"
                        startContent={<Trash2 size={15} />}
                        onPress={() => handleRemoveTicketTier(index)}
                        isDisabled={!canRemoveTier}
                        className="bg-red-50 font-medium text-red-600 dark:bg-red-500/10 dark:text-red-300"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

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

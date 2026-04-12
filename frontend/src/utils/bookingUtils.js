export function isFinalBookingPaymentState(booking) {
  if (!booking) {
    return false;
  }

  return (
    (booking.status === "confirmed" && booking.payment_status === "paid") ||
    (booking.status === "cancelled" &&
      ["failed", "expired", "cancelled"].includes(booking.payment_status))
  );
}

export function getBookingDisplayState(booking) {
  if (!booking) {
    return {
      tone: "info",
      title: "Checking booking status",
      description: "We are checking your booking status with the backend.",
      label: "Checking",
    };
  }

  if (booking.status === "pending_payment" && booking.payment_status === "unpaid") {
    return {
      tone: "warning",
      title: "Payment is processing",
      description:
        "Your checkout is waiting for Stripe confirmation. This page will update automatically.",
      label: "Pending payment",
    };
  }

  if (booking.status === "confirmed" && booking.payment_status === "paid") {
    return {
      tone: "success",
      title: "Booking confirmed",
      description: "Your booking is confirmed and your payment status is paid.",
      label: "Confirmed",
    };
  }

  if (booking.status === "cancelled" && booking.payment_status === "failed") {
    return {
      tone: "error",
      title: "Payment failed",
      description: "The payment failed or the event became full before confirmation.",
      label: "Payment failed",
    };
  }

  if (booking.status === "cancelled" && booking.payment_status === "expired") {
    return {
      tone: "error",
      title: "Checkout expired",
      description: "The Stripe Checkout session expired before payment was completed.",
      label: "Expired",
    };
  }

  if (booking.status === "cancelled" && booking.payment_status === "cancelled") {
    return {
      tone: "neutral",
      title: "Booking cancelled",
      description: "This booking was cancelled.",
      label: "Cancelled",
    };
  }

  return {
    tone: "neutral",
    title: "Booking status updated",
    description: `Current status: ${booking.status || "unknown"}.`,
    label: booking.status || "Unknown",
  };
}

export function getBookingToneClassName(tone) {
  switch (tone) {
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300";
    case "warning":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300";
    case "error":
      return "border-red-200 bg-red-50 text-red-600 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300";
    default:
      return "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/10 dark:text-zinc-300";
  }
}

export function formatBookingAmount(amount, currency = "eur") {
  const numericAmount = Number(amount);

  if (Number.isNaN(numericAmount)) {
    return "Not paid";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "eur",
    minimumFractionDigits: 2,
  }).format(numericAmount);
}

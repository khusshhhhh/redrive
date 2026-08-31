"use client";

import { useMemo, useState } from "react";
import axios from "axios";

import Modal from "@/app/components/modals/Modal";
import toast from "@/app/libs/toast";
import { calculateCancellationOutcome } from "@/app/libs/cancellationPolicy";
import type { SafeReservation } from "@/app/types";

interface CancelBookingDialogProps {
  reservation: SafeReservation | null;
  role: "GUEST" | "HOST";
  open: boolean;
  onClose: () => void;
  onCancelled: () => void;
}

const money = (value: number) => `AU$${Math.round(value).toLocaleString("en-AU")}`;

export default function CancelBookingDialog({
  reservation,
  role,
  open,
  onClose,
  onCancelled,
}: CancelBookingDialogProps) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const outcome = useMemo(() => {
    if (!reservation) return null;
    return calculateCancellationOutcome({
      policy: reservation.cancellationPolicy,
      pickupAt: reservation.startDate,
      cancelledByHost: role === "HOST",
    });
  }, [reservation, role]);

  const hasPaid = ["PAID_HELD", "RELEASED"].includes(reservation?.paymentStatus || "");
  const refundPercent = role === "HOST" ? 100 : outcome?.refundPercentage ?? 0;
  const refund = hasPaid && reservation ? Math.round((reservation.totalFees * refundPercent) / 100) : 0;

  const submit = async () => {
    if (!reservation) return;
    setSubmitting(true);
    try {
      const response = await axios.delete(`/api/reservations/${reservation.id}`, {
        data: { reason: reason.trim() || undefined },
      });
      toast.success(
        response.data?.refundAmount > 0
          ? `Booking cancelled · ${money(response.data.refundAmount)} refund started`
          : "Booking cancelled",
      );
      setReason("");
      onCancelled();
      onClose();
    } catch (error) {
      toast.error(
        axios.isAxiosError<{ error?: string }>(error)
          ? error.response?.data?.error || "The booking could not be cancelled"
          : "The booking could not be cancelled",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const body = (
    <div className="space-y-4 text-sm">
      <p className="text-muted">
        {role === "HOST"
          ? "Cancelling releases the dates immediately and refunds the guest in full. Frequent host cancellations affect how your listings rank."
          : outcome?.explanation ||
            "Review the refund below before you confirm — this can't be undone."}
      </p>

      {reservation && (
        <div className="rounded-md border border-hairline-soft">
          <Row label="Vehicle" value={reservation.listing?.title ?? "—"} />
          <Row
            label="Dates"
            value={`${new Date(reservation.startDate).toLocaleDateString("en-AU")} – ${new Date(
              reservation.endDate,
            ).toLocaleDateString("en-AU")}`}
          />
          {hasPaid ? (
            <>
              <Row label="Paid" value={money(reservation.totalFees)} />
              <Row
                label={role === "HOST" ? "Guest refund" : "Your refund"}
                value={`${money(refund)} (${refundPercent}%)`}
                emphasise
              />
            </>
          ) : (
            <Row label="Payment" value="Nothing has been collected yet" />
          )}
        </div>
      )}

      <label className="block">
        <span className="text-xs font-semibold text-muted">
          {role === "HOST" ? "Reason for the guest" : "Message to the host (optional)"}
        </span>
        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value.slice(0, 500))}
          rows={3}
          className="mt-1 w-full rounded-sm border border-hairline bg-white p-2 text-sm"
          placeholder={
            role === "HOST"
              ? "Let the guest know why — it's kept on the booking record."
              : "Anything the host should know."
          }
        />
      </label>
    </div>
  );

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      onSubmit={() => void submit()}
      title={role === "HOST" ? "Cancel this guest's booking" : "Cancel this booking"}
      actionLabel={submitting ? "Cancelling…" : "Cancel booking"}
      secondaryActionLabel="Keep booking"
      secondaryAction={onClose}
      disabled={submitting}
      loading={submitting}
      compact
      body={body}
    />
  );
}

function Row({
  label,
  value,
  emphasise,
}: {
  label: string;
  value: string;
  emphasise?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-hairline-soft px-4 py-2.5 last:border-b-0">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-right ${emphasise ? "font-semibold text-ink" : "text-ink"}`}>{value}</span>
    </div>
  );
}

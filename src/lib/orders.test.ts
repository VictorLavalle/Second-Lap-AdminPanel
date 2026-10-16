import { describe, expect, it } from "vitest";
import {
  buildWhatsappLink,
  formatOrderDate,
  isPending,
  ORDER_STATUS_LABELS,
} from "./orders";

describe("isPending", () => {
  it("is true only for pending", () => {
    expect(isPending("pending")).toBe(true);
    expect(isPending("confirmed")).toBe(false);
    expect(isPending("cancelled")).toBe(false);
  });
});

describe("ORDER_STATUS_LABELS", () => {
  it("maps each status to a Spanish label", () => {
    expect(ORDER_STATUS_LABELS.pending).toBe("Pendiente");
    expect(ORDER_STATUS_LABELS.confirmed).toBe("Confirmado");
    expect(ORDER_STATUS_LABELS.cancelled).toBe("Cancelado");
  });
});

describe("buildWhatsappLink", () => {
  it("strips non-digits from the number", () => {
    expect(buildWhatsappLink("+52 999 638 4026")).toBe(
      "https://wa.me/529996384026",
    );
  });

  it("appends an encoded message when provided", () => {
    expect(buildWhatsappLink("529996384026", "Hola Ana")).toBe(
      "https://wa.me/529996384026?text=Hola%20Ana",
    );
  });
});

describe("formatOrderDate", () => {
  it("formats a valid ISO date", () => {
    expect(formatOrderDate("2026-01-15T18:30:00.000Z")).not.toBe(
      "2026-01-15T18:30:00.000Z",
    );
  });

  it("returns the input unchanged when it is not a valid date", () => {
    expect(formatOrderDate("not-a-date")).toBe("not-a-date");
  });
});

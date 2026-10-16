import { describe, expect, it } from "vitest";
import {
  ORDER_STATUS_LABELS,
  actionDialogCopy,
  allowedActions,
  buildWhatsappLink,
  eventLabel,
  formatOrderDate,
  hasActions,
} from "./orders";
import type { OrderStatus } from "@/types";

describe("ORDER_STATUS_LABELS", () => {
  it("maps every status to a Spanish label", () => {
    expect(ORDER_STATUS_LABELS.pendiente).toBe("Pendiente");
    expect(ORDER_STATUS_LABELS.confirmado).toBe("Confirmado");
    expect(ORDER_STATUS_LABELS.completado).toBe("Completado");
    expect(ORDER_STATUS_LABELS.entregado).toBe("Entregado");
    expect(ORDER_STATUS_LABELS.cancelado).toBe("Cancelado");
  });
});

describe("allowedActions", () => {
  it("offers confirm and cancel for pendiente", () => {
    expect(allowedActions("pendiente").map((a) => a.kind)).toEqual([
      "confirm",
      "cancel",
    ]);
  });

  it("offers complete for confirmado", () => {
    expect(allowedActions("confirmado").map((a) => a.kind)).toEqual([
      "complete",
    ]);
  });

  it("offers deliver for completado", () => {
    expect(allowedActions("completado").map((a) => a.kind)).toEqual([
      "deliver",
    ]);
  });

  it("offers no actions for terminal states", () => {
    expect(allowedActions("entregado")).toEqual([]);
    expect(allowedActions("cancelado")).toEqual([]);
  });

  it("marks only cancel as a danger action", () => {
    const cancel = allowedActions("pendiente").find((a) => a.kind === "cancel");
    const confirm = allowedActions("pendiente").find(
      (a) => a.kind === "confirm",
    );
    expect(cancel?.danger).toBe(true);
    expect(confirm?.danger).toBe(false);
  });
});

describe("hasActions", () => {
  it("is true for non-terminal, false for terminal", () => {
    expect(hasActions("pendiente")).toBe(true);
    expect(hasActions("confirmado")).toBe(true);
    expect(hasActions("completado")).toBe(true);
    expect(hasActions("entregado")).toBe(false);
    expect(hasActions("cancelado")).toBe(false);
  });
});

describe("actionDialogCopy", () => {
  it("returns distinct copy per action kind", () => {
    expect(actionDialogCopy("confirm").confirmLabel).toBe("Confirmar");
    expect(actionDialogCopy("complete").confirmLabel).toBe("Completar");
    expect(actionDialogCopy("deliver").confirmLabel).toBe("Entregar");
    expect(actionDialogCopy("cancel").confirmLabel).toBe("Cancelar pedido");
  });
});

describe("eventLabel", () => {
  it("labels the creation event as Creado", () => {
    expect(eventLabel(null, "pendiente")).toBe("Creado");
  });

  it("labels other events by the target status", () => {
    expect(eventLabel("pendiente", "confirmado")).toBe("Confirmado");
    expect(eventLabel("completado", "entregado")).toBe("Entregado");
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

describe("OrderStatus type coverage", () => {
  it("has a label for every status value used in tests", () => {
    const all: OrderStatus[] = [
      "pendiente",
      "confirmado",
      "completado",
      "entregado",
      "cancelado",
    ];
    for (const status of all) {
      expect(ORDER_STATUS_LABELS[status]).toBeTruthy();
    }
  });
});

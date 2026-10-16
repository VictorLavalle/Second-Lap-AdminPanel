import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ConfirmDialog } from "./ConfirmDialog";

afterEach(cleanup);

function setup(open: boolean) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  render(
    <ConfirmDialog
      open={open}
      title="Eliminar"
      description="¿Seguro?"
      confirmLabel="Eliminar"
      onConfirm={onConfirm}
      onClose={onClose}
    />,
  );
  return { onConfirm, onClose };
}

describe("ConfirmDialog", () => {
  it("opens the native dialog when open is true", () => {
    setup(true);
    const dialog = screen.getByRole("dialog", { hidden: true });
    expect((dialog as HTMLDialogElement).open).toBe(true);
  });

  it("invokes onConfirm when confirming", () => {
    const { onConfirm } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Eliminar" }));
    expect(onConfirm).toHaveBeenCalled();
  });

  it("invokes onClose when cancelling", () => {
    const { onClose } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("invokes onClose on the dialog cancel (Escape) event", () => {
    const { onClose } = setup(true);
    const dialog = screen.getByRole("dialog", { hidden: true });
    fireEvent(dialog, new Event("cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes the native dialog when open flips to false", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    const { rerender } = render(
      <ConfirmDialog
        open
        title="Eliminar"
        description="¿Seguro?"
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    const dialog = screen.getByRole("dialog", { hidden: true }) as HTMLDialogElement;
    expect(dialog.open).toBe(true);

    rerender(
      <ConfirmDialog
        open={false}
        title="Eliminar"
        description="¿Seguro?"
        confirmLabel="Eliminar"
        onConfirm={onConfirm}
        onClose={onClose}
      />,
    );
    expect(dialog.open).toBe(false);
  });
});

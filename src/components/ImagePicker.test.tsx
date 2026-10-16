import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { ImagePicker } from "./ImagePicker";

afterEach(cleanup);

function png(name = "a.png") {
  return new File(["x"], name, { type: "image/png" });
}

describe("ImagePicker", () => {
  it("reports the selected files via onChange", () => {
    const onChange = vi.fn();
    render(<ImagePicker files={[]} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("Imágenes"), {
      target: { files: [png()] },
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0]).toHaveLength(1);
  });

  it("renders a preview and a remove button per selected file", () => {
    render(<ImagePicker files={[png("one.png")]} onChange={vi.fn()} />);
    expect(screen.getByAltText("Vista previa de one.png")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Quitar one.png" }),
    ).toBeInTheDocument();
  });

  it("removes a file, reporting the shortened list", () => {
    const onChange = vi.fn();
    render(
      <ImagePicker files={[png("one.png")]} onChange={onChange} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quitar one.png" }));
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("shows an error message when provided", () => {
    render(
      <ImagePicker files={[]} onChange={vi.fn()} error="Formato no permitido." />,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Formato no permitido.");
  });
});

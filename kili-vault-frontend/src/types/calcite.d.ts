import type { DetailedHTMLProps, HTMLAttributes } from "react";

type CalciteElement = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  active?: boolean;
  appearance?: string;
  checked?: boolean;
  closable?: boolean;
  disabled?: boolean;
  heading?: string;
  icon?: string;
  "icon-start"?: string;
  kind?: string;
  layout?: string;
  label?: string;
  message?: string;
  name?: string;
  open?: boolean;
  placeholder?: string;
  scale?: string;
  selected?: boolean;
  slot?: string;
  status?: string;
  text?: string;
  textEnabled?: boolean;
  type?: string;
  value?: string;
  description?: string;
};

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "calcite-action": CalciteElement;
        "calcite-action-bar": CalciteElement;
        "calcite-button": CalciteElement;
        "calcite-checkbox": CalciteElement;
        "calcite-icon": CalciteElement;
        "calcite-input": CalciteElement;
        "calcite-label": CalciteElement;
        "calcite-loader": CalciteElement;
        "calcite-list": CalciteElement;
        "calcite-list-item": CalciteElement;
        "calcite-notice": CalciteElement;
        "calcite-option": CalciteElement;
        "calcite-panel": CalciteElement;
        "calcite-select": CalciteElement;
        "calcite-shell-panel": CalciteElement;
        "calcite-tooltip": CalciteElement;
      }
    }
  }
}

export {};

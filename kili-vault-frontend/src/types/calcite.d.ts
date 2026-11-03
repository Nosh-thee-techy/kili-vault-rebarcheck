import type { DetailedHTMLProps, HTMLAttributes } from "react";

type CalciteElement = DetailedHTMLProps<
  HTMLAttributes<HTMLElement>,
  HTMLElement
> & {
  active?: boolean;
  appearance?: string;
  bordered?: boolean;
  checked?: boolean;
  closable?: boolean;
  disabled?: boolean;
  collapsible?: boolean;
  caption?: string;
  heading?: string;
  icon?: string;
  "icon-start"?: string;
  kind?: string;
  layout?: string;
  label?: string;
  labelText?: string;
  loading?: boolean;
  max?: string;
  min?: string;
  message?: string;
  name?: string;
  open?: boolean;
  placeholder?: string;
  scale?: string;
  selected?: boolean;
  striped?: boolean;
  slot?: string;
  status?: string;
  step?: string;
  text?: string;
  textEnabled?: boolean;
  type?: string;
  value?: string;
  description?: string;
  headingLevel?: number;
  oncalciteInputInput?: (event: CustomEvent) => void;
  oncalciteSelectChange?: (event: CustomEvent) => void;
};

declare global {
  namespace React {
    namespace JSX {
      interface IntrinsicElements {
        "calcite-action": CalciteElement;
        "calcite-action-bar": CalciteElement;
        "calcite-button": CalciteElement;
        "calcite-block": CalciteElement;
        "calcite-checkbox": CalciteElement;
        "calcite-chip": CalciteElement;
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
        "calcite-table": CalciteElement;
        "calcite-table-cell": CalciteElement;
        "calcite-table-header": CalciteElement;
        "calcite-table-row": CalciteElement;
        "calcite-tooltip": CalciteElement;
      }
    }
  }
}

export {};

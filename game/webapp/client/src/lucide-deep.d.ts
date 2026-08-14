// Style reminder: icon imports stay deliberate and lightweight; this declaration preserves typed JSX props.

declare module "lucide-react/dist/esm/icons/*" {
  import type { ComponentType, SVGProps } from "react";
  const icon: ComponentType<SVGProps<SVGSVGElement> & { size?: string | number; strokeWidth?: string | number }>;
  export default icon;
}

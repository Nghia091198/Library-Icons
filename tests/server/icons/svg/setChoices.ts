import type { ProcessSvgSourceOptions } from '@/server/icons/svg/processSvgSource';
import { ICON_SET_STYLE, type IconSetStyle } from '@/shared/constants/icons';

export function fixedSet(style: IconSetStyle): ProcessSvgSourceOptions {
  const strokeWidth = style === ICON_SET_STYLE.outline ? 1.5 : null;
  return { chooseSet: () => ({ setId: `set-${style}`, style, strokeWidth }) };
}

export function autoSet(): ProcessSvgSourceOptions {
  return {
    chooseSet: ({ detectedStyle }) => ({
      setId: `set-${detectedStyle}`,
      style: detectedStyle,
      strokeWidth: detectedStyle === ICON_SET_STYLE.outline ? 1.5 : null,
    }),
  };
}

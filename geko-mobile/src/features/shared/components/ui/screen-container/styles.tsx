import { isWeb } from '@gluestack-ui/utils/nativewind-utils';
import { tva } from '@gluestack-ui/utils/nativewind-utils';

const baseStyle = isWeb
  ? 'flex flex-col relative z-0 box-border border-0 list-none min-w-0 min-h-0 bg-transparent items-stretch m-0 p-0 text-decoration-none'
  : '';

export const screenContainerStyle = tva({
  base: `flex-1 ${baseStyle}`,
  variants: {
    variant: {
      default: '',
      fullscreen: '',
      padded: 'p-4',
    },
  },
});


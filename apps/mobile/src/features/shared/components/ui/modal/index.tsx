'use client';
import React from 'react';
import { createModal } from '@gluestack-ui/core/modal/creator';
import { Pressable, View, ScrollView, ViewStyle } from 'react-native';
import {
  Motion,
  AnimatePresence,
  createMotionAnimatedComponent,
  MotionComponentProps,
} from '@legendapp/motion';
import { tva } from '@gluestack-ui/utils/nativewind-utils';
import {
  withStyleContext,
  useStyleContext,
} from '@gluestack-ui/utils/nativewind-utils';
import { cssInterop } from 'nativewind';

type IAnimatedPressableProps = React.ComponentProps<typeof Pressable> &
  MotionComponentProps<typeof Pressable, ViewStyle, unknown, unknown, unknown>;

const AnimatedPressable = createMotionAnimatedComponent(
  Pressable
) as React.ComponentType<IAnimatedPressableProps>;
const SCOPE = 'MODAL';

type IMotionViewProps = React.ComponentProps<typeof View> &
  MotionComponentProps<typeof View, ViewStyle, unknown, unknown, unknown>;

const MotionView = Motion.View as React.ComponentType<IMotionViewProps>;

const UIModal = createModal({
  Root: withStyleContext(View, SCOPE),
  Backdrop: AnimatedPressable,
  Content: MotionView,
  Body: ScrollView,
  CloseButton: Pressable,
  Footer: View,
  Header: View,
  AnimatePresence: AnimatePresence,
});

cssInterop(AnimatedPressable, { className: 'style' });
cssInterop(MotionView, { className: 'style' });

type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'full';

const modalStyle = tva({
  base: 'group/modal w-full h-full justify-center items-center web:pointer-events-none',
  variants: {
    size: {
      xs: '',
      sm: '',
      md: '',
      lg: '',
      full: '',
    },
  },
});

const modalBackdropStyle = tva({
  base: 'absolute left-0 top-0 right-0 bottom-0 bg-background-dark web:cursor-default',
});

const modalContentStyle = tva({
  base: 'bg-background-0 rounded-md overflow-hidden border border-outline-100 shadow-hard-2 p-6',
  parentVariants: {
    size: {
      xs: 'w-[60%] max-w-[360px]',
      sm: 'w-[70%] max-w-[420px]',
      md: 'w-[80%] max-w-[510px]',
      lg: 'w-[90%] max-w-[640px]',
      full: 'w-full',
    },
  },
});

const modalBodyStyle = tva({
  base: 'mt-2 mb-6',
});

const modalHeaderStyle = tva({
  base: 'justify-between items-center flex-row',
});

const modalFooterStyle = tva({
  base: 'flex-row justify-end items-center gap-2',
});

const ModalRoot = React.forwardRef<
  React.ComponentRef<typeof UIModal>,
  React.ComponentProps<typeof UIModal> & { size?: ModalSize; className?: string }
>(function ModalRoot({ className, size = 'md', ...props }, ref) {
  return (
    <UIModal
      ref={ref}
      {...props}
      pointerEvents="box-none"
      className={modalStyle({ size, class: className })}
      context={{ size }}
    />
  );
});

const ModalBackdropPrimitive = React.forwardRef<
  React.ComponentRef<typeof UIModal.Backdrop>,
  React.ComponentProps<typeof UIModal.Backdrop> & { className?: string }
>(function ModalBackdropPrimitive({ className, ...props }, ref) {
  return (
    <UIModal.Backdrop
      ref={ref}
      initial={{ opacity: 0 }}
      animate={{ opacity: 0.5 }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 250,
        opacity: { type: 'timing', duration: 250 },
      }}
      {...props}
      className={modalBackdropStyle({ class: className })}
    />
  );
});

const ModalContentPrimitive = React.forwardRef<
  React.ComponentRef<typeof UIModal.Content>,
  React.ComponentProps<typeof UIModal.Content> & { size?: ModalSize; className?: string }
>(function ModalContentPrimitive({ className, size, ...props }, ref) {
  const { size: parentSize } = useStyleContext(SCOPE);

  return (
    <UIModal.Content
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{
        type: 'spring',
        damping: 18,
        stiffness: 250,
        opacity: { type: 'timing', duration: 250 },
      }}
      {...props}
      className={modalContentStyle({
        parentVariants: { size: parentSize },
        size,
        class: className,
      })}
      pointerEvents="auto"
    />
  );
});

const ModalHeaderPrimitive = React.forwardRef<
  React.ComponentRef<typeof UIModal.Header>,
  React.ComponentProps<typeof UIModal.Header> & { className?: string }
>(function ModalHeaderPrimitive({ className, ...props }, ref) {
  return (
    <UIModal.Header ref={ref} {...props} className={modalHeaderStyle({ class: className })} />
  );
});

const ModalBodyPrimitive = React.forwardRef<
  React.ComponentRef<typeof UIModal.Body>,
  React.ComponentProps<typeof UIModal.Body> & { className?: string }
>(function ModalBodyPrimitive({ className, ...props }, ref) {
  return <UIModal.Body ref={ref} {...props} className={modalBodyStyle({ class: className })} />;
});

const ModalFooterPrimitive = React.forwardRef<
  React.ComponentRef<typeof UIModal.Footer>,
  React.ComponentProps<typeof UIModal.Footer> & { className?: string }
>(function ModalFooterPrimitive({ className, ...props }, ref) {
  return (
    <UIModal.Footer ref={ref} {...props} className={modalFooterStyle({ class: className })} />
  );
});

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  header?: React.ReactNode;
  content?: React.ReactNode;
  footerContent?: React.ReactNode;
  size?: ModalSize;
  closeOnOverlayClick?: boolean;
  avoidKeyboard?: boolean;
  className?: string;
  classNameBackdrop?: string;
  classNameContent?: string;
  classNameHeader?: string;
  classNameBody?: string;
  classNameFooter?: string;
}

const Modal = ({
  isOpen,
  onClose,
  header,
  content,
  footerContent,
  size = 'md',
  closeOnOverlayClick,
  avoidKeyboard,
  className,
  classNameBackdrop,
  classNameContent,
  classNameHeader,
  classNameBody,
  classNameFooter,
}: ModalProps) => {
  return (
    <ModalRoot
      avoidKeyboard={avoidKeyboard}
      className={className}
      closeOnOverlayClick={closeOnOverlayClick}
      isOpen={isOpen}
      size={size}
      onClose={onClose}
    >
      <ModalBackdropPrimitive className={classNameBackdrop} />
      <ModalContentPrimitive className={classNameContent} size={size}>
        {header !== undefined ? (
          <ModalHeaderPrimitive className={classNameHeader}>{header}</ModalHeaderPrimitive>
        ) : null}
        <ModalBodyPrimitive className={classNameBody}>{content}</ModalBodyPrimitive>
        {footerContent !== undefined ? (
          <ModalFooterPrimitive className={classNameFooter}>{footerContent}</ModalFooterPrimitive>
        ) : null}
      </ModalContentPrimitive>
    </ModalRoot>
  );
};

Modal.displayName = 'Modal';

export { Modal };

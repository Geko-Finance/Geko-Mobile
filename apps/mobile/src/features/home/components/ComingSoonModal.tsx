import { Button } from "@/src/features/shared/components/ui/button";
import { Modal } from "@/src/features/shared/components/ui/modal";
import { Text } from "@/src/features/shared/components/ui/text";

export interface ComingSoonModalProps {
  visible: boolean;
  title: string;
  description: string;
  onDismiss: () => void;
}

export function ComingSoonModal({
  visible,
  title,
  description,
  onDismiss,
}: ComingSoonModalProps) {
  return (
    <Modal
      classNameBackdrop="bg-black/60"
      classNameContent="rounded-[20px]"
      content={
        <Text className="text-typography-500" size="sm">
          {description}
        </Text>
      }
      footerContent={
        <Button
          action="secondary"
          className="flex-1"
          size="md"
          value="Got it"
          variant="outline"
          onPress={onDismiss}
        />
      }
      header={
        <Text bold className="text-typography-900" size="lg">
          {title}
        </Text>
      }
      isOpen={visible}
      onClose={onDismiss}
    />
  );
}

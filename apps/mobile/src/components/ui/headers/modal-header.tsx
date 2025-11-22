import { useCallback } from "react";
import { Box, Button, Text } from "../primitives";
import { router } from "expo-router";

export const ModalHeader = ({
  title,
  backEnabled,
}: {
  title: string;
  backEnabled?: boolean;
}) => {
  const handleBack = useCallback(() => {
    if (!backEnabled) return;
    router.back();
  }, [backEnabled]);

  const handleClose = useCallback(() => {
    if (backEnabled) return;
    router.back();
  }, [backEnabled]);

  return (
    <Box direction="row" gap="sm" p="sm" center>
      <Button
        variant="ghost"
        size="md"
        style={{ opacity: backEnabled ? 1 : 0 }}
        onPress={handleBack}
      >
        <Button.Text>back</Button.Text>
      </Button>
      <Box center flex>
        <Text size="xxl" weight="bold">
          {title}
        </Text>
      </Box>

      <Button
        variant="ghost"
        size="md"
        style={{
          opacity: backEnabled ? 0 : 1,
        }}
        onPress={handleClose}
      >
        <Button.Text>close</Button.Text>
      </Button>
    </Box>
  );
};

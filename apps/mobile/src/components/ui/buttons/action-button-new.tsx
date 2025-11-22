import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { Box, Button, Icon } from "@/primitives";
import type { IconProps } from "@expo/vector-icons/build/createIconSet";
import { StyleProp, ViewStyle } from "react-native";

type Icon = {
  group: React.ComponentType<IconProps<any>>;
  name: string;
};

type ActionButtonProps = {
  title: string;
  icon: Icon;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export const ActionButton = ({
  title,
  icon,
  onPress,
  style,
}: ActionButtonProps) => {
  const { theme } = useUnistyles();

  return (
    <Button
      style={[styles.actionBtn, style]}
      contentStyle={styles.btnContentStyle}
      rounded="full"
      key={title}
      size="auto"
      variant="ghost"
      onPress={onPress}
      haptics={"heavy"}
    >
      <Box
        style={styles.buttonBox}
        background="plain"
        center
        p="xs"
        rounded="full"
        border="thin"
        shadow="sm"
      >
        <Icon
          style={styles.icon}
          name={icon.name}
          icon={icon.group}
          color={theme.colors.background.base}
          size={24}
        />
      </Box>

      <Button.Text weight="bold" style={{ fontSize: 14 }}>
        {title}
      </Button.Text>
    </Button>
  );
};

const styles = StyleSheet.create((theme) => ({
  actionBtn: {},
  btnContentStyle: {
    flexDirection: "column",
  },
  buttonBox: {
    borderColor: theme.colors.primary.dark,
  },
  icon: {
    backgroundColor: theme.colors.primary.base,
    borderRadius: 100,
    width: 45,
    height: 45,
  },
}));

import { StyleSheet } from "react-native-unistyles";
import { Box, Text } from "@/primitives";
import { useUser } from "@/src/services/api";
import BlurView from "../primitives/blur-view";
import DicebearAvatar from "../dicebear-avatar";

export const HomeHeader = () => {
  const { data: user } = useUser();

  return (
    <>
      <BlurView style={styles.blurView}>
        <Box center ml="sm">
          <DicebearAvatar seed={user?.id ?? ""} size={40} />
        </Box>
        <Box flex ml="xs">
          <Text weight="bold" mode="subtle">
            welcome!
          </Text>
          <Text
            weight="bold"
            size="xl"
            style={{ marginTop: -4, marginLeft: -1 }}
          >
            {user?.username}
          </Text>
        </Box>
      </BlurView>
    </>
  );
};

const styles = StyleSheet.create((theme, rt) => ({
  blurView: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    paddingTop: rt.insets.top,
    flexDirection: "row",
    gap: theme.spacing.sm,
    padding: theme.spacing.sm,
    alignItems: "center",
  },
}));

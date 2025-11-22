import { Image } from "expo-image";
import type { ImageProps } from "expo-image";
import { Box } from "@/components/ui/primitives/box";
import { StyleSheet } from "react-native-unistyles";
import { useMemo } from "react";

interface AvatarProps extends ImageProps {
  size?: number;
  seed?: string;
  rounded?: "none" | "sm" | "md" | "lg" | "xl" | "full";
  border?: "none" | "thin" | "thick";
}

export default function Avatar({
  source,
  seed,
  size = 42,
  style,
  rounded = "full",
  border = "thin",
  ...imageProps
}: AvatarProps) {
  const dynamicStyles = {
    imageContainer: {
      width: size,
      height: size,
    },
  };

  const imgSource = useMemo(() => {
    if (source) return source;
    return {
      url: `https://api.dicebear.com/7.x/bottts/svg?seed=${seed}`,
    };
  }, [source, seed]);

  return (
    <Box
      rounded="xl"
      style={[styles.imageContainer, dynamicStyles.imageContainer]}
    >
      <Image
        style={[styles.image, style]}
        source={imgSource}
        cachePolicy={"memory-disk"}
        {...imageProps}
      />
    </Box>
  );
}

const styles = StyleSheet.create((theme) => ({
  imageContainer: {
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
}));

import React, { useEffect, useState, useRef } from "react";
import {
  Modal,
  View,
  Pressable,
  Keyboard,
  TextInput,
  Dimensions,
  FlatList,
  Text,
} from "react-native";
import Animated, {
  runOnJS,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  useAnimatedKeyboard,
} from "react-native-reanimated";
import { StyleSheet, useUnistyles } from "react-native-unistyles";
import { BlurView } from "expo-blur";
import { Button, Icon } from "@/components/ui/primitives";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/providers/theme-context";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getRandomValues } from "expo-crypto";
import { gridStorage } from "@/utils/grid-storage";
import { MobileGridClient } from "@/services/grid-client";
import { ensureGridSession } from "@/services/grid/transfers";
import bs58 from "bs58";

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
}

interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: Date;
}

const SCREEN_WIDTH = Dimensions.get("window").width;
const BUTTON_SIZE = 48;
const HORIZONTAL_PADDING = 20;

// Simple UUID generator for keys
const generateId = () => {
  const bytes = new Uint8Array(16);
  getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
};

export const AIChatModal: React.FC<AIChatModalProps> = ({
  visible,
  onClose,
}) => {
  const { theme } = useUnistyles();
  const { currentTheme } = useTheme();
  const insets = useSafeAreaInsets();
  
  // Local state management instead of unstable useChat hook
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const expandProgress = useSharedValue(0);
  const keyboard = useAnimatedKeyboard();

  useEffect(() => {
    if (visible) {
      expandProgress.value = withTiming(1, { duration: 300 });
    } else {
      expandProgress.value = withTiming(0, { duration: 200 });
    }
  }, [visible, expandProgress]);
  
  // Auto-scroll when messages change or keyboard appears
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, keyboard.height]);

  const animatedInputStyle = useAnimatedStyle(() => {
    const targetWidth = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
    const width = interpolate(
      expandProgress.value,
      [0, 1],
      [BUTTON_SIZE, targetWidth],
    );

    const opacity = interpolate(expandProgress.value, [0, 0.2, 1], [0, 0.5, 1]);

    return {
      width,
      opacity,
    };
  });

  const animatedKeyboardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateY:
            keyboard.height.value > 0
              ? -(keyboard.height.value - insets.bottom + 16)
              : 0,
        },
      ],
    };
  });

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
        opacity: interpolate(expandProgress.value, [0.8, 1], [0, 1]),
        transform: [{ scale: interpolate(expandProgress.value, [0.8, 1], [0.95, 1]) }]
    }
  });

  const handleClose = () => {
    Keyboard.dismiss();
    onClose();
  };

  const handleSend = async () => {
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    // 1. Add user message immediately
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: trimmedInput,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log("📤 Sending message:", trimmedInput);
      console.log("📜 Message history:", messages.length);
      
      // Get wallet address for authentication
      const walletAddress = await gridStorage.getSmartAccountAddress();
      if (!walletAddress) {
        throw new Error("No wallet address found. Please sign in.");
      }
      
      // Ensure valid Grid session
      const { sessionSecrets, authContext } = await ensureGridSession();
      if (!sessionSecrets || !authContext) {
        throw new Error("Failed to get Grid session. Please sign in again.");
      }
      
      // Create signature for authentication
      const nonce = Date.now().toString();
      const message = `${walletAddress}:${nonce}`;
      
      // Use Grid's signing system
      const gridClient = MobileGridClient.getFrontendClient();
      
      // Create a simple message signature using the session secrets directly
      // We can't use Grid's sign() as it expects transaction payloads
      // Instead, derive the keypair from session secrets and sign directly
      const messageBytes = new TextEncoder().encode(message);
      
      // Use the user keypair from session secrets to sign
      const { Keypair } = await import('@solana/web3.js');
      const userKeypair = Keypair.fromSecretKey(sessionSecrets.user.secretKey);
      
      // Import nacl for signing
      const nacl = await import('tweetnacl');
      const signature = nacl.default.sign.detached(messageBytes, userKeypair.secretKey);
      const signatureBase58 = bs58.encode(signature);
      
      console.log("✍️ Signed message with Grid user keypair");
      
      /* Alternative: Use Grid's sign() if available
      const signResult = await gridClient.sign({
        sessionSecrets,
        session: authContext,
        transactionPayload: messageBytes, // This likely won't work for raw messages
      });
      const signatureBase58 = signResult.signature;
      */
      
      // 2. Prepare API call
      const apiUrl = "https://ai.solforge.sh/v1/chat/completions";
      console.log("🔗 API URL:", apiUrl);
      console.log("🔑 Wallet:", walletAddress);
      
      const contextMessages = [...messages, userMessage].map(m => ({
        role: m.role,
        content: m.content
      }));
      
      // 3. Execute Request
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
          "x-wallet-address": walletAddress,
          "x-wallet-signature": signatureBase58,
          "x-wallet-nonce": nonce,
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: contextMessages,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("❌ API Error:", response.status, errorText);
        
        if (response.status === 401) {
          throw new Error("Authentication failed. The AI endpoint may require registration or different credentials.");
        }
        
        throw new Error(`API Error: ${response.status}`);
      }

      // 4. Handle Response
      // Parse OpenAI-compatible response
      const data = await response.json();
      
      // Extract content from OpenAI response format
      let content = "";
      if (data.choices && data.choices.length > 0) {
        content = data.choices[0].message?.content || "";
      }
      
      if (!content) {
        console.error("⚠️ Empty response from API:", data);
        content = "I received an empty response from the server.";
      }
      
      console.log("✅ Received response:", content.substring(0, 100));
      
      const botMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: content,
        createdAt: new Date(),
      };

      setMessages((prev) => [...prev, botMessage]);

    } catch (error) {
      console.error("💥 Chat error:", error);
      const errorMessage: Message = {
        id: generateId(),
        role: "assistant",
        content: "Sorry, I encountered an error connecting to the server.",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === "user";
    
    console.log("🎨 Rendering message:", { role: item.role, content: item.content.substring(0, 30) });
    
    return (
      <View
        style={[
          styles.messageBubble,
          {
            alignSelf: isUser ? "flex-end" : "flex-start",
            backgroundColor: isUser 
              ? theme.colors.background.brand 
              : theme.colors.background.subtle,
            borderRadius: theme.radius.lg,
            padding: theme.spacing.md,
            marginBottom: theme.spacing.sm,
            maxWidth: "80%",
          }
        ]}
      >
        <Text
          style={{
            fontFamily: theme.typography.family.sans,
            fontSize: theme.typography.size.md,
            color: isUser 
              ? theme.colors.text.inverse 
              : theme.colors.text.default,
          }}
        >
          {item.content}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={() => Keyboard.dismiss()}>
        <BlurView
          intensity={currentTheme === "dark" ? 80 : 60}
          tint={currentTheme === "dark" ? "dark" : "light"}
          style={styles.blurView}
        />
      </Pressable>

      {/* Close button */}
      <Pressable
        onPress={handleClose}
        style={[styles.closeButton, { top: insets.top + 16 }]}
        hitSlop={10}
      >
        <BlurView
          intensity={currentTheme === "dark" ? 60 : 50}
          tint={currentTheme === "dark" ? "dark" : "light"}
          style={styles.closeButtonBlur}
        >
          <Icon
            icon={Ionicons}
            name="close"
            size={24}
            color={theme.colors.text.default}
          />
        </BlurView>
      </Pressable>
      
      {/* Chat Messages Area */}
      <Animated.View style={[styles.chatContainer, { marginTop: insets.top + 60, marginBottom: 120 }, animatedContentStyle]} pointerEvents="box-none">
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messageList}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
          {isLoading && (
             <View style={styles.loadingIndicator}>
                 <Text style={{ color: theme.colors.text.subtle }}>Thinking...</Text>
             </View>
          )}
      </Animated.View>

      <Animated.View
        style={[
          styles.container,
          { bottom: insets.bottom + 8 },
          animatedKeyboardStyle,
        ]}
        pointerEvents="box-none"
      >
        <Animated.View style={[styles.inputContainer, animatedInputStyle]}>
          <Pressable
            style={styles.inputPressable}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.background.subtle,
                  borderColor: theme.colors.border.default,
                  opacity: 0.95,
                },
              ]}
            >
              <TextInput
                value={input}
                onChangeText={setInput}
                placeholder="Ask AI anything..."
                placeholderTextColor={theme.colors.text.subtle}
                multiline
                style={[styles.textInput, { color: theme.colors.text.default }]}
                onSubmitEditing={handleSend}
                returnKeyType="send"
              />
              <View style={styles.sendButtonWrapper}>
                <Button
                  onPress={handleSend}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                  mode="brand"
                  rounded="full"
                  style={styles.sendButton}
                >
                  <Button.Icon>
                    {(props) => (
                      <Icon
                        icon={Ionicons}
                        name={isLoading ? "stop" : "arrow-up"}
                        {...props}
                        size={20}
                      />
                    )}
                  </Button.Icon>
                </Button>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create((theme) => ({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    position: "absolute",
    left: HORIZONTAL_PADDING,
    zIndex: 2,
  },
  chatContainer: {
      flex: 1,
      zIndex: 1,
  },
  messageList: {
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingBottom: 20,
      flexGrow: 1,
  },
  messageBubble: {
      padding: theme.spacing.md,
      borderRadius: theme.radius.lg,
      marginBottom: theme.spacing.sm,
      maxWidth: "80%",
  },
  messageText: {
      fontFamily: theme.typography.family.sans,
      fontSize: theme.typography.size.md,
  },
  loadingIndicator: {
      paddingHorizontal: HORIZONTAL_PADDING,
      paddingVertical: theme.spacing.sm,
  },
  inputContainer: {
    // Height will grow based on content
  },
  inputPressable: {
    flex: 1,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: theme.radius.mega,
    paddingLeft: theme.spacing.md,
    paddingRight: theme.spacing.xs,
    paddingVertical: theme.spacing.xs,
    borderWidth: 1,
    minHeight: BUTTON_SIZE,
  },
  textInput: {
    flex: 1,
    fontFamily: theme.typography.family.mono,
    fontSize: theme.typography.size.md,
    paddingVertical: theme.spacing.xs,
    maxHeight: 100,
  },
  sendButtonWrapper: {
    marginLeft: theme.spacing.xs,
  },
  sendButton: {
    width: 36,
    height: 36,
    padding: 0,
    minWidth: 36,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    zIndex: 3,
  },
  closeButtonBlur: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
  },
}));

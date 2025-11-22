import React, { useState } from "react";
import { View, Button } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";

// Import both versions for comparison
import BankActionModal from "./bank-action-modal"; // Original
import BankActionModalGorhom from "./bank-action-modal-gorhom"; // New Gorhom version

const BankActionTest = () => {
  const [showOriginal, setShowOriginal] = useState(false);
  const [showGorhom, setShowGorhom] = useState(false);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <View style={{ flex: 1, justifyContent: "center", padding: 20, gap: 20 }}>
          <Button
            title="Show Original PopupSheet"
            onPress={() => setShowOriginal(true)}
          />
          
          <Button
            title="Show Gorhom BottomSheet"
            onPress={() => setShowGorhom(true)}
          />

          {/* Original Modal */}
          <BankActionModal
            visible={showOriginal}
            onClose={() => setShowOriginal(false)}
          />

          {/* Gorhom Modal */}
          <BankActionModalGorhom
            visible={showGorhom}
            onClose={() => setShowGorhom(false)}
          />
        </View>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
};

export default BankActionTest;
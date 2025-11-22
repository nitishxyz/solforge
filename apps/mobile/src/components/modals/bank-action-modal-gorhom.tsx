import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import GorhomPopupSheet, { type GorhomPopupSheetRef } from "@/ui/gorhom-popup-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type BankActionModalProps = {
  visible: boolean;
  onClose: () => void;
};

export type BankActionModalRef = {
  present: () => void;
  dismiss: () => void;
};

const BankActionModal = forwardRef<BankActionModalRef, BankActionModalProps>(
  ({ visible, onClose }, ref) => {
    const sheetRef = useRef<GorhomPopupSheetRef>(null);

    // Handle visibility changes from props
    useEffect(() => {
      if (visible) {
        sheetRef.current?.present();
      } else {
        sheetRef.current?.dismiss();
      }
    }, [visible]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
      dismiss: () => sheetRef.current?.dismiss(),
    }), []);

    const handleDepositFromWallet = () => {
      // Close sheet first
      sheetRef.current?.dismiss();
      // Add your deposit logic here
    };

    const handleDepositFromBank = () => {
      // Close sheet first
      sheetRef.current?.dismiss();
      // Add your deposit logic here
    };



    return (
      <GorhomPopupSheet ref={sheetRef} title="Add Money" onDismiss={onClose}>
        <GorhomPopupSheet.Item
          icon={MaterialCommunityIcons}
          iconName="bank-transfer-in"
          title="Send to Bank"
          description="Send USDC to Bank"
          onPress={handleDepositFromWallet}
        />
        <GorhomPopupSheet.Item
          icon={MaterialCommunityIcons}
          iconName="bank-transfer-out"
          title="Receive From Bank"
          description="Deposit USD from bank"
          onPress={handleDepositFromBank}
        />
      </GorhomPopupSheet>
    );
  }
);

BankActionModal.displayName = "BankActionModal";

export default BankActionModal;
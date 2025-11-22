import PopupSheet from "@/ui/popup-sheet";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type BankActionModalProps = {
  visible: boolean;
  onClose: () => void;
};

const BankActionModal = ({ visible, onClose }: BankActionModalProps) => {
  const handleDepositFromWallet = () => {};

  const handleDepositFromBank = () => {};

  return (
    <PopupSheet visible={visible} onClose={onClose} title="Add Money">
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="bank-transfer-in"
        title="Send to Bank"
        description="Send USDC to Bank"
        onPress={handleDepositFromWallet}
      />
      <PopupSheet.Item
        icon={MaterialCommunityIcons}
        iconName="bank-transfer-out"
        title="Receive From Bank"
        description="Deposit USD from bank"
        onPress={handleDepositFromBank}
      />
    </PopupSheet>
  );
};

export default BankActionModal;
